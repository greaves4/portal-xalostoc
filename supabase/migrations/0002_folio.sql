-- Folio atomico. Antes se generaba contando orders desde la sesion del cliente,
-- que por RLS solo ve las suyas: el primer pedido de cada cliente pedia XAL-YYYY-0001
-- y chocaba contra el unique de folio.

begin;

create table folio_counters (anio integer primary key, ultimo integer not null default 0);
alter table folio_counters enable row level security;  -- sin politicas: solo se toca via next_folio()

create or replace function next_folio() returns text language plpgsql security definer set search_path = public as $$
declare
  y integer := extract(year from now())::integer;
  n integer;
begin
  insert into folio_counters (anio, ultimo) values (y, 1)
  on conflict (anio) do update set ultimo = folio_counters.ultimo + 1
  returning ultimo into n;
  return 'XAL-' || y || '-' || lpad(n::text, 4, '0');
end;
$$;

revoke all on function next_folio() from public;
grant execute on function next_folio() to authenticated, service_role;

commit;
