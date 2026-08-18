"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createSaleOrder } from "@/lib/odoo/create-sale-order";
import { syncCatalog } from "@/lib/odoo/sync-catalog";
import { fallbackPayload, sendFallbackEmail } from "@/lib/odoo/fallback";
import { redirect } from "next/navigation";
import { sendNotice } from "@/lib/mail/resend";
import { MAX_INTENTOS_SYNC } from "@/lib/odoo/limits";

export async function syncOrderToOdoo(orderId: string) {
  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select("id, folio, subtotal, status, clients(odoo_partner_id), order_items(product_id, cantidad, precio_unit, nombre_snapshot, products(odoo_product_id))").eq("id", orderId).maybeSingle();
  if (!order || order.status !== "aprobado") return;
  const { count: fallosPrevios } = await supabase.from("sync_log").select("id", { count: "exact", head: true }).eq("order_id", order.id).eq("exito", false);
  const intento = (fallosPrevios ?? 0) + 1;
  // products viene como objeto en una relacion to-one; el array solo aparece segun como
  // se infiera el tipo. Contemplar ambos, o odoo_product_id sale siempre null y el pedido
  // se rechaza solo con "Falta odoo_product_id".
  const items = (order.order_items ?? []).map((item) => {
    const producto = Array.isArray(item.products) ? item.products[0] : item.products;
    return { ...item, odoo_product_id: producto?.odoo_product_id ?? null };
  });
  let result: { ok: boolean; error?: string; odoo_id?: number; odoo_name?: string };
  if (process.env.ODOO_SYNC_ENABLED !== "true") {
    result = { ok: false, error: "Modo fallback: ODOO_SYNC_ENABLED=false." };
    const payload = fallbackPayload({ folio: order.folio, subtotal: Number(order.subtotal) }, items);
    const email = await sendFallbackEmail(payload);
    await supabase.from("sync_log").insert({ order_id: order.id, intento, exito: false, error_msg: `${result.error} ${email.sent ? "Correo enviado." : email.reason}`, odoo_response: payload });
  } else {
    const client = Array.isArray(order.clients) ? order.clients[0] : order.clients;
    result = await createSaleOrder({ folio: order.folio, client: client ?? { odoo_partner_id: null }, items });
    await supabase.from("sync_log").insert({ order_id: order.id, intento, exito: result.ok, odoo_response: result.ok ? { id: result.odoo_id, name: result.odoo_name } : null, error_msg: result.error ?? null });
  }
  if (result.ok) await supabase.from("orders").update({ status: "sincronizado", odoo_sale_order_id: result.odoo_id, odoo_sale_order_name: result.odoo_name }).eq("id", order.id);
  else {
    await supabase.from("orders").update({ status: "sync_error" }).eq("id", order.id);
    if (intento >= MAX_INTENTOS_SYNC) {
      await sendNotice({
        to: process.env.MAIL_VALIDADOR,
        subject: `Pedido ${order.folio}: sincronización agotada tras ${intento} intentos`,
        text: `El pedido ${order.folio} no pudo sincronizarse con Odoo tras ${intento} intentos y ya no se reintentará solo.\nÚltimo error: ${result.error ?? "sin detalle"}\nRevísalo en /admin/sync y usa "Reintentar" cuando esté resuelto.`,
      });
    }
  }
  revalidatePath("/admin/sync");
  revalidatePath(`/admin/bandeja/${order.id}`);
}

export async function retrySync(formData: FormData) {
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) return;
  await requireStaffSession();
  await syncOrderToOdoo(orderId);
  revalidatePath("/admin/sync");
}

async function requireStaffSession() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "validador"].includes(profile.role)) redirect("/catalogo");
}

export async function runCatalogSync() {
  await requireStaffSession();
  const report = await syncCatalog();
  await createAdminClient().from("sync_log").insert({
    exito: report.errores.length === 0,
    odoo_response: report,
    error_msg: report.errores.length ? report.errores.join(" | ").slice(0, 2000) : null,
  });
  revalidatePath("/admin/sync");
  revalidatePath("/admin/productos");
  revalidatePath("/admin/clientes");
  revalidatePath("/catalogo");
}
