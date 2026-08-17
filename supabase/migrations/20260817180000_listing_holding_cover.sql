-- A listing must be covered by its holding. Quantity cannot fall below
-- open listings plus active reservations. Repair listings left uncovered
-- after earlier holding changes.

create function public.holding_committed_quantity(p_holding_id bigint)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
    select coalesce((
        select sum(reservations.quantity)
        from public.quota_reservations as reservations
        where reservations.holding_id = p_holding_id
          and reservations.status = 'ACTIVE'
    ), 0) + coalesce((
        select sum(listings.quantity)
        from public.listings as listings
        where listings.holding_id = p_holding_id
          and listings.status in ('PENDING_APPROVAL', 'PUBLISHED')
    ), 0);
$$;

revoke all on function public.holding_committed_quantity(bigint) from public;
grant execute on function public.holding_committed_quantity(bigint) to authenticated;

create or replace function public.adjust_quota_holding(
    p_holding_id bigint,
    p_quantity numeric,
    p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_role text;
    v_committed numeric;
    v_status text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = p_holding_id
    for update;

    if not found then
        raise exception 'Holding not found';
    end if;

    v_role := public.user_organisation_role(v_holding.organisation_id);

    if not public.is_platform_admin()
       and (v_role is null or v_role not in ('OWNER', 'ADMIN')) then
        raise exception 'You cannot update this holding';
    end if;

    if p_quantity is null or p_quantity < 0 then
        raise exception 'Quantity cannot be negative';
    end if;

    if p_quantity = v_holding.quantity then
        raise exception 'Quantity is unchanged';
    end if;

    v_committed := public.holding_committed_quantity(p_holding_id);

    if p_quantity < v_committed then
        raise exception 'Quantity cannot be below the total of current listings';
    end if;

    perform public.apply_quota_event(
        p_holding_id,
        'ADJUSTMENT',
        p_quantity - v_holding.quantity,
        p_note
    );

    v_status := public.holding_status_for_actor();

    update public.quota_holdings
    set
        verification_status = v_status,
        verified_at = case when v_status = 'VERIFIED' then now() else null end,
        verified_by_email = case
            when v_status = 'VERIFIED' then public.current_user_email()
            else null
        end
    where id = p_holding_id;
end;
$$;

create function public.enforce_listing_holding_cover()
returns trigger
language plpgsql
set search_path = public
as $$
declare
    v_holding public.quota_holdings%rowtype;
    v_committed numeric;
begin
    if new.status not in ('PENDING_APPROVAL', 'PUBLISHED') then
        return new;
    end if;

    select * into v_holding
    from public.quota_holdings
    where id = new.holding_id
    for update;

    if not found then
        raise exception 'A holding is required to create a listing';
    end if;

    if new.organisation_id is distinct from v_holding.organisation_id then
        raise exception 'Listing organisation must match the holding';
    end if;

    if v_holding.quantity <= 0 then
        raise exception 'A holding with quantity is required to create a listing';
    end if;

    v_committed := public.holding_committed_quantity(new.holding_id);

    if new.quantity > v_holding.quantity - v_committed then
        raise exception 'Quantity cannot exceed the available holding';
    end if;

    return new;
end;
$$;

create trigger listings_holding_cover
before insert on public.listings
for each row
execute function public.enforce_listing_holding_cover();

-- Cancel open listings that are not covered by remaining holding quantity.
-- Oldest listings are kept; newer ones that overflow are cancelled.
with ranked as (
    select
        listings.id,
        listings.holding_id,
        holdings.quantity as holding_quantity,
        sum(listings.quantity) over (
            partition by listings.holding_id
            order by listings.created_at, listings.id
            rows between unbounded preceding and current row
        ) as running_quantity
    from public.listings
    left join public.quota_holdings as holdings
      on holdings.id = listings.holding_id
    where listings.status in ('PENDING_APPROVAL', 'PUBLISHED')
)
update public.listings
set
    status = 'CANCELLED',
    review_note = nullif(
        concat_ws(
            ' ',
            nullif(trim(listings.review_note), ''),
            'Cancelled: holding does not cover this listing.'
        ),
        ''
    ),
    updated_at = now()
from ranked
where listings.id = ranked.id
  and (
      ranked.holding_id is null
      or ranked.holding_quantity is null
      or ranked.holding_quantity <= 0
      or ranked.running_quantity > ranked.holding_quantity
  );
