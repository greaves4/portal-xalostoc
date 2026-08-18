import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOrderToOdoo } from "@/lib/actions/sync";
import { syncCatalog } from "@/lib/odoo/sync-catalog";
import { MAX_INTENTOS_SYNC } from "@/lib/odoo/limits";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.ODOO_SYNC_ENABLED !== "true") return NextResponse.json({ skipped: true, reason: "ODOO_SYNC_ENABLED=false" });
  const admin = createAdminClient();

  // 1. Catalogo y cuentas en ambos sentidos.
  const catalogo = await syncCatalog();
  await admin.from("sync_log").insert({
    exito: catalogo.errores.length === 0,
    odoo_response: catalogo,
    error_msg: catalogo.errores.length ? catalogo.errores.join(" | ").slice(0, 2000) : null,
  });

  // 2. Pedidos aprobados que no lograron llegar a Odoo, salvo los que ya agotaron el tope.
  const { data: orders } = await admin.from("orders").select("id").eq("status", "sync_error").limit(25);
  const ids = (orders ?? []).map((o) => o.id);
  const { data: logs } = ids.length
    ? await admin.from("sync_log").select("order_id").in("order_id", ids).eq("exito", false)
    : { data: [] as { order_id: string }[] };
  const fallos = new Map<string, number>();
  for (const log of logs ?? []) fallos.set(log.order_id, (fallos.get(log.order_id) ?? 0) + 1);
  const reintentables = ids.filter((id) => (fallos.get(id) ?? 0) < MAX_INTENTOS_SYNC);
  const agotados = ids.filter((id) => (fallos.get(id) ?? 0) >= MAX_INTENTOS_SYNC);

  for (const id of reintentables) await admin.from("orders").update({ status: "aprobado" }).eq("id", id);
  for (const id of reintentables) await syncOrderToOdoo(id);

  return NextResponse.json({ catalogo, pedidosReintentados: reintentables.length, pedidosAgotados: agotados.length });
}
