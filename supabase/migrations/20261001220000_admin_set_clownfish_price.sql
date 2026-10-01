create or replace function public.admin_set_clownfish_price(p_id uuid, p_price_cents integer)
returns public.clownfish language plpgsql security definer set search_path = '' as $$
declare r public.clownfish;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Admins only' using errcode = '42501'; end if;
  if p_price_cents is null or p_price_cents <= 0 or p_price_cents > 10000000 then
    raise exception 'Invalid price' using errcode = '22023'; end if;
  update public.clownfish set price_cents = p_price_cents where id = p_id returning * into r;
  if not found then raise exception 'Not found' using errcode = 'P0002'; end if;
  return r;
end $$;
revoke all on function public.admin_set_clownfish_price(uuid, integer) from public, anon;
grant execute on function public.admin_set_clownfish_price(uuid, integer) to authenticated;

-- rollback
-- drop function public.admin_set_clownfish_price(uuid, integer);
