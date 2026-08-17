"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSaleOrder } from "@/lib/odoo/create-sale-order";
import { fallbackPayload, sendFallbackEmail } from "@/lib/odoo/fallback";
import { redirect } from "next/navigation";

export async function syncOrderToOdoo(orderId: string) {
  const supabase = createAdminClient();
  const { data: order } = await supabase.from("orders").select("id, folio, subtotal, status, clients(odoo_partner_id), order_items(product_id, cantidad, precio_unit, nombre_snapshot, products(odoo_product_id))").eq("id", orderId).maybeSingle();
  if (!order || order.status !== "aprobado") return;
  const items = (order.order_items ?? []).map((item) => ({ ...item, odoo_product_id: Array.isArray(item.products) ? item.products[0]?.odoo_product_id : null }));
  let result: { ok: boolean; error?: string; odoo_id?: number; odoo_name?: string };
  if (process.env.ODOO_SYNC_ENABLED !== "true") {
    result = { ok: false, error: "Modo fallback: ODOO_SYNC_ENABLED=false." };
    const payload = fallbackPayload({ folio: order.folio, subtotal: Number(order.subtotal) }, items);
    const email = await sendFallbackEmail(payload);
    await supabase.from("sync_log").insert({ order_id: order.id, exito: false, error_msg: `${result.error} ${email.sent ? "Correo enviado." : email.reason}`, odoo_response: payload });
  } else {
    const client = Array.isArray(order.clients) ? order.clients[0] : order.clients;
    result = await createSaleOrder({ folio: order.folio, client: client ?? { odoo_partner_id: null }, items });
    await supabase.from("sync_log").insert({ order_id: order.id, exito: result.ok, odoo_response: result.ok ? { id: result.odoo_id, name: result.odoo_name } : null, error_msg: result.error ?? null });
  }
  if (result.ok) await supabase.from("orders").update({ status: "sincronizado", odoo_sale_order_id: result.odoo_id, odoo_sale_order_name: result.odoo_name }).eq("id", order.id);
  else await supabase.from("orders").update({ status: "sync_error" }).eq("id", order.id);
  revalidatePath("/admin/sync");
  revalidatePath(`/admin/bandeja/${order.id}`);
}

export async function retrySync(formData: FormData) {
  const supabase = createAdminClient();
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) return;
  const { data: { user } } = await (await import("@/lib/supabase/server")).createClient().then((client) => client.auth.getUser());
  if (!user) redirect("/");
  await syncOrderToOdoo(orderId);
  revalidatePath("/admin/sync");
  void supabase;
}
