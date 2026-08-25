create or replace function public.refresh_reminders() returns jsonb language plpgsql security definer set search_path=public as $$
declare expired_count int; reminder_count int;
begin
 update supplier_quotations set status='已过期',updated_at=now() where deleted_at is null and status in ('有效','即将到期') and valid_until<current_date;
 get diagnostics expired_count=row_count;
 update supplier_quotations set status='即将到期',updated_at=now() where deleted_at is null and status='有效' and valid_until between current_date and current_date+7;
 insert into notifications(user_id,title,body,severity,entity_type,entity_id)
 select coalesce(sp2.owner_id,p.owner_id),'供应商报价即将到期',q.quotation_number||' 将于 '||q.valid_until||' 到期','warning','supplier_quotation',q.id
 from supplier_quotations q join supplier_products sp on sp.id=q.supplier_product_id join products p on p.id=sp.product_id left join lateral(select p.owner_id)sp2 on true
 where q.status='即将到期' and not exists(select 1 from notifications n where n.entity_id=q.id and n.title='供应商报价即将到期' and n.created_at::date=current_date);
 get diagnostics reminder_count=row_count;
 return jsonb_build_object('expired',expired_count,'notifications',reminder_count);
end $$;
