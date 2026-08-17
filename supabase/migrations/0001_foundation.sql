create extension if not exists "uuid-ossp";

create type user_role as enum ('cliente', 'validador', 'admin');
create type unidad_venta as enum ('pieza', 'metraje');
create type order_status as enum ('borrador', 'enviado', 'en_validacion', 'aprobado', 'rechazado', 'sincronizado', 'sync_error');

create table clients (
  id uuid primary key default uuid_generate_v4(), razon_social text not null, rfc text,
  contacto_nombre text, contacto_email text, contacto_tel text, odoo_partner_id integer,
  credito_limite numeric(12,2) default 0, credito_usado numeric(12,2) default 0,
  activo boolean default true, created_at timestamptz default now()
);
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade, role user_role not null default 'cliente',
  client_id uuid references clients(id) on delete set null, full_name text, created_at timestamptz default now()
);
create table products (
  id uuid primary key default uuid_generate_v4(), sku text unique not null, nombre text not null,
  descripcion text, unidad unidad_venta not null default 'pieza', precio_base numeric(12,2) not null default 0,
  odoo_product_id integer, imagen_url text, activo boolean default true, created_at timestamptz default now()
);
create table client_prices (
  id uuid primary key default uuid_generate_v4(), client_id uuid not null references clients(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade, precio numeric(12,2) not null,
  unique (client_id, product_id)
);
create table shipping_addresses (
  id uuid primary key default uuid_generate_v4(), client_id uuid not null references clients(id) on delete cascade,
  etiqueta text, calle text, ciudad text, estado text, cp text, es_default boolean default false, created_at timestamptz default now()
);
create table orders (
  id uuid primary key default uuid_generate_v4(), folio text unique, client_id uuid not null references clients(id),
  created_by uuid references auth.users(id), shipping_address_id uuid references shipping_addresses(id),
  status order_status not null default 'borrador', subtotal numeric(12,2) default 0, notas_cliente text,
  motivo_rechazo text, validated_by uuid references auth.users(id), validated_at timestamptz,
  odoo_sale_order_id integer, odoo_sale_order_name text, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table order_items (
  id uuid primary key default uuid_generate_v4(), order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id), sku_snapshot text, nombre_snapshot text, unidad unidad_venta,
  cantidad numeric(12,3) not null, precio_unit numeric(12,2) not null, importe numeric(12,2) not null
);
create table sync_log (
  id uuid primary key default uuid_generate_v4(), order_id uuid references orders(id) on delete cascade,
  intento integer default 1, exito boolean default false, odoo_response jsonb, error_msg text, created_at timestamptz default now()
);

create index idx_orders_client on orders(client_id);
create index idx_orders_status on orders(status);
create index idx_order_items_order on order_items(order_id);
create index idx_client_prices_lookup on client_prices(client_id, product_id);

create or replace function current_role() returns user_role language sql stable as $$ select role from profiles where id = auth.uid() $$;
create or replace function current_client_id() returns uuid language sql stable as $$ select client_id from profiles where id = auth.uid() $$;
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email));
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure handle_new_user();

alter table profiles enable row level security;
alter table clients enable row level security;
alter table products enable row level security;
alter table client_prices enable row level security;
alter table shipping_addresses enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table sync_log enable row level security;

create policy profiles_self_read on profiles for select using (id = auth.uid() or current_role() in ('admin','validador'));
create policy clients_read on clients for select using (id = current_client_id() or current_role() in ('admin','validador'));
create policy clients_admin_write on clients for all using (current_role() = 'admin') with check (current_role() = 'admin');
create policy products_read on products for select using (activo = true or current_role() in ('admin','validador'));
create policy products_admin_write on products for all using (current_role() = 'admin') with check (current_role() = 'admin');
create policy prices_read on client_prices for select using (client_id = current_client_id() or current_role() in ('admin','validador'));
create policy prices_admin_write on client_prices for all using (current_role() = 'admin') with check (current_role() = 'admin');
create policy shipping_read on shipping_addresses for select using (client_id = current_client_id() or current_role() in ('admin','validador'));
create policy orders_read on orders for select using (client_id = current_client_id() or current_role() in ('admin','validador'));
create policy orders_insert on orders for insert with check (client_id = current_client_id());
create policy orders_update on orders for update using (client_id = current_client_id() and status in ('borrador','enviado') or current_role() in ('admin','validador'));
create policy items_read on order_items for select using (exists (select 1 from orders where orders.id = order_id and (orders.client_id = current_client_id() or current_role() in ('admin','validador'))));
create policy items_insert on order_items for insert with check (exists (select 1 from orders where orders.id = order_id and orders.client_id = current_client_id()));
create policy sync_read on sync_log for select using (current_role() in ('admin','validador'));
