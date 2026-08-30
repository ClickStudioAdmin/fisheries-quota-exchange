-- Phase 11: Queensland PandaDoc signing as a separate channel.
-- Offline sequential pack stays unchanged. Existing QLD rows default to OFFLINE.

alter table public.platform_settings
    add column if not exists qld_default_signing_channel text not null default 'OFFLINE';

alter table public.platform_settings
    drop constraint if exists platform_settings_qld_signing_channel_check;

alter table public.platform_settings
    add constraint platform_settings_qld_signing_channel_check
    check (qld_default_signing_channel in ('OFFLINE', 'PANDADOC'));

alter table public.orders
    add column if not exists qld_signing_channel text;

alter table public.orders
    drop constraint if exists orders_qld_signing_channel_check;

alter table public.orders
    add constraint orders_qld_signing_channel_check
    check (
        qld_signing_channel is null
        or qld_signing_channel in ('OFFLINE', 'PANDADOC')
    );

alter table public.transfer_applications
    add column if not exists signing_channel text not null default 'OFFLINE';

alter table public.transfer_applications
    add column if not exists pandadoc_document_id text;

alter table public.transfer_applications
    add column if not exists pandadoc_status text;

alter table public.transfer_applications
    add column if not exists pandadoc_seller_completed_at timestamptz;

alter table public.transfer_applications
    add column if not exists pandadoc_buyer_completed_at timestamptz;

alter table public.transfer_applications
    drop constraint if exists transfer_applications_signing_channel_check;

alter table public.transfer_applications
    add constraint transfer_applications_signing_channel_check
    check (signing_channel in ('OFFLINE', 'PANDADOC'));

alter table public.transfer_applications
    drop constraint if exists transfer_applications_status_check;

alter table public.transfer_applications
    add constraint transfer_applications_status_check
    check (status in (
        'READY',
        'AWAITING_SELLER_SIGNATURE',
        'AWAITING_SELLER_PACK_REVIEW',
        'AWAITING_BUYER_SIGNATURE',
        'AWAITING_SIGNATURES',
        'ADMIN_REVIEW',
        'SUBMITTED',
        'PROCESSING',
        'APPROVED',
        'ACTION_REQUIRED'
    ));

alter table public.transfer_applications
    drop constraint if exists transfer_applications_channel_status_check;

alter table public.transfer_applications
    add constraint transfer_applications_channel_status_check
    check (
        (
            signing_channel = 'PANDADOC'
            and status not in (
                'AWAITING_SELLER_SIGNATURE',
                'AWAITING_SELLER_PACK_REVIEW',
                'AWAITING_BUYER_SIGNATURE'
            )
        )
        or (
            signing_channel = 'OFFLINE'
            and status <> 'AWAITING_SIGNATURES'
        )
    );

create unique index if not exists transfer_applications_pandadoc_document_id_key
    on public.transfer_applications (pandadoc_document_id)
    where pandadoc_document_id is not null;

create table if not exists public.pandadoc_webhook_events (
    event_id text primary key,
    event_type text not null,
    processed_at timestamptz not null default now()
);

alter table public.pandadoc_webhook_events enable row level security;

create or replace function public.order_jurisdiction_code(p_order_id bigint)
returns text
language sql
stable
security definer
set search_path = public
as $$
    select jurisdictions.code
    from public.orders
    join public.quota_holdings
      on quota_holdings.id = orders.holding_id
    join public.fisheries
      on fisheries.id = quota_holdings.fishery_id
    join public.jurisdictions
      on jurisdictions.id = fisheries.jurisdiction_id
    where orders.id = p_order_id
$$;

revoke all on function public.order_jurisdiction_code(bigint) from public;
grant execute on function public.order_jurisdiction_code(bigint) to authenticated;

drop function if exists public.update_platform_settings(
    numeric,
    numeric,
    boolean,
    boolean,
    boolean,
    text[]
);

create function public.update_platform_settings(
    p_sale_fee_percent numeric,
    p_lease_fee_percent numeric,
    p_allow_registrations boolean,
    p_auto_approve_holdings boolean,
    p_auto_approve_listings boolean,
    p_disabled_emails text[],
    p_qld_default_signing_channel text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    if p_sale_fee_percent is null
       or p_sale_fee_percent < 0
       or p_sale_fee_percent > 100 then
        raise exception 'Sale fee must be between 0 and 100';
    end if;

    if p_lease_fee_percent is null
       or p_lease_fee_percent < 0
       or p_lease_fee_percent > 100 then
        raise exception 'Lease fee must be between 0 and 100';
    end if;

    if p_qld_default_signing_channel is null
       or p_qld_default_signing_channel not in ('OFFLINE', 'PANDADOC') then
        raise exception 'Queensland signing must be Offline pack or Sign online';
    end if;

    update public.platform_settings
    set
        sale_fee_percent = p_sale_fee_percent,
        lease_fee_percent = p_lease_fee_percent,
        allow_registrations = p_allow_registrations,
        auto_approve_holdings = p_auto_approve_holdings,
        auto_approve_listings = p_auto_approve_listings,
        disabled_emails = coalesce(p_disabled_emails, '{}'),
        qld_default_signing_channel = p_qld_default_signing_channel,
        updated_by_email = public.current_user_email()
    where id = 1;
end;
$$;

revoke all on function public.update_platform_settings(
    numeric,
    numeric,
    boolean,
    boolean,
    boolean,
    text[],
    text
) from public;
grant execute on function public.update_platform_settings(
    numeric,
    numeric,
    boolean,
    boolean,
    boolean,
    text[],
    text
) to authenticated;

revoke all on function public.save_compliance_checklist(bigint, text[]) from public;
drop function if exists public.save_compliance_checklist(bigint, text[]);

create function public.save_compliance_checklist(
    p_order_id bigint,
    p_completed text[],
    p_qld_signing_channel text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_old jsonb;
    v_check text;
    v_jurisdiction text;
    v_channel text;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select compliance_checklist
    into v_old
    from public.orders
    where id = p_order_id
      and status = 'AWAITING_COMPLIANCE';

    if not found then
        raise exception 'Order is not waiting for compliance review';
    end if;

    v_jurisdiction := public.order_jurisdiction_code(p_order_id);

    if v_jurisdiction = 'QLD' then
        v_channel := nullif(trim(coalesce(p_qld_signing_channel, '')), '');
        if v_channel is null or v_channel not in ('OFFLINE', 'PANDADOC') then
            raise exception 'Choose Offline pack or Sign online before saving';
        end if;
    else
        v_channel := null;
    end if;

    update public.orders
    set
        compliance_checklist = to_jsonb(coalesce(p_completed, '{}'::text[])),
        qld_signing_channel = v_channel
    where id = p_order_id
      and status = 'AWAITING_COMPLIANCE';

    for v_check in
        select new_checks.value
        from jsonb_array_elements_text(
            to_jsonb(coalesce(p_completed, '{}'::text[]))
        ) as new_checks(value)
        where not exists (
            select 1
            from jsonb_array_elements_text(coalesce(v_old, '[]'::jsonb)) as old_checks(value)
            where old_checks.value = new_checks.value
        )
    loop
        perform public.write_audit_event(
            'COMPLIANCE_CHECK_COMPLETED',
            'order',
            p_order_id,
            jsonb_build_object('check', v_check)
        );
    end loop;
end;
$$;

revoke all on function public.save_compliance_checklist(bigint, text[], text) from public;
grant execute on function public.save_compliance_checklist(bigint, text[], text) to authenticated;

create or replace function public.approve_compliance(
    p_order_id bigint,
    p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_channel text;
    v_jurisdiction text;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select qld_signing_channel
    into v_channel
    from public.orders
    where id = p_order_id
      and status = 'AWAITING_COMPLIANCE';

    if not found then
        raise exception 'Order is not waiting for compliance review';
    end if;

    v_jurisdiction := public.order_jurisdiction_code(p_order_id);

    if v_jurisdiction = 'QLD'
       and (
           v_channel is null
           or v_channel not in ('OFFLINE', 'PANDADOC')
       ) then
        raise exception 'Save the Queensland signing method before approving';
    end if;

    update public.orders
    set
        status = 'AWAITING_TRANSFER',
        review_note = nullif(trim(p_note), '')
    where id = p_order_id
      and status = 'AWAITING_COMPLIANCE';

    if not found then
        raise exception 'Order is not waiting for compliance review';
    end if;

    perform public.write_audit_event(
        'COMPLIANCE_APPROVED',
        'order',
        p_order_id,
        jsonb_build_object(
            'note', nullif(trim(p_note), ''),
            'signing_channel', v_channel
        )
    );
end;
$$;

create or replace function public.record_party_transfer_upload(
    p_order_id bigint,
    p_storage_path text,
    p_filename text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
    v_app public.transfer_applications%rowtype;
    v_seller_role text;
    v_buyer_role text;
    v_type text;
    v_next text;
    v_event text;
    v_id bigint;
begin
    select *
    into v_order
    from public.orders
    where id = p_order_id
      and status = 'AWAITING_TRANSFER';

    if not found then
        raise exception 'Order is not waiting for transfer';
    end if;

    if p_storage_path is null
       or p_storage_path not like (p_order_id::text || '/%') then
        raise exception 'Invalid transfer document path';
    end if;

    select *
    into v_app
    from public.transfer_applications
    where order_id = p_order_id;

    if not found or v_app.process_code not in ('QLD_SALE', 'QLD_LEASE') then
        raise exception 'This order does not use sequential signing';
    end if;

    if coalesce(v_app.signing_channel, 'OFFLINE') <> 'OFFLINE' then
        raise exception 'This order uses Sign online. Upload is not used.';
    end if;

    v_seller_role := public.user_organisation_role(v_order.seller_organisation_id);
    v_buyer_role := public.user_organisation_role(v_order.buyer_organisation_id);

    if v_seller_role in ('OWNER', 'ADMIN')
       and v_app.status = 'AWAITING_SELLER_SIGNATURE' then
        v_type := 'SELLER_SIGNED';
        v_next := 'AWAITING_SELLER_PACK_REVIEW';
        v_event := 'TRANSFER_SELLER_SIGNED_UPLOADED';
    elsif v_buyer_role in ('OWNER', 'ADMIN')
          and v_app.status = 'AWAITING_BUYER_SIGNATURE' then
        v_type := 'SIGNED_PACK';
        v_next := 'ADMIN_REVIEW';
        v_event := 'TRANSFER_SIGNED_PACK_UPLOADED';
    else
        raise exception 'You cannot upload this transfer document now';
    end if;

    insert into public.transfer_documents (
        application_id,
        document_type,
        form_type,
        form_version,
        storage_path,
        original_filename,
        created_by_email
    )
    values (
        v_app.id,
        v_type,
        v_app.form_type,
        v_app.form_version,
        p_storage_path,
        nullif(trim(p_filename), ''),
        public.current_user_email()
    )
    returning id into v_id;

    update public.transfer_applications
    set status = v_next,
        seller_pack_checklist = case
            when v_next = 'AWAITING_SELLER_PACK_REVIEW' then '[]'::jsonb
            else seller_pack_checklist
        end
    where id = v_app.id;

    perform public.write_audit_event(
        v_event,
        'order',
        p_order_id,
        jsonb_build_object(
            'document_id', v_id,
            'document_type', v_type
        )
    );

    return v_id;
end;
$$;

create or replace function public.mark_qld_application_generated(
    p_order_id bigint,
    p_status text,
    p_pandadoc_document_id text default null,
    p_pandadoc_status text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order public.orders%rowtype;
    v_app public.transfer_applications%rowtype;
    v_seller_role text;
begin
    select *
    into v_order
    from public.orders
    where id = p_order_id
      and status = 'AWAITING_TRANSFER';

    if not found then
        raise exception 'Order is not waiting for transfer';
    end if;

    select *
    into v_app
    from public.transfer_applications
    where order_id = p_order_id;

    if not found or v_app.process_code not in ('QLD_SALE', 'QLD_LEASE') then
        raise exception 'This order does not use a Queensland transfer';
    end if;

    v_seller_role := public.user_organisation_role(v_order.seller_organisation_id);

    if not public.is_platform_admin()
       and v_seller_role not in ('OWNER', 'ADMIN') then
        raise exception 'You cannot prepare this application';
    end if;

    if v_app.signing_channel = 'PANDADOC' then
        if p_status <> 'AWAITING_SIGNATURES' then
            raise exception 'Sign online applications wait for both signatures';
        end if;
        if nullif(trim(coalesce(p_pandadoc_document_id, '')), '') is null then
            raise exception 'PandaDoc document id is required';
        end if;
    else
        if p_status <> 'AWAITING_SELLER_SIGNATURE' then
            raise exception 'Offline applications wait for the seller first';
        end if;
        if p_pandadoc_document_id is not null then
            raise exception 'Offline applications do not use PandaDoc';
        end if;
    end if;

    if v_app.status in ('SUBMITTED', 'PROCESSING', 'APPROVED') then
        raise exception 'Return the application for correction before regenerating';
    end if;

    update public.transfer_applications
    set
        status = p_status,
        seller_pack_checklist = '[]'::jsonb,
        pandadoc_document_id = nullif(trim(coalesce(p_pandadoc_document_id, '')), ''),
        pandadoc_status = nullif(trim(coalesce(p_pandadoc_status, '')), ''),
        pandadoc_seller_completed_at = null,
        pandadoc_buyer_completed_at = null
    where id = v_app.id;
end;
$$;

revoke all on function public.mark_qld_application_generated(bigint, text, text, text) from public;
grant execute on function public.mark_qld_application_generated(bigint, text, text, text) to authenticated;

create function public.record_pandadoc_webhook_event(
    p_event_id text,
    p_event_type text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    v_event_id text;
begin
    insert into public.pandadoc_webhook_events (event_id, event_type)
    values (trim(p_event_id), trim(p_event_type))
    on conflict (event_id) do nothing
    returning event_id into v_event_id;

    return v_event_id is not null;
end;
$$;

revoke all on function public.record_pandadoc_webhook_event(text, text) from public;
grant execute on function public.record_pandadoc_webhook_event(text, text) to service_role;

notify pgrst, 'reload schema';
