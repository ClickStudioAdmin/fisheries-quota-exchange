-- Sequential seller-then-buyer signing. Parties upload; admin checks the
-- seller-signed form before the buyer can download it.

alter table public.transfer_applications
    add column if not exists seller_pack_checklist jsonb not null default '[]'::jsonb;

alter table public.transfer_applications
    drop constraint if exists transfer_applications_status_check;

update public.transfer_applications
set status = 'AWAITING_SELLER_SIGNATURE'
where status in ('DOCUMENT_GENERATED', 'AWAITING_SIGNED_PACK');

alter table public.transfer_applications
    add constraint transfer_applications_status_check
    check (status in (
        'READY',
        'AWAITING_SELLER_SIGNATURE',
        'AWAITING_SELLER_PACK_REVIEW',
        'AWAITING_BUYER_SIGNATURE',
        'ADMIN_REVIEW',
        'SUBMITTED',
        'PROCESSING',
        'APPROVED',
        'ACTION_REQUIRED'
    ));

alter table public.transfer_documents
    drop constraint if exists transfer_documents_type_check;

alter table public.transfer_documents
    add constraint transfer_documents_type_check
    check (document_type in (
        'UNSIGNED_APPLICATION',
        'SELLER_SIGNED',
        'SIGNED_PACK',
        'SUPPORTING'
    ));

drop policy if exists transfer_documents_insert on public.transfer_documents;
create policy transfer_documents_insert
on public.transfer_documents
for insert
to authenticated
with check (public.is_platform_admin());

create or replace function public.save_seller_pack_checklist(
    p_order_id bigint,
    p_completed text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_app_id bigint;
    v_old jsonb;
    v_check text;
begin
    if not public.is_platform_admin() then
        raise exception 'Not a platform admin';
    end if;

    select id, seller_pack_checklist
    into v_app_id, v_old
    from public.transfer_applications
    where order_id = p_order_id
      and status = 'AWAITING_SELLER_PACK_REVIEW';

    if not found then
        raise exception 'Seller signed form is not waiting for review';
    end if;

    update public.transfer_applications
    set seller_pack_checklist = to_jsonb(coalesce(p_completed, '{}'::text[]))
    where id = v_app_id;

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
            'TRANSFER_SELLER_PACK_CHECK_COMPLETED',
            'order',
            p_order_id,
            jsonb_build_object('check', v_check)
        );
    end loop;
end;
$$;

revoke all on function public.save_seller_pack_checklist(bigint, text[]) from public;
grant execute on function public.save_seller_pack_checklist(bigint, text[]) to authenticated;

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

revoke all on function public.record_party_transfer_upload(bigint, text, text) from public;
grant execute on function public.record_party_transfer_upload(bigint, text, text) to authenticated;

drop policy if exists transfer_documents_storage_select on storage.objects;
create policy transfer_documents_storage_select
on storage.objects
for select
to authenticated
using (
    bucket_id = 'transfer-documents'
    and (
        public.is_platform_admin()
        or exists (
            select 1
            from public.transfer_documents as d
            join public.transfer_applications as a on a.id = d.application_id
            join public.orders as o on o.id = a.order_id
            where d.storage_path = name
              and (
                  (
                      public.user_organisation_role(o.seller_organisation_id) is not null
                      and d.document_type in ('UNSIGNED_APPLICATION', 'SELLER_SIGNED')
                  )
                  or (
                      public.user_organisation_role(o.buyer_organisation_id) is not null
                      and (
                          (
                              d.document_type = 'SELLER_SIGNED'
                              and a.status in (
                                  'AWAITING_BUYER_SIGNATURE',
                                  'ADMIN_REVIEW',
                                  'SUBMITTED',
                                  'PROCESSING',
                                  'APPROVED'
                              )
                          )
                          or (
                              d.document_type = 'SIGNED_PACK'
                              and a.status in (
                                  'ADMIN_REVIEW',
                                  'SUBMITTED',
                                  'PROCESSING',
                                  'APPROVED'
                              )
                          )
                      )
                  )
              )
        )
    )
);

drop policy if exists transfer_documents_storage_insert on storage.objects;
create policy transfer_documents_storage_insert
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'transfer-documents'
    and (
        public.is_platform_admin()
        or exists (
            select 1
            from public.orders as o
            join public.transfer_applications as a on a.order_id = o.id
            where o.id = public.transfer_document_order_id(name)
              and o.status = 'AWAITING_TRANSFER'
              and a.process_code in ('QLD_SALE', 'QLD_LEASE')
              and (
                  (
                      public.user_organisation_role(o.seller_organisation_id) in ('OWNER', 'ADMIN')
                      and a.status = 'AWAITING_SELLER_SIGNATURE'
                  )
                  or (
                      public.user_organisation_role(o.buyer_organisation_id) in ('OWNER', 'ADMIN')
                      and a.status = 'AWAITING_BUYER_SIGNATURE'
                  )
              )
        )
    )
);
