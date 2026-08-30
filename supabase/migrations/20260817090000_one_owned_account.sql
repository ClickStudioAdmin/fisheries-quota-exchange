-- A signed-in user may own one account. They can still be added to other accounts.

create or replace function public.create_organisation(
    p_legal_name text,
    p_trading_name text,
    p_abn text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_email text;
    v_id bigint;
    v_abn text;
begin
    v_email := public.current_user_email();

    if v_email is null or v_email = '' then
        raise exception 'Not authenticated';
    end if;

    if exists (
        select 1
        from public.organisation_users as members
        where members.email = v_email
          and members.role = 'OWNER'
    ) then
        raise exception 'You already have an account';
    end if;

    if p_legal_name is null or length(trim(p_legal_name)) = 0 then
        raise exception 'Legal name is required';
    end if;

    v_abn := nullif(trim(p_abn), '');

    insert into public.organisations (legal_name, trading_name, abn)
    values (
        trim(p_legal_name),
        nullif(trim(p_trading_name), ''),
        v_abn
    )
    returning id into v_id;

    insert into public.organisation_users (organisation_id, email, role)
    values (v_id, v_email, 'OWNER');

    return v_id;
end;
$$;
