"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncOrderToOdoo } from "@/lib/actions/sync";
import { sendNotice } from "@/lib/mail/resend";

type CartLine = { productId: string; quantity: number };

async function requireStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!profile || !["admin", "validador"].includes(profile.role)) redirect("/catalogo");
  return { supabase, user };
}

export async function submitOrder(formData: FormData) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role, client_id").eq("id", user.id).maybeSingle();
  if (profile?.role !== "cliente" || !profile.client_id) return;
  let lines: CartLine[];
  try { lines = JSON.parse(String(formData.get("items") ?? "[]")); } catch { return; }
  const cleanLines = lines.filter((line) => line.productId && Number.isFinite(line.quantity) && line.quantity > 0).map((line) => ({ ...line, quantity: Math.min(line.quantity, 999999) }));
  if (!cleanLines.length) return;
  const ids = cleanLines.map((line) => line.productId);
  const [{ data: products }, { data: prices }] = await Promise.all([
    supabase.from("products").select("id, sku, nombre, unidad, precio_base").in("id", ids).eq("activo", true),
    supabase.from("client_prices").select("product_id, precio").eq("client_id", profile.client_id).in("product_id", ids),
  ]);
  if (!products?.length) return;
  const priceMap = new Map((prices ?? []).map((price) => [price.product_id, Number(price.precio)]));
  const productMap = new Map(products.map((product) => [product.id, product]));
  const items = cleanLines.flatMap((line) => {
    const product = productMap.get(line.productId);
    if (!product) return [];
    const price = priceMap.get(product.id) ?? Number(product.precio_base);
    return [{ product_id: product.id, sku_snapshot: product.sku, nombre_snapshot: product.nombre, unidad: product.unidad, cantidad: line.quantity, precio_unit: price, importe: price * line.quantity }];
  });
  if (!items.length) return;
  const year = new Date().getFullYear();
  const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", `${year}-01-01T00:00:00.000Z`);
  const folio = `XAL-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
  const subtotal = items.reduce((sum, item) => sum + item.importe, 0);
  const { data: order, error } = await supabase.from("orders").insert({ folio, client_id: profile.client_id, created_by: user.id, status: "en_validacion", subtotal, notas_cliente: String(formData.get("notes") ?? "").trim() || null }).select("id").single();
  if (error || !order) return;
  await supabase.from("order_items").insert(items.map((item) => ({ ...item, order_id: order.id })));
  await sendNotice({ to: process.env.MAIL_VALIDADOR, subject: `Nuevo pedido ${folio}`, text: `Se recibió el pedido ${folio} por $${subtotal.toFixed(2)} y está listo para validación.` });
  revalidatePath("/catalogo");
  revalidatePath("/carrito");
  revalidatePath("/pedidos");
  redirect(`/pedidos/${order.id}`);
}

export async function approveOrder(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) return;
  await supabase.from("orders").update({ status: "aprobado", validated_by: user.id, validated_at: new Date().toISOString() }).eq("id", orderId).eq("status", "en_validacion");
  const { data: order } = await supabase.from("orders").select("folio, subtotal, clients(contacto_email)").eq("id", orderId).maybeSingle();
  const client = Array.isArray(order?.clients) ? order.clients[0] : order?.clients;
  await sendNotice({ to: client?.contacto_email, subject: `Pedido ${order?.folio} aprobado`, text: `Tu pedido ${order?.folio} por $${Number(order?.subtotal ?? 0).toFixed(2)} fue aprobado.` });
  await syncOrderToOdoo(orderId);
  revalidatePath("/admin/bandeja");
  revalidatePath(`/admin/bandeja/${orderId}`);
}

export async function rejectOrder(formData: FormData) {
  const { supabase, user } = await requireStaff();
  const orderId = String(formData.get("order_id") ?? "");
  const reason = String(formData.get("motivo_rechazo") ?? "").trim();
  if (!orderId || !reason) return;
  await supabase.from("orders").update({ status: "rechazado", motivo_rechazo: reason, validated_by: user.id, validated_at: new Date().toISOString() }).eq("id", orderId).eq("status", "en_validacion");
  const { data: order } = await supabase.from("orders").select("folio, clients(contacto_email)").eq("id", orderId).maybeSingle();
  const client = Array.isArray(order?.clients) ? order.clients[0] : order?.clients;
  await sendNotice({ to: client?.contacto_email, subject: `Pedido ${order?.folio} requiere revisión`, text: `Tu pedido ${order?.folio} fue rechazado. Motivo: ${reason}` });
  revalidatePath("/admin/bandeja");
  revalidatePath(`/admin/bandeja/${orderId}`);
}
