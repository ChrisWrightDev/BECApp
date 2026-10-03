-- =====================================================================
-- Admin order tracking (BECApp)
-- Project: janwtypmneybfzeiauzt (SHARED with blueeyedclowns.com)
--
-- DO NOT apply without review. Adds shipping fields and admin read/update
-- access for public.orders and public.order_items. The public website
-- still writes orders with the service role (bypasses RLS).
-- Does NOT send email. Does NOT add insert or delete policies.
-- Rollback SQL is at the bottom of this file (commented out).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (a) Shipping / admin columns
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists carrier text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists admin_notes text;

alter table public.orders drop constraint if exists orders_carrier_check;
alter table public.orders
  add constraint orders_carrier_check
  check (carrier is null or carrier in ('USPS', 'UPS', 'FedEx', 'Other'));

-- ---------------------------------------------------------------------
-- (b) Status check: look up the existing status CHECK, then replace it.
--     Allows delivered and refunded in addition to the original set.
-- ---------------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'orders'
      and c.contype = 'c'
      and exists (
        select 1
        from unnest(c.conkey) as col(attnum)
        join pg_attribute a
          on a.attrelid = t.oid
         and a.attnum = col.attnum
        where a.attname = 'status'
      )
  loop
    execute format('alter table public.orders drop constraint %I', r.conname);
  end loop;
end
$$;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check
  check (
    status in (
      'pending',
      'paid',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    )
  );

-- ---------------------------------------------------------------------
-- (c) RLS: admins can read orders and items, and update orders.
--     No insert/delete policies. Website writes stay on the service role.
-- ---------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Admins can select orders" on public.orders;
create policy "Admins can select orders"
  on public.orders
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can update orders"
  on public.orders
  for update
  to authenticated
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

drop policy if exists "Admins can select order items" on public.order_items;
create policy "Admins can select order items"
  on public.order_items
  for select
  to authenticated
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- (d) Admin update function. Mirrors admin_set_clownfish_price.
--     Sets shipped_at / delivered_at the first time status becomes that
--     value. Later saves keep the original timestamp.
-- ---------------------------------------------------------------------
create or replace function public.admin_update_order(
  p_order_id uuid,
  p_status text,
  p_carrier text,
  p_tracking_number text,
  p_admin_notes text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.orders;
  v_status text;
  v_carrier text;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admins only' using errcode = '42501';
  end if;

  v_status := btrim(p_status);
  if v_status is null or v_status not in (
    'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'
  ) then
    raise exception 'Invalid status' using errcode = '22023';
  end if;

  v_carrier := nullif(btrim(p_carrier), '');
  if v_carrier is not null and v_carrier not in ('USPS', 'UPS', 'FedEx', 'Other') then
    raise exception 'Invalid carrier' using errcode = '22023';
  end if;

  update public.orders
  set
    status = v_status,
    carrier = v_carrier,
    tracking_number = nullif(btrim(p_tracking_number), ''),
    admin_notes = nullif(btrim(p_admin_notes), ''),
    updated_at = now(),
    shipped_at = case
      when v_status = 'shipped' then coalesce(shipped_at, now())
      else shipped_at
    end,
    delivered_at = case
      when v_status = 'delivered' then coalesce(delivered_at, now())
      else delivered_at
    end
  where id = p_order_id
  returning * into r;

  if not found then
    raise exception 'Not found' using errcode = 'P0002';
  end if;

  return r;
end
$$;

revoke all on function public.admin_update_order(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_update_order(uuid, text, text, text, text) to authenticated;

commit;

-- =====================================================================
-- ROLLBACK (run manually only if needed)
-- Fails if any order status is 'delivered' or 'refunded' when the old
-- status check is restored. Drop or rewrite those rows first.
-- Dropping the new columns deletes tracking numbers and admin notes.
-- =====================================================================
-- begin;
--
-- drop policy if exists "Admins can select orders" on public.orders;
-- drop policy if exists "Admins can update orders" on public.orders;
-- drop policy if exists "Admins can select order items" on public.order_items;
--
-- drop function if exists public.admin_update_order(uuid, text, text, text, text);
--
-- alter table public.orders drop constraint if exists orders_carrier_check;
-- alter table public.orders drop constraint if exists orders_status_check;
-- alter table public.orders
--   add constraint orders_status_check
--   check (status in ('pending', 'paid', 'processing', 'shipped', 'cancelled'));
--
-- alter table public.orders
--   drop column if exists tracking_number,
--   drop column if exists carrier,
--   drop column if exists shipped_at,
--   drop column if exists delivered_at,
--   drop column if exists admin_notes;
--
-- commit;
