-- V10.4.6 FINAL — website delivery fees + distinct website pickup
-- Run AFTER the existing V9.7 promo/website SQL.

alter table public.website_orders add column if not exists delivery_zone_id bigint references public.delivery_zones(id) on delete set null;

-- Website may read only active zones that belong to active, website-visible branches.
grant select on public.delivery_zones to anon, authenticated;
drop policy if exists delivery_zones_public_website_read on public.delivery_zones;
create policy delivery_zones_public_website_read
on public.delivery_zones for select
to anon
using (
  active=true and exists(
    select 1 from public.branches b
    where b.id=delivery_zones.branch_id and b.active=true and b.website_visible=true
  )
);

-- Replace promo-aware website create function with server-validated delivery zone fee.
drop function if exists public.create_website_order(bigint,text,text,text,text,jsonb,text,text,text,text,text);
drop function if exists public.create_website_order(bigint,text,text,text,text,jsonb,text,text,text,text,text,bigint);

create or replace function public.create_website_order(
  p_branch_id bigint,
  p_customer_name text,
  p_customer_phone text,
  p_customer_address text,
  p_customer_notes text,
  p_items jsonb,
  p_payment_method_code text default 'cash',
  p_payment_reference text default null,
  p_payment_receipt_path text default null,
  p_order_type text default 'delivery',
  p_promo_code text default null,
  p_delivery_zone_id bigint default null
)
returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare
  v_order_id bigint;
  v_subtotal numeric(12,2):=0;
  v_total numeric(12,2):=0;
  v_delivery_fee numeric(12,2):=0;
  v_item jsonb;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_zone public.delivery_zones%rowtype;
  v_qty integer;
  v_unit numeric(12,2);
  v_extras numeric(12,2);
  v_line numeric(12,2);
  v_wi bigint;
  v_modifier jsonb;
  v_mod public.modifiers%rowtype;
  v_payment public.payment_methods%rowtype;
  v_bpm public.branch_payment_methods%rowtype;
  v_bs public.branch_website_settings%rowtype;
  v_type text;
  v_calc_items jsonb:='[]'::jsonb;
  v_promo jsonb;
  v_promo_id bigint;
  v_promo_discount numeric(12,2):=0;
begin
  v_type:=lower(coalesce(nullif(trim(p_order_type),''),'delivery'));
  if v_type not in ('delivery','pickup') then raise exception 'نوع الاستلام غير صحيح'; end if;
  if nullif(trim(p_customer_name),'') is null then raise exception 'اسم العميل مطلوب'; end if;
  if nullif(trim(p_customer_phone),'') is null then raise exception 'رقم الهاتف مطلوب'; end if;
  if v_type='delivery' and nullif(trim(coalesce(p_customer_address,'')),'') is null then raise exception 'عنوان التوصيل مطلوب'; end if;
  if p_items is null or jsonb_array_length(p_items)=0 then raise exception 'السلة فارغة'; end if;

  if not exists(select 1 from public.branches where id=p_branch_id and active=true and website_visible=true) then raise exception 'الفرع غير متاح'; end if;
  select * into v_bs from public.branch_website_settings where branch_id=p_branch_id;
  if found and (v_bs.orders_open=false or (v_bs.orders_paused_until is not null and v_bs.orders_paused_until>now())) then raise exception 'الفرع أوقف استقبال الطلبات'; end if;

  if v_type='delivery' then
    if p_delivery_zone_id is null then raise exception 'اختار منطقة التوصيل'; end if;
    select * into v_zone from public.delivery_zones where id=p_delivery_zone_id and branch_id=p_branch_id and active=true;
    if not found then raise exception 'منطقة التوصيل غير متاحة لهذا الفرع'; end if;
    v_delivery_fee:=greatest(0,coalesce(v_zone.delivery_fee,0));
  else
    p_delivery_zone_id:=null;
    v_delivery_fee:=0;
  end if;

  select * into v_payment from public.payment_methods where code=coalesce(nullif(trim(p_payment_method_code),''),'cash') and active=true;
  if not found then raise exception 'طريقة الدفع غير متاحة'; end if;
  select * into v_bpm from public.branch_payment_methods where branch_id=p_branch_id and payment_method_id=v_payment.id and active=true and website_enabled=true;
  if not found then raise exception 'طريقة الدفع غير متاحة على الموقع لهذا الفرع'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id=(v_item->>'product_id')::bigint and active=true and website_visible=true;
    if not found then raise exception 'أحد الأصناف غير متاح'; end if;
    if not exists(select 1 from public.branch_products bp where bp.branch_id=p_branch_id and bp.product_id=v_product.id and bp.active=true and (bp.website_paused_until is null or bp.website_paused_until<=now())) then raise exception 'أحد الأصناف غير متاح في الفرع'; end if;
    v_qty:=greatest(1,coalesce((v_item->>'quantity')::integer,1));
    if nullif(v_item->>'variant_id','') is not null then
      select * into v_variant from public.product_variants where id=(v_item->>'variant_id')::bigint and product_id=v_product.id and active=true;
      if not found then raise exception 'اختيار الحجم غير متاح'; end if;
      v_unit:=v_variant.price;
    else
      select coalesce(bp.price_override,v_product.price) into v_unit from public.branch_products bp where bp.branch_id=p_branch_id and bp.product_id=v_product.id;
    end if;
    v_extras:=0;
    for v_modifier in select * from jsonb_array_elements(coalesce(v_item->'modifiers','[]'::jsonb)) loop
      select * into v_mod from public.modifiers where id=(v_modifier->>'modifier_id')::bigint and active=true;
      if not found or not exists(select 1 from public.product_modifiers pm where pm.product_id=v_product.id and pm.modifier_id=v_mod.id) then raise exception 'إضافة غير متاحة'; end if;
      v_extras:=v_extras+coalesce(v_mod.price,0);
    end loop;
    v_line:=(v_unit+v_extras)*v_qty;
    v_subtotal:=v_subtotal+v_line;
    v_calc_items:=v_calc_items||jsonb_build_array(jsonb_build_object('product_id',v_product.id,'line_total',v_line));
  end loop;

  if nullif(trim(coalesce(p_promo_code,'')),'') is not null then
    v_promo:=public.preview_promo_code(p_promo_code,p_branch_id,'website',p_customer_phone,v_calc_items,v_subtotal);
    v_promo_id:=(v_promo->>'promo_id')::bigint;
    v_promo_discount:=coalesce((v_promo->>'discount')::numeric,0);
  end if;
  v_total:=greatest(0,v_subtotal-v_promo_discount+v_delivery_fee);

  insert into public.website_orders(
    branch_id,customer_name,customer_phone,customer_address,customer_notes,subtotal,delivery_fee,delivery_zone_id,total,status,
    payment_method_code,payment_method_name,payment_reference,payment_receipt_path,payment_status,order_type,
    promo_code_id,promo_code,promo_discount
  ) values(
    p_branch_id,trim(p_customer_name),trim(p_customer_phone),case when v_type='pickup' then null else trim(p_customer_address) end,
    nullif(trim(coalesce(p_customer_notes,'')),''),v_subtotal,v_delivery_fee,p_delivery_zone_id,v_total,'pending',v_payment.code,v_payment.name,
    nullif(trim(coalesce(p_payment_reference,'')),''),nullif(trim(coalesce(p_payment_receipt_path,'')),''),
    case when v_payment.code='cash' then 'unpaid' else case when p_payment_receipt_path is not null or nullif(trim(coalesce(p_payment_reference,'')),'') is not null then 'proof_submitted' else 'unpaid' end end,
    v_type,v_promo_id,case when v_promo_id is null then null else upper(trim(p_promo_code)) end,v_promo_discount
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from public.products where id=(v_item->>'product_id')::bigint;
    v_qty:=greatest(1,coalesce((v_item->>'quantity')::integer,1));
    if nullif(v_item->>'variant_id','') is not null then
      select * into v_variant from public.product_variants where id=(v_item->>'variant_id')::bigint;
      v_unit:=v_variant.price;
    else
      select coalesce(bp.price_override,v_product.price) into v_unit from public.branch_products bp where bp.branch_id=p_branch_id and bp.product_id=v_product.id;
      v_variant.id:=null; v_variant.name:=null;
    end if;
    v_extras:=0;
    for v_modifier in select * from jsonb_array_elements(coalesce(v_item->'modifiers','[]'::jsonb)) loop
      select * into v_mod from public.modifiers where id=(v_modifier->>'modifier_id')::bigint;
      v_extras:=v_extras+coalesce(v_mod.price,0);
    end loop;
    v_line:=(v_unit+v_extras)*v_qty;
    insert into public.website_order_items(website_order_id,product_id,product_name,variant_id,variant_name,quantity,unit_price,extras_total,line_total,notes)
    values(v_order_id,v_product.id,v_product.name,v_variant.id,v_variant.name,v_qty,v_unit,v_extras,v_line,nullif(trim(coalesce(v_item->>'notes','')),''))
    returning id into v_wi;
    for v_modifier in select * from jsonb_array_elements(coalesce(v_item->'modifiers','[]'::jsonb)) loop
      select * into v_mod from public.modifiers where id=(v_modifier->>'modifier_id')::bigint;
      insert into public.website_order_item_modifiers(website_order_item_id,modifier_id,modifier_name,price)
      values(v_wi,v_mod.id,v_mod.name,v_mod.price);
    end loop;
  end loop;

  if v_promo_id is not null then
    perform public.redeem_promo_code(v_promo_id,upper(trim(p_promo_code)),p_branch_id,'website',p_customer_phone,v_promo_discount,null,v_order_id);
  end if;
  return v_order_id;
end;
$$;

grant execute on function public.create_website_order(bigint,text,text,text,text,jsonb,text,text,text,text,text,bigint) to anon,authenticated;

-- Preserve website pickup as its own order type. Do NOT convert it to takeaway.
create or replace function public.accept_website_order(p_website_order_id bigint)
returns bigint
language plpgsql
security definer
set search_path=public
as $$
declare
  w public.website_orders%rowtype;
  wi record; wm record; v_employee_id bigint; v_order_id bigint; v_order_item_id bigint; v_shift_id bigint; v_type text;
begin
  v_employee_id:=public.current_employee_id();
  if v_employee_id is null then raise exception 'المستخدم غير مربوط بموظف'; end if;
  select * into w from public.website_orders where id=p_website_order_id for update;
  if not found then raise exception 'طلب الموقع غير موجود'; end if;
  if not public.has_branch_access(w.branch_id) then raise exception 'ليس لديك صلاحية لهذا الفرع'; end if;
  if w.status<>'pending' then raise exception 'تم التعامل مع الطلب بالفعل'; end if;
  select id into v_shift_id from public.shifts where branch_id=w.branch_id and employee_id=v_employee_id and status='open' and closed_at is null order by opened_at desc limit 1;
  if v_shift_id is null then raise exception 'افتح وردية أولًا قبل استلام طلب الموقع'; end if;
  v_type:=case when coalesce(w.order_type,'delivery')='pickup' then 'pickup' else 'delivery' end;

  insert into public.orders(
    branch_id,employee_id,customer_id,shift_id,order_type,payment_method,subtotal,discount,delivery_fee,total,status,notes,source,
    customer_phone,delivery_address,delivery_zone_id,delivery_area,customer_name,website_order_id,payment_status,payment_reference,payment_receipt_path,
    promo_code_id,promo_code,promo_discount
  ) values(
    w.branch_id,v_employee_id,null,v_shift_id,v_type,coalesce(w.payment_method_code,'cash'),w.subtotal,coalesce(w.promo_discount,0),
    case when v_type='delivery' then w.delivery_fee else 0 end,w.total,'new',w.customer_notes,'website',w.customer_phone,
    case when v_type='delivery' then w.customer_address else null end,
    case when v_type='delivery' then w.delivery_zone_id else null end,
    case when v_type='delivery' then (select z.name from public.delivery_zones z where z.id=w.delivery_zone_id) else null end,
    w.customer_name,w.id,coalesce(w.payment_status,'unpaid'),w.payment_reference,w.payment_receipt_path,
    w.promo_code_id,w.promo_code,coalesce(w.promo_discount,0)
  ) returning id into v_order_id;

  for wi in select * from public.website_order_items where website_order_id=w.id order by id loop
    insert into public.order_items(order_id,product_id,product_name,quantity,unit_price,cost,total,notes)
    values(v_order_id,wi.product_id,wi.product_name,wi.quantity,wi.unit_price,coalesce((select cost from public.products where id=wi.product_id),0),wi.line_total,wi.notes)
    returning id into v_order_item_id;
    for wm in select * from public.website_order_item_modifiers where website_order_item_id=wi.id order by id loop
      insert into public.order_item_modifiers(order_item_id,modifier_id,modifier_name,price)
      values(v_order_item_id,wm.modifier_id,wm.modifier_name,wm.price);
    end loop;
  end loop;

  update public.website_orders set status='accepted',accepted_at=now(),order_id=v_order_id where id=w.id;
  update public.promo_redemptions set order_id=v_order_id where website_order_id=w.id and order_id is null;
  return v_order_id;
end;
$$;
grant execute on function public.accept_website_order(bigint) to authenticated;

notify pgrst,'reload schema';
