-- Dos campos que el esquema prometia y nadie mantenia.

begin;

-- orders.updated_at se quedaba siempre igual a created_at, y /admin/sync ordena por el.
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger orders_touch_updated_at before update on orders
  for each row execute procedure touch_updated_at();

-- clients.credito_usado nunca se escribia: el semaforo del validador mostraba
-- siempre $0.00 usado. Se recalcula como la suma de pedidos comprometidos.
-- OJO: el sistema no tiene concepto de pago, asi que esto solo crece; un admin
-- lo ajusta a mano cuando el cliente liquida.
create or replace function recalcular_credito_usado() returns trigger language plpgsql security definer set search_path = public as $$
declare
  cid uuid := coalesce(new.client_id, old.client_id);
begin
  update clients set credito_usado = coalesce((
    select sum(subtotal) from orders
    where client_id = cid and status in ('aprobado', 'sincronizado', 'sync_error')
  ), 0) where id = cid;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger orders_credito_usado after insert or update or delete on orders
  for each row execute procedure recalcular_credito_usado();

-- Puesta al dia de lo que ya existe.
update clients c set credito_usado = coalesce((
  select sum(o.subtotal) from orders o
  where o.client_id = c.id and o.status in ('aprobado', 'sincronizado', 'sync_error')
), 0);

commit;
