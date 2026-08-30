-- Repair Queensland fixture rows after date-of-birth and unused/used landed.
-- Status fixtures could pick a buyer that was not QLD trade-ready, and they
-- stored later transfer child statuses with no application PDFs.

do $$
declare
    v_qld_id bigint;
    v_order record;
    v_buyer_id bigint;
    v_buyer_name text;
    v_parties int := 0;
    v_ready int := 0;
    v_buyers int := 0;
begin
    if exists (
        select 1
        from public.audit_events
        where event_type = 'QLD_FIXTURE_DATA_REPAIR'
    ) then
        return;
    end if;

    select id into v_qld_id
    from public.jurisdictions
    where code = 'QLD'
    limit 1;

    create temporary table qld_fixture_parties (
        organisation_id bigint primary key
    ) on commit drop;

    insert into qld_fixture_parties (organisation_id)
    select distinct organisation_id
    from (
        select listings.organisation_id
        from public.listings
        where listings.review_note = 'QLD form-fishery reset listing'
        union
        select orders.seller_organisation_id
        from public.orders
        join public.transfer_applications
          on transfer_applications.order_id = orders.id
        where transfer_applications.notes = 'QLD status fixture'
        union
        select orders.buyer_organisation_id
        from public.orders
        join public.transfer_applications
          on transfer_applications.order_id = orders.id
        where transfer_applications.notes = 'QLD status fixture'
        union
        select listings.organisation_id
        from public.listings
        join public.quota_ledger
          on quota_ledger.holding_id = listings.holding_id
        where quota_ledger.note in (
            'QLD status fixture holding',
            'Cover QLD status fixture'
        )
    ) as parties
    where organisation_id is not null;

    get diagnostics v_parties = row_count;

    update public.organisations
    set date_of_birth = date '1985-03-15'
    where entity_kind = 'INDIVIDUAL'
      and date_of_birth is null
      and id in (select organisation_id from qld_fixture_parties);

    if v_qld_id is not null then
        update public.organisations
        set enabled_jurisdiction_codes = (
            select array_agg(distinct code order by code)
            from unnest(enabled_jurisdiction_codes || array['QLD']::text[]) as code
        )
        where id in (select organisation_id from qld_fixture_parties)
          and not ('QLD' = any (enabled_jurisdiction_codes));

        insert into public.organisation_jurisdiction_profiles (
            organisation_id,
            jurisdiction_id,
            client_reference,
            licence_number,
            fishery_symbols
        )
        select
            parties.organisation_id,
            v_qld_id,
            'QLD-' || parties.organisation_id::text,
            'PCFL-' || parties.organisation_id::text,
            'C1'
        from qld_fixture_parties as parties
        on conflict (organisation_id, jurisdiction_id) do update
        set
            client_reference = coalesce(
                nullif(btrim(organisation_jurisdiction_profiles.client_reference), ''),
                excluded.client_reference
            ),
            licence_number = coalesce(
                nullif(btrim(organisation_jurisdiction_profiles.licence_number), ''),
                excluded.licence_number
            );
    end if;

    for v_order in
        select
            orders.id,
            orders.seller_organisation_id
        from public.orders
        join public.transfer_applications
          on transfer_applications.order_id = orders.id
        where transfer_applications.notes = 'QLD status fixture'
          and not public.organisation_is_trade_ready(
              orders.buyer_organisation_id,
              true
          )
    loop
        select organisations.id, organisations.legal_name
        into v_buyer_id, v_buyer_name
        from public.organisations
        where public.organisation_is_trade_ready(organisations.id, true)
          and organisations.id <> v_order.seller_organisation_id
        order by organisations.id
        limit 1;

        if v_buyer_id is null then
            continue;
        end if;

        update public.orders
        set
            buyer_organisation_id = v_buyer_id,
            buyer_name = v_buyer_name
        where id = v_order.id;

        v_buyers := v_buyers + 1;
    end loop;

    update public.transfer_applications
    set
        status = 'READY',
        submitted_at = null
    where notes = 'QLD status fixture'
      and status in (
          'AWAITING_SELLER_SIGNATURE',
          'AWAITING_SELLER_PACK_REVIEW',
          'AWAITING_BUYER_SIGNATURE',
          'ADMIN_REVIEW'
      )
      and not exists (
          select 1
          from public.transfer_documents
          where transfer_documents.application_id = transfer_applications.id
      );

    get diagnostics v_ready = row_count;

    update public.listings
    set
        used_quantity = round(quantity * 0.2, 0),
        unused_quantity = quantity - round(quantity * 0.2, 0)
    where used_quantity = 0
      and unused_quantity is not distinct from quantity
      and (
          review_note = 'QLD form-fishery reset listing'
          or review_note in (
              'Checkout expired.',
              'Cancelled by admin during compliance.',
              'Primary licence does not match this fishery.',
              'Withdrawn by seller.',
              'Holding documents incomplete.',
              'Ended with no bids.'
          )
          or exists (
              select 1
              from public.orders
              join public.transfer_applications
                on transfer_applications.order_id = orders.id
              where orders.listing_id = listings.id
                and transfer_applications.notes = 'QLD status fixture'
          )
          or exists (
              select 1
              from public.quota_ledger
              where quota_ledger.holding_id = listings.holding_id
                and quota_ledger.note in (
                    'QLD status fixture holding',
                    'Cover QLD status fixture'
                )
          )
      );

    update public.orders
    set
        used_quantity = listings.used_quantity,
        unused_quantity = listings.unused_quantity
    from public.listings
    where orders.listing_id = listings.id
      and listings.unused_quantity is not null
      and listings.used_quantity is not null
      and (
          orders.unused_quantity is distinct from listings.unused_quantity
          or orders.used_quantity is distinct from listings.used_quantity
      )
      and exists (
          select 1
          from public.transfer_applications
          where transfer_applications.order_id = orders.id
            and transfer_applications.notes = 'QLD status fixture'
      );

    perform public.write_audit_event(
        'QLD_FIXTURE_DATA_REPAIR',
        'platform',
        0,
        jsonb_build_object(
            'parties', v_parties,
            'transfer_apps_reset', v_ready,
            'buyers_reassigned', v_buyers
        ),
        null
    );
end;
$$;
