# Portal de Pedidos — Telas Xalostoc

**Plan de desarrollo detallado para Claude Code**
Versión 2.1 · Documento de ejecución técnica · Sin costos

---

## 0. Cómo usar este documento

Este archivo es el brief de ejecución. Colócalo como `CLAUDE.md` en la raíz del repo. Está ordenado para que Claude Code lo lea de arriba a abajo: primero el contexto y los principios (por qué), luego el contrato técnico (schema, rutas, conector) y al final el plan por semanas con checklist accionable.

**Regla de oro del proyecto:** Odoo se toca en un solo punto — la creación del pedido aprobado. Todo lo demás vive en el portal. Si algo se puede resolver sin Odoo, se resuelve sin Odoo.

---

## 1. Objetivo

Portal web donde un **cliente recurrente** de Telas Xalostoc:

1. Entra con **usuario y contraseña**.
2. Ve su **catálogo con precios** (por pieza o por metraje).
3. **Levanta un pedido** (carrito → confirmar).
4. Un **validador interno** lo revisa y aprueba o rechaza con motivo.
5. Si se aprueba → el pedido se crea en **Odoo como `sale.order`** (pedido oficial).

El catálogo, los precios, las cuentas de cliente y los estados del pedido son propiedad del portal. Odoo solo recibe el pedido aprobado.

---

## 2. Principios de arquitectura

| Principio | Implicación técnica |
|---|---|
| **Odoo desacoplado** | El portal opera 100% aunque Odoo esté caído, sin configurar o a media migración. |
| **Un solo write a Odoo** | Solo `createSaleOrder()`. Nunca lecturas en tiempo real de catálogo/precios/crédito. |
| **Fallo no bloquea** | Si el conector falla, el pedido queda `APROBADO` + `sync_pendiente` y se reintenta. Nunca se pierde. |
| **Fallback sin API** | Si Odoo aún no expone API, el pedido aprobado se exporta por correo/CSV. El conector se activa después sin tocar el resto. |
| **Mapeo estático** | Cada cliente guarda su `odoo_partner_id`; cada producto su `odoo_product_id`. Se cargan una vez (CSV). El conector arma el `sale.order` sin consultar Odoo. |
| **Una sola app** | Portal de cliente y panel admin en el mismo Next.js, separados por rol vía RLS + middleware. |

---

## 3. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| DB + Auth + Storage | Supabase (PostgreSQL + Auth + Row Level Security) |
| ORM / acceso datos | Supabase JS client (server-side con service role donde aplique) |
| Conector Odoo | Módulo aislado JSON-RPC (`lib/odoo/`) |
| Correo | Resend |
| Validación de forms | Zod + react-hook-form |
| Hosting | Vercel (deploy continuo desde GitHub) |
| Estado servidor | Server Actions + React Server Components (evitar API routes salvo webhook/cron) |

**No instalar de más.** Sin Redux, sin state manager global, sin backend separado. La lógica de negocio vive en Server Actions.

---

## 4. Variables de entorno

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # solo server-side, nunca al cliente

# Odoo (Semana 5; puede ir vacío al inicio → activa fallback)
ODOO_URL=                            # https://xalostoc.odoo.com
ODOO_DB=
ODOO_USERNAME=
ODOO_API_KEY=                        # API key de usuario de integración

# Resend
RESEND_API_KEY=
MAIL_FROM=pedidos@telasxalostoc.com
MAIL_VALIDADOR=                      # correo del validador interno

# Feature flags
ODOO_SYNC_ENABLED=false              # true cuando la API esté lista; false = fallback CSV/correo
```

---

## 5. Modelo de datos (Supabase / PostgreSQL)

SQL completo listo para migración. Todas las tablas con RLS activada.

```sql
-- ============ EXTENSIONES ============
create extension if not exists "uuid-ossp";

-- ============ PERFILES / ROLES ============
-- Supabase Auth maneja auth.users. Extendemos con profiles.
create type user_role as enum ('cliente', 'validador', 'admin');

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null default 'cliente',
  client_id     uuid,                    -- FK a clients (solo para role='cliente')
  full_name     text,
  created_at    timestamptz default now()
);

-- ============ CLIENTES ============
create table clients (
  id                uuid primary key default uuid_generate_v4(),
  razon_social      text not null,
  rfc               text,
  contacto_nombre   text,
  contacto_email    text,
  contacto_tel      text,
  odoo_partner_id   integer,             -- mapeo estático a res.partner
  credito_limite    numeric(12,2) default 0,   -- referencia visual para el validador
  credito_usado     numeric(12,2) default 0,   -- referencia visual (informativo, no bloqueante auto)
  activo            boolean default true,
  created_at        timestamptz default now()
);

alter table profiles add constraint fk_profile_client
  foreign key (client_id) references clients(id) on delete set null;

-- ============ DIRECCIONES DE ENTREGA ============
create table shipping_addresses (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid not null references clients(id) on delete cascade,
  etiqueta      text,                    -- 'Matriz', 'Sucursal Norte'
  calle         text,
  ciudad        text,
  estado        text,
  cp            text,
  es_default    boolean default false,
  created_at    timestamptz default now()
);

-- ============ CATÁLOGO ============
create type unidad_venta as enum ('pieza', 'metraje');

create table products (
  id                uuid primary key default uuid_generate_v4(),
  sku               text unique not null,
  nombre            text not null,
  descripcion       text,
  unidad            unidad_venta not null default 'pieza',
  precio_base       numeric(12,2) not null default 0,
  odoo_product_id   integer,             -- mapeo estático a product.product
  imagen_url        text,
  activo            boolean default true,
  created_at        timestamptz default now()
);

-- Precios por cliente (opcional; si no existe fila, se usa precio_base)
create table client_prices (
  id            uuid primary key default uuid_generate_v4(),
  client_id     uuid not null references clients(id) on delete cascade,
  product_id    uuid not null references products(id) on delete cascade,
  precio        numeric(12,2) not null,
  unique (client_id, product_id)
);

-- ============ PEDIDOS ============
create type order_status as enum (
  'borrador', 'enviado', 'en_validacion',
  'aprobado', 'rechazado', 'sincronizado', 'sync_error'
);

create table orders (
  id                uuid primary key default uuid_generate_v4(),
  folio             text unique,          -- 'XAL-2026-0001', generado al enviar
  client_id         uuid not null references clients(id),
  created_by        uuid references auth.users(id),
  shipping_address_id uuid references shipping_addresses(id),
  status            order_status not null default 'borrador',
  subtotal          numeric(12,2) default 0,
  notas_cliente     text,
  motivo_rechazo    text,
  validated_by      uuid references auth.users(id),
  validated_at      timestamptz,
  odoo_sale_order_id integer,             -- id del sale.order creado
  odoo_sale_order_name text,              -- ej 'S00042'
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table order_items (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid not null references orders(id) on delete cascade,
  product_id    uuid not null references products(id),
  sku_snapshot  text,                     -- snapshot por si cambia el producto
  nombre_snapshot text,
  unidad        unidad_venta,
  cantidad      numeric(12,3) not null,
  precio_unit   numeric(12,2) not null,
  importe       numeric(12,2) not null
);

-- ============ LOG DE SINCRONIZACIÓN ODOO ============
create table sync_log (
  id            uuid primary key default uuid_generate_v4(),
  order_id      uuid references orders(id) on delete cascade,
  intento       integer default 1,
  exito         boolean default false,
  odoo_response jsonb,
  error_msg     text,
  created_at    timestamptz default now()
);
```

### 5.1 Índices

```sql
create index idx_orders_client on orders(client_id);
create index idx_orders_status on orders(status);
create index idx_order_items_order on order_items(order_id);
create index idx_client_prices_lookup on client_prices(client_id, product_id);
create index idx_profiles_client on profiles(client_id);
```

### 5.2 RLS (Row Level Security)

```sql
-- Helper: rol del usuario actual
create or replace function current_role() returns user_role
language sql stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function current_client_id() returns uuid
language sql stable as $$
  select client_id from profiles where id = auth.uid()
$$;

-- PRODUCTS: cliente lee activos; admin CRUD total
alter table products enable row level security;
create policy prod_read on products for select
  using (activo = true or current_role() in ('admin','validador'));
create policy prod_write on products for all
  using (current_role() = 'admin') with check (current_role() = 'admin');

-- CLIENTS: cliente ve solo el suyo; staff ve todos
alter table clients enable row level security;
create policy client_read on clients for select
  using (id = current_client_id() or current_role() in ('admin','validador'));
create policy client_write on clients for all
  using (current_role() = 'admin') with check (current_role() = 'admin');

-- ORDERS: cliente ve/crea los suyos; validador y admin ven todos
alter table orders enable row level security;
create policy order_read on orders for select
  using (client_id = current_client_id() or current_role() in ('admin','validador'));
create policy order_insert on orders for insert
  with check (client_id = current_client_id());
create policy order_update_client on orders for update
  using (client_id = current_client_id() and status in ('borrador','enviado'));
create policy order_update_staff on orders for update
  using (current_role() in ('admin','validador'));

-- ORDER_ITEMS: heredan visibilidad del pedido
alter table order_items enable row level security;
create policy items_read on order_items for select
  using (exists (select 1 from orders o where o.id = order_id
    and (o.client_id = current_client_id() or current_role() in ('admin','validador'))));
create policy items_write on order_items for all
  using (exists (select 1 from orders o where o.id = order_id
    and (o.client_id = current_client_id() or current_role() in ('admin','validador'))));

-- CLIENT_PRICES, SHIPPING, SYNC_LOG: staff total; cliente lee lo suyo
alter table client_prices enable row level security;
create policy prices_read on client_prices for select
  using (client_id = current_client_id() or current_role() in ('admin','validador'));
create policy prices_write on client_prices for all
  using (current_role() = 'admin') with check (current_role() = 'admin');

alter table shipping_addresses enable row level security;
create policy ship_read on shipping_addresses for select
  using (client_id = current_client_id() or current_role() in ('admin','validador'));
create policy ship_write on shipping_addresses for all
  using (client_id = current_client_id() or current_role() = 'admin')
  with check (client_id = current_client_id() or current_role() = 'admin');

alter table sync_log enable row level security;
create policy sync_read on sync_log for select
  using (current_role() in ('admin','validador'));
```

> **Nota:** las operaciones del conector Odoo y la generación de folio corren server-side con `SUPABASE_SERVICE_ROLE_KEY`, que salta RLS. Nunca exponer ese key al cliente.

---

## 6. Máquina de estados del pedido

```
borrador ──(cliente confirma)──► enviado ──(auto)──► en_validacion
                                                          │
                        ┌─────────────────────────────────┤
                        ▼                                 ▼
                    rechazado                          aprobado
                 (motivo_rechazo)                          │
                                              ┌────────────┤
                                              ▼            ▼
                                        sincronizado   sync_error
                                       (odoo_sale_order_id)  │
                                                             └─(reintento)─► sincronizado
```

- `borrador`: el cliente arma el carrito, puede editar.
- `enviado` → `en_validacion`: al confirmar se genera `folio`, se congelan `order_items` (snapshots) y se notifica al validador.
- `aprobado`: validador aprueba. Dispara `syncOrderToOdoo(order_id)`.
- `sincronizado`: `sale.order` creado; se guarda `odoo_sale_order_id/name`.
- `sync_error`: Odoo falló o `ODOO_SYNC_ENABLED=false` con fallback. Queda en cola de reintento.
- `rechazado`: validador rechaza con `motivo_rechazo`; se notifica al cliente.

---

## 7. Estructura de carpetas

```
/
├── CLAUDE.md                        # este documento
├── .env.local
├── middleware.ts                    # protección de rutas por rol
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (portal)/                    # cliente
│   │   ├── layout.tsx               # guard role='cliente'
│   │   ├── catalogo/page.tsx
│   │   ├── carrito/page.tsx
│   │   ├── pedidos/page.tsx         # historial
│   │   └── pedidos/[id]/page.tsx    # detalle + estado
│   ├── (admin)/                     # validador / admin
│   │   ├── layout.tsx               # guard role in (validador,admin)
│   │   ├── bandeja/page.tsx         # cola de validación
│   │   ├── bandeja/[id]/page.tsx    # aprobar/rechazar
│   │   ├── productos/page.tsx       # CRUD (solo admin)
│   │   ├── clientes/page.tsx        # CRUD cuentas (solo admin)
│   │   └── sync/page.tsx            # monitor de sync_log + reintento manual
│   └── api/
│       └── cron/retry-sync/route.ts # reintento automático (Vercel Cron)
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # browser client
│   │   ├── server.ts                # server client (RSC/actions)
│   │   └── admin.ts                 # service role client
│   ├── odoo/
│   │   ├── client.ts                # JSON-RPC wrapper
│   │   ├── create-sale-order.ts     # createSaleOrder()
│   │   └── fallback.ts              # export CSV/correo
│   ├── mail/
│   │   └── resend.ts                # plantillas de notificación
│   ├── actions/
│   │   ├── orders.ts                # crear, enviar, aprobar, rechazar
│   │   ├── products.ts
│   │   ├── clients.ts
│   │   └── sync.ts                  # syncOrderToOdoo, retry
│   ├── pricing.ts                   # resuelve precio (client_prices || precio_base)
│   ├── folio.ts                     # generador XAL-YYYY-NNNN
│   └── validators.ts                # esquemas Zod
├── components/
│   ├── ui/                          # shadcn
│   ├── catalog/
│   ├── cart/
│   ├── orders/
│   └── admin/
└── supabase/
    ├── migrations/                  # SQL de sección 5
    └── seed.sql                     # datos de arranque
```

---

## 8. Conector Odoo (el corazón del desacople)

### 8.1 Cliente JSON-RPC (`lib/odoo/client.ts`)

Wrapper mínimo sobre el endpoint `/jsonrpc` de Odoo. Autentica con `common.authenticate` y ejecuta con `object.execute_kw`. Sin librerías externas — `fetch` nativo.

```ts
// Firma esperada
async function odooExecute(
  model: string,
  method: string,
  args: any[],
  kwargs?: object
): Promise<any>
```

Maneja: autenticación cacheada (uid), timeout de 10s, y errores de red devueltos como `{ ok: false, error }` (nunca lanza sin capturar en el llamador).

### 8.2 `createSaleOrder()` (`lib/odoo/create-sale-order.ts`)

Recibe un `order` con sus `order_items` (ya con `odoo_product_id` mapeado) y el `client.odoo_partner_id`. Construye y crea el `sale.order`:

```ts
async function createSaleOrder(order, items, client): Promise<{
  ok: boolean;
  odoo_id?: number;
  odoo_name?: string;
  error?: string;
}>
```

Payload a Odoo:
```ts
{
  partner_id: client.odoo_partner_id,
  client_order_ref: order.folio,        // trazabilidad portal↔Odoo
  order_line: items.map(it => [0, 0, {
    product_id: it.odoo_product_id,
    product_uom_qty: it.cantidad,
    price_unit: it.precio_unit,
    name: it.nombre_snapshot,
  }]),
}
```
Tras crear, lee `name` del pedido (`sale.order` → campo `name`) para guardarlo.

**Precondiciones (validar antes de llamar):**
- `client.odoo_partner_id` no nulo.
- Todos los items con `odoo_product_id` no nulo.
- Si falta algún mapeo → NO llamar a Odoo, marcar `sync_error` con mensaje claro (`"Falta odoo_product_id en SKU X"`) para que el admin lo resuelva desde `/admin/sync`.

### 8.3 `syncOrderToOdoo()` (`lib/actions/sync.ts`)

Orquestador. Se llama al aprobar y desde el cron de reintento.

```
1. Si ODOO_SYNC_ENABLED=false → llamar fallback (CSV/correo), status='sync_error'
   con nota "modo fallback", registrar en sync_log. FIN.
2. Validar precondiciones (partner_id, product_ids). Si faltan → sync_error + log.
3. createSaleOrder(). 
   - ok  → status='sincronizado', guardar odoo_sale_order_id/name, log exito.
   - err → status='sync_error', log con error_msg, incrementar intento.
4. Nunca lanzar excepción no capturada: el pedido ya está aprobado y no debe perderse.
```

### 8.4 Fallback sin API (`lib/odoo/fallback.ts`)

Cuando `ODOO_SYNC_ENABLED=false`: genera un CSV/JSON del pedido aprobado y lo envía por Resend a `MAIL_VALIDADOR` (o al correo de operaciones). El pedido queda visible en `/admin/sync` como "pendiente de sincronizar". Cuando la API esté lista, se activa el flag y se corre reintento masivo — sin tocar nada del portal.

### 8.5 Reintento (`app/api/cron/retry-sync/route.ts`)

Vercel Cron cada 30 min: busca `orders.status='sync_error'` con `ODOO_SYNC_ENABLED=true`, y reintenta `syncOrderToOdoo`. Límite de intentos configurable (ej. no reintentar tras 10 fallos; alertar al admin). También botón de "reintentar ahora" por pedido en `/admin/sync`.

---

## 9. Lógica de negocio clave

### 9.1 Resolución de precio (`lib/pricing.ts`)
Para un `client_id` + `product_id`: si existe fila en `client_prices` úsala; si no, `products.precio_base`. Nunca calcular precio en el cliente — siempre server-side al agregar al carrito y al confirmar (re-verificar por si cambió).

### 9.2 Generación de folio (`lib/folio.ts`)
`XAL-YYYY-NNNN` secuencial por año. Generar en transacción al pasar a `enviado` para evitar colisiones (usar un contador en tabla o `select ... for update`).

### 9.3 Snapshots
Al confirmar el pedido, copiar a cada `order_item`: `sku_snapshot`, `nombre_snapshot`, `unidad`, `precio_unit`. Así el pedido histórico no cambia si luego editan el producto.

### 9.4 Crédito (informativo, NO auto-bloqueante)
Mostrar al validador `credito_limite` vs `credito_usado + subtotal del pedido` con semáforo. La decisión de bloquear es **humana** — el validador aprueba o rechaza. No se consulta crédito de Odoo.

---

## 10. Notificaciones (Resend)

| Evento | Para | Contenido |
|---|---|---|
| Pedido enviado (`en_validacion`) | Validador | Folio, cliente, subtotal, link a bandeja. |
| Pedido aprobado | Cliente | Folio, confirmación, próximos pasos. |
| Pedido rechazado | Cliente | Folio + `motivo_rechazo`. |
| Sync error tras N intentos | Admin | Folio + error, link a `/admin/sync`. |

Plantillas simples en `lib/mail/resend.ts`. Sin diseño elaborado en MVP; texto claro + botón.

---

## 11. Plan por semanas (checklist para Claude Code)

Cada semana cierra desplegada en Vercel. Marcar `[x]` al completar.

### Semana 1 — Fundación
- [ ] Crear repo, Next.js 15 + TS + Tailwind + shadcn/ui. Deploy inicial a Vercel.
- [ ] Proyecto Supabase; correr migración de sección 5 (schema + índices + RLS).
- [ ] Clientes Supabase: `client.ts`, `server.ts`, `admin.ts`.
- [ ] Auth: login usuario/contraseña; trigger que crea `profiles` al registrar.
- [ ] `middleware.ts`: proteger `(portal)` y `(admin)` por rol; redirigir según rol tras login.
- [ ] Layouts base con navegación para cada rol.
- **Cierre:** un usuario admin puede entrar; rutas protegidas funcionan.

### Semana 2 — Catálogo y cuentas (admin)
- [ ] CRUD de productos (`/admin/productos`): SKU, nombre, unidad, precio_base, activo, `odoo_product_id`.
- [ ] Import CSV/Excel de catálogo (parseo + upsert por SKU).
- [ ] CRUD de clientes (`/admin/clientes`): razón social, contacto, `odoo_partner_id`, crédito, activo.
- [ ] Crear cuenta de usuario cliente (Supabase Auth) ligada a `client_id` con rol `cliente`.
- [ ] `client_prices`: asignar precio por cliente (opcional por producto).
- **Cierre:** admin carga catálogo por CSV y crea cuentas de clientes recurrentes.

### Semana 3 — Pedidos (cliente)
- [ ] `/catalogo`: lista con precio resuelto por cliente, búsqueda, unidad pieza/metraje.
- [ ] Carrito (estado local + persistencia en `orders` status `borrador`).
- [ ] `/carrito`: editar cantidades, elegir dirección de entrega, notas, confirmar.
- [ ] Al confirmar: generar folio, snapshots, pasar a `enviado`→`en_validacion`.
- [ ] `/pedidos` historial + `/pedidos/[id]` detalle con timeline de estado.
- **Cierre:** cliente levanta un pedido completo y lo ve en su historial.

### Semana 4 — Bandeja de validación
- [ ] `/admin/bandeja`: cola de pedidos `en_validacion` (folio, cliente, subtotal, fecha).
- [ ] `/admin/bandeja/[id]`: detalle con items, dirección, semáforo de crédito.
- [ ] Acción aprobar (→ `aprobado`, dispara sync) y rechazar (→ `rechazado` + motivo).
- [ ] Notificaciones Resend: al validador (nuevo pedido), al cliente (aprobado/rechazado).
- **Cierre:** flujo login→pedido→validación→notificación completo, SIN Odoo aún.

### Semana 5 — Conector Odoo
- [ ] `lib/odoo/client.ts` (JSON-RPC, auth, timeout, errores capturados).
- [ ] `createSaleOrder()` con validación de precondiciones (partner/product ids).
- [ ] `syncOrderToOdoo()` orquestador + `sync_log`.
- [ ] `fallback.ts` (CSV/correo) para `ODOO_SYNC_ENABLED=false`.
- [ ] `/admin/sync`: monitor de sync_log + reintento manual por pedido.
- [ ] Vercel Cron `retry-sync` cada 30 min.
- [ ] Prueba end-to-end contra Odoo staging real: pedido aprobado → `sale.order` creado.
- **Cierre:** pedido aprobado genera `sale.order` en Odoo con `client_order_ref = folio`.

### Semana 6 — QA y salida
- [ ] Pruebas con 2–3 clientes piloto reales (datos reales de catálogo).
- [ ] Revisión de RLS (cada rol ve solo lo que debe).
- [ ] Estados de error: Odoo caído, mapeo faltante, sesión expirada.
- [ ] Carga de datos definitiva (catálogo + cuentas + mapeos).
- [ ] Capacitación al validador; mini-guía de uso.
- [ ] Go-live producción.
- **Cierre:** clientes piloto operando en producción.

---

## 12. Criterios de aceptación (definición de "listo")

| # | Criterio |
|---|---|
| 1 | Un cliente solo ve su catálogo, sus precios y sus pedidos (verificado vía RLS). |
| 2 | Un pedido confirmado genera folio único y congela precios (snapshots). |
| 3 | El validador puede aprobar/rechazar; el rechazo exige motivo. |
| 4 | Aprobar un pedido crea `sale.order` en Odoo con las líneas correctas. |
| 5 | Si Odoo falla o está apagado, el pedido queda `sync_error` y se reintenta; nunca se pierde. |
| 6 | Con `ODOO_SYNC_ENABLED=false`, el portal funciona completo y exporta por fallback. |
| 7 | Ningún secreto (service role, API key Odoo) llega al cliente. |
| 8 | El sistema opera sin ninguna lectura en tiempo real desde Odoo. |

---

## 13. Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` y credenciales Odoo: solo en Server Actions / route handlers server-side. Nunca en componentes cliente ni en `NEXT_PUBLIC_*`.
- RLS activa en todas las tablas; el cliente nunca consulta con service role.
- Validar todo input con Zod antes de escribir.
- Rate limit básico en login (Supabase Auth lo cubre; reforzar si hace falta).
- `client_order_ref = folio` en Odoo para auditoría bidireccional.

---

## 14. Fuera de alcance (módulos posteriores, misma base)

Alta self-service de clientes con carga de CSF y validación de vigencia · Formato de paquetería (PDF) para foráneos · Sincronización automática de catálogo/precios desde Odoo · Pagos en línea · Facturación/timbrado automático · Devoluciones en dos etapas. Todo se construye encima sin reescribir el núcleo.

---

## 15. Datos de arranque necesarios de Telas Xalostoc

**Semana 1:** lista de clientes recurrentes (razón social, contacto, correo) · catálogo en Excel/CSV (SKU, descripción, unidad, precio) · validador designado · reglas de validación por escrito · logo, colores, subdominio.

**Semana 4–5 (integración):** URL/DB/usuario de integración Odoo con permiso de crear pedidos de venta · `partner_id` por cliente · `product_id` (o SKU para mapear) por producto.

---

*Geek Vibes · Documento de ejecución técnica · No constituye oferta vinculante.*
