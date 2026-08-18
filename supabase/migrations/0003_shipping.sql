-- 0001 dejo shipping_addresses con RLS activo y solo politica de SELECT: nadie podia
-- insertar direcciones, ni siquiera un admin desde su sesion.

begin;

create policy shipping_admin_write on shipping_addresses for all
  using (app_current_role() = 'admin')
  with check (app_current_role() = 'admin');

create index idx_shipping_client on shipping_addresses(client_id);

commit;
