-- Phase 9 data repair.
--
-- Review: open listings (PENDING_APPROVAL, PUBLISHED) that cannot be purchased
-- because the seller has not completed Stripe Connect. The app already blocks
-- create_listing / create_auction when Stripe keys are configured. SQL RPCs and
-- the development seed catalogue did not. Typical leftover: seed org
-- "HIMI Toothfish Pty Ltd" with a published Sardine Fishery lease.
--
-- Do not delete listings, orders, bids, or quota ledger rows.
-- Keep historical SOLD / COMPLETED seed trades (market charts).
-- Keep RESERVED listings that already have open orders (admin pipeline).
-- Keep unverified seed holdings (admin verification queue).

create function public.stripe_connect_in_use()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.organisations
        where stripe_account_id is not null
    )
$$;

revoke all on function public.stripe_connect_in_use() from public;
grant execute on function public.stripe_connect_in_use() to authenticated;

create function public.organisation_may_sell(p_organisation_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select case
        when public.stripe_connect_in_use() then
            public.organisation_accepts_card_payments(p_organisation_id)
        else true
    end
$$;

revoke all on function public.organisation_may_sell(bigint) from public;
grant execute on function public.organisation_may_sell(bigint) to authenticated;

create function public.enforce_listing_seller_can_sell()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.status in ('PENDING_APPROVAL', 'PUBLISHED')
       and not public.organisation_may_sell(new.organisation_id) then
        raise exception 'Complete payments setup on the Payments tab of Business Settings before you can list quota for sale or lease.';
    end if;

    return new;
end;
$$;

create trigger listings_seller_can_sell
before insert or update on public.listings
for each row
execute function public.enforce_listing_seller_can_sell();

create or replace function public.create_order(
    p_listing_id bigint,
    p_buyer_organisation_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_listing public.listings%rowtype;
    v_role text;
begin
    if public.current_user_email() is null then
        raise exception 'Not authenticated';
    end if;

    v_role := public.user_organisation_role(p_buyer_organisation_id);

    if v_role is null or v_role not in ('OWNER', 'ADMIN') then
        raise exception 'You cannot purchase for this organisation';
    end if;

    select * into v_listing
    from public.listings
    where id = p_listing_id
    for update;

    if not found then
        raise exception 'Listing not found';
    end if;

    if v_listing.listing_type <> 'FIXED_PRICE' then
        raise exception 'This listing is an auction';
    end if;

    if v_listing.status <> 'PUBLISHED' or v_listing.expires_at <= now() then
        raise exception 'Listing is not available to purchase';
    end if;

    if not public.organisation_may_sell(v_listing.organisation_id) then
        raise exception 'This seller has not completed payment setup, so the listing cannot be purchased yet.';
    end if;

    return public.insert_simulated_order(
        p_listing_id,
        p_buyer_organisation_id,
        v_listing.unit_price_aud
    );
end;
$$;

-- Cancel open listings whose seller cannot accept charges, including seed
-- auctions that already have bids. Those auctions cannot complete a paid
-- purchase. Leave bids in place as history.
update public.listings as listings
set
    status = 'CANCELLED',
    review_note = nullif(
        concat_ws(
            ' ',
            nullif(trim(listings.review_note), ''),
            'Cancelled: seller has not completed payment setup.'
        ),
        ''
    ),
    updated_at = now()
from public.organisations as organisations
where organisations.id = listings.organisation_id
  and listings.status in ('PENDING_APPROVAL', 'PUBLISHED')
  and not public.organisation_accepts_card_payments(organisations.id);

-- Expired published listings still counted against holding cover.
update public.listings
set
    status = 'CANCELLED',
    review_note = nullif(
        concat_ws(
            ' ',
            nullif(trim(review_note), ''),
            'Cancelled: listing expired.'
        ),
        ''
    ),
    updated_at = now()
where status in ('PENDING_APPROVAL', 'PUBLISHED')
  and expires_at <= now()
  and listing_type = 'FIXED_PRICE';

update public.listings as listings
set
    status = 'UNSOLD',
    review_note = nullif(
        concat_ws(
            ' ',
            nullif(trim(listings.review_note), ''),
            'Closed: auction ended with no bids.'
        ),
        ''
    ),
    updated_at = now()
where listings.status = 'PUBLISHED'
  and listings.listing_type = 'AUCTION'
  and listings.expires_at <= now()
  and not exists (
      select 1
      from public.bids
      where bids.listing_id = listings.id
  );

-- Open listings on unverified holdings should not exist (insert trigger).
update public.listings as listings
set
    status = 'CANCELLED',
    review_note = nullif(
        concat_ws(
            ' ',
            nullif(trim(listings.review_note), ''),
            'Cancelled: holding is not verified.'
        ),
        ''
    ),
    updated_at = now()
from public.quota_holdings as holdings
where holdings.id = listings.holding_id
  and listings.status in ('PENDING_APPROVAL', 'PUBLISHED')
  and holdings.verification_status is distinct from 'VERIFIED';

-- Re-apply holding cover: newest open listings that overflow are cancelled.
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
