# Portal Xalostoc

Portal de pedidos de Telas Xalostoc. Next.js 15, TypeScript y Supabase.

## Desarrollo local

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Despliegue en Coolify

### Aplicación web

1. Crear un recurso **Application** conectado al repositorio.
2. Seleccionar build pack **Dockerfile**.
3. Usar la rama de producción y el `Dockerfile` de la raíz.
4. Exponer el puerto `3000`.
5. Configurar el health check `GET /api/health`.
6. Añadir las variables de `.env.example` en **Environment Variables**. Los secretos deben vivir únicamente en Coolify.
7. Activar deploy automático por webhook después de validar el primer despliegue.

### Supabase self-hosted

Supabase debe instalarse como **recurso separado** en el mismo proyecto de Coolify usando la plantilla oficial de Supabase self-hosted o su Docker Compose oficial. No se debe incluir dentro del `Dockerfile` de esta aplicación.

- Asignar volúmenes persistentes a Postgres, Storage y los servicios de Supabase que lo requieran.
- Exponer únicamente el gateway/API de Supabase con HTTPS y mantener Postgres en la red privada de Coolify.
- Configurar `NEXT_PUBLIC_SUPABASE_URL` con el dominio del gateway y `SUPABASE_SERVICE_ROLE_KEY` solo en la aplicación web.
- Ejecutar `supabase/migrations/0001_foundation.sql` contra el Postgres de esa instancia antes de crear usuarios.
- Programar backups de Postgres desde Coolify o el proveedor de almacenamiento elegido.

El contenedor usa la salida `standalone` de Next.js y corre como usuario no root. Supabase permanece como servicio administrado separado; Coolify solo hospeda la aplicación web.
