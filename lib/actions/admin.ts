"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/admin/bandeja");
  return supabase;
}

export async function createProduct(formData: FormData) {
  const supabase = await requireAdmin();
  const sku = String(formData.get("sku") ?? "").trim().toUpperCase();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const unidad = formData.get("unidad") === "metraje" ? "metraje" : "pieza";
  const precio = Number(formData.get("precio_base"));
  const odooId = String(formData.get("odoo_product_id") ?? "").trim();
  if (!sku || !nombre || !Number.isFinite(precio) || precio < 0) return;
  await supabase.from("products").insert({ sku, nombre, unidad, precio_base: precio, odoo_product_id: odooId ? Number(odooId) : null });
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

export async function toggleProduct(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id"));
  const activo = formData.get("activo") === "true";
  await supabase.from("products").update({ activo: !activo }).eq("id", id);
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += char;
  }
  values.push(value.trim());
  return values;
}

export async function importProductsCsv(formData: FormData) {
  const supabase = await requireAdmin();
  const file = formData.get("csv") as File | null;
  if (!file || file.size === 0 || file.size > 5_000_000) return;
  const lines = (await file.text()).split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return;
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/\s+/g, "_"));
  const products = lines.slice(1).map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])))
    .filter((row) => row.sku && row.nombre).map((row) => ({ sku: row.sku.toUpperCase(), nombre: row.nombre, unidad: row.unidad === "metraje" ? "metraje" : "pieza", precio_base: Number(row.precio_base || 0), odoo_product_id: row.odoo_product_id ? Number(row.odoo_product_id) : null }));
  if (products.length) await supabase.from("products").upsert(products, { onConflict: "sku" });
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

export async function assignClientPrice(formData: FormData) {
  const supabase = await requireAdmin();
  const clientId = String(formData.get("price_client_id") ?? "");
  const productId = String(formData.get("price_product_id") ?? "");
  const price = Number(formData.get("price"));
  if (!clientId || !productId || !Number.isFinite(price) || price < 0) return;
  await supabase.from("client_prices").upsert({ client_id: clientId, product_id: productId, precio: price }, { onConflict: "client_id,product_id" });
  revalidatePath("/admin/productos");
  revalidatePath("/catalogo");
}

export async function createClientAccount(formData: FormData) {
  const supabase = await requireAdmin();
  const razonSocial = String(formData.get("razon_social") ?? "").trim();
  const email = String(formData.get("contacto_email") ?? "").trim().toLowerCase();
  const rfc = String(formData.get("rfc") ?? "").trim().toUpperCase();
  const partnerId = String(formData.get("odoo_partner_id") ?? "").trim();
  if (!razonSocial || !email) return;
  await supabase.from("clients").insert({ razon_social: razonSocial, contacto_email: email, rfc, odoo_partner_id: partnerId ? Number(partnerId) : null });
  revalidatePath("/admin/clientes");
}

export async function createClientUser(formData: FormData) {
  const supabase = await requireAdmin();
  const admin = createAdminClient();
  const clientId = String(formData.get("client_id") ?? "");
  const email = String(formData.get("user_email") ?? "").trim().toLowerCase();
  const password = String(formData.get("user_password") ?? "");
  if (!clientId || !email || password.length < 8) return;
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) return;
  const { error: profileError } = await admin.from("profiles").update({ role: "cliente", client_id: clientId }).eq("id", created.user.id);
  if (profileError) await admin.auth.admin.deleteUser(created.user.id);
  await supabase.from("clients").update({ contacto_email: email }).eq("id", clientId);
  revalidatePath("/admin/clientes");
}

export async function createShippingAddress(formData: FormData) {
  const supabase = await requireAdmin();
  const clientId = String(formData.get("addr_client_id") ?? "");
  const calle = String(formData.get("calle") ?? "").trim();
  if (!clientId || !calle) return;
  const esDefault = formData.get("es_default") === "on";
  // Solo una direccion por cliente puede ser la predeterminada.
  if (esDefault) await supabase.from("shipping_addresses").update({ es_default: false }).eq("client_id", clientId);
  await supabase.from("shipping_addresses").insert({
    client_id: clientId,
    etiqueta: String(formData.get("etiqueta") ?? "").trim() || null,
    calle,
    ciudad: String(formData.get("ciudad") ?? "").trim() || null,
    estado: String(formData.get("estado_dir") ?? "").trim() || null,
    cp: String(formData.get("cp") ?? "").trim() || null,
    es_default: esDefault,
  });
  revalidatePath("/admin/clientes");
  revalidatePath("/carrito");
}

export async function updateClient(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const razonSocial = String(formData.get("razon_social") ?? "").trim();
  if (!id || !razonSocial) return;
  const numero = (campo: string) => {
    const valor = Number(formData.get(campo));
    return Number.isFinite(valor) && valor >= 0 ? valor : 0;
  };
  const partnerId = String(formData.get("odoo_partner_id") ?? "").trim();
  // credito_usado no se toca: lo mantiene el trigger sobre orders.
  await supabase.from("clients").update({
    razon_social: razonSocial,
    rfc: String(formData.get("rfc") ?? "").trim().toUpperCase() || null,
    contacto_email: String(formData.get("contacto_email") ?? "").trim().toLowerCase() || null,
    contacto_tel: String(formData.get("contacto_tel") ?? "").trim() || null,
    odoo_partner_id: partnerId ? Number(partnerId) : null,
    credito_limite: numero("credito_limite"),
    credito_liquidado: numero("credito_liquidado"),
    activo: formData.get("activo") === "on",
  }).eq("id", id);
  revalidatePath("/admin/clientes");
  revalidatePath("/admin/bandeja");
  revalidatePath("/catalogo");
  redirect("/admin/clientes");
}
