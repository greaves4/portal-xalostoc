import { odooExecute } from "@/lib/odoo/client";
import { createAdminClient } from "@/lib/supabase/admin";

export type SyncReport = {
  productos: { nuevosEnPortal: number; actualizados: number; nuevosEnOdoo: number; sinSku: string[] };
  clientes: { nuevosEnPortal: number; nuevosEnOdoo: number };
  precios: { asignados: number };
  errores: string[];
};

type OdooProduct = { id: number; default_code: string | false; name: string; list_price: number; uom_id: [number, string] | false };
type OdooPartner = { id: number; name: string; vat: string | false; email: string | false; phone: string | false };

const METRAJE = new Set(["m", "mtr", "meters", "metros"]);
const unidadDe = (uom: [number, string] | false) => (uom && METRAJE.has(uom[1].trim().toLowerCase()) ? "metraje" : "pieza");

// Odoo exige uom_id al crear. No se consulta uom.uom porque el usuario de integracion
// no siempre tiene acceso a ese modelo; se deducen del propio catalogo.
async function resolverUoms() {
  const res = await odooExecute("product.product", "search_read", [[["sale_ok", "=", true]], ["uom_id"]], { limit: 200 });
  const ids: Record<"metraje" | "pieza", number | null> = { metraje: null, pieza: null };
  if (res.ok && Array.isArray(res.value)) {
    for (const row of res.value as { uom_id: [number, string] | false }[]) {
      if (!row.uom_id) continue;
      const clave = unidadDe(row.uom_id);
      if (ids[clave] === null) ids[clave] = row.uom_id[0];
    }
  }
  return ids;
}

export async function syncCatalog(): Promise<SyncReport> {
  const supabase = createAdminClient();
  const report: SyncReport = {
    productos: { nuevosEnPortal: 0, actualizados: 0, nuevosEnOdoo: 0, sinSku: [] },
    clientes: { nuevosEnPortal: 0, nuevosEnOdoo: 0 },
    precios: { asignados: 0 },
    errores: [],
  };

  // ---------- productos: Odoo -> portal ----------
  const odooProducts = await odooExecute("product.product", "search_read",
    [[["sale_ok", "=", true]], ["id", "default_code", "name", "list_price", "uom_id"]]);
  if (!odooProducts.ok) {
    report.errores.push(`Lectura de productos: ${odooProducts.error}`);
    return report;
  }
  const { data: existentes } = await supabase.from("products").select("id, sku, odoo_product_id");
  const porSku = new Map((existentes ?? []).map((p) => [p.sku, p]));

  for (const p of odooProducts.value as OdooProduct[]) {
    const sku = (p.default_code || "").trim();
    if (!sku) { report.productos.sinSku.push(p.name); continue; }
    const precio = Number(p.list_price ?? 0);
    const comun = { nombre: p.name.trim(), unidad: unidadDe(p.uom_id), precio_base: precio, odoo_product_id: p.id };
    if (porSku.has(sku)) {
      // No se toca 'activo': lo controla el portal, no Odoo.
      const { error } = await supabase.from("products").update(comun).eq("sku", sku);
      if (error) report.errores.push(`Actualizar ${sku}: ${error.message}`);
      else report.productos.actualizados += 1;
    } else {
      const { error } = await supabase.from("products").insert({ sku, ...comun, activo: precio > 0 });
      if (error) report.errores.push(`Alta ${sku}: ${error.message}`);
      else report.productos.nuevosEnPortal += 1;
    }
  }

  // ---------- productos: portal -> Odoo ----------
  const { data: sinMapear } = await supabase.from("products").select("id, sku, nombre, unidad, precio_base").is("odoo_product_id", null);
  if (sinMapear?.length) {
    const uoms = await resolverUoms();
    for (const p of sinMapear) {
      const uom = uoms[p.unidad as "metraje" | "pieza"];
      if (!uom) { report.errores.push(`Sin unidad de medida en Odoo para ${p.sku}.`); continue; }
      const creado = await odooExecute("product.product", "create",
        [{ name: p.nombre, default_code: p.sku, list_price: Number(p.precio_base), uom_id: uom, uom_po_id: uom, type: "consu", sale_ok: true }]);
      if (!creado.ok || typeof creado.value !== "number") {
        report.errores.push(`Crear ${p.sku} en Odoo: ${creado.ok ? "sin id" : creado.error}`);
        continue;
      }
      await supabase.from("products").update({ odoo_product_id: creado.value }).eq("id", p.id);
      report.productos.nuevosEnOdoo += 1;
    }
  }

  // ---------- clientes: Odoo -> portal ----------
  const odooPartners = await odooExecute("res.partner", "search_read",
    [[["customer_rank", ">", 0]], ["id", "name", "vat", "email", "phone"]]);
  if (odooPartners.ok) {
    const { data: clientes } = await supabase.from("clients").select("id, odoo_partner_id");
    const mapeados = new Set((clientes ?? []).map((c) => c.odoo_partner_id).filter(Boolean));
    for (const p of odooPartners.value as OdooPartner[]) {
      if (mapeados.has(p.id)) continue;
      const { error } = await supabase.from("clients").insert({
        razon_social: p.name.trim(), rfc: p.vat || null, contacto_email: p.email || null,
        contacto_tel: p.phone || null, odoo_partner_id: p.id, activo: true,
      });
      if (error) report.errores.push(`Alta cliente ${p.name}: ${error.message}`);
      else report.clientes.nuevosEnPortal += 1;
    }
  } else {
    report.errores.push(`Lectura de clientes: ${odooPartners.error}`);
  }

  // ---------- clientes: portal -> Odoo ----------
  const { data: clientesSinMapear } = await supabase.from("clients").select("id, razon_social, rfc, contacto_email, contacto_tel").is("odoo_partner_id", null);
  for (const c of clientesSinMapear ?? []) {
    const creado = await odooExecute("res.partner", "create",
      [{ name: c.razon_social, vat: c.rfc || false, email: c.contacto_email || false, phone: c.contacto_tel || false, customer_rank: 1, company_type: "company" }]);
    if (!creado.ok || typeof creado.value !== "number") {
      report.errores.push(`Crear cliente ${c.razon_social} en Odoo: ${creado.ok ? "sin id" : creado.error}`);
      continue;
    }
    await supabase.from("clients").update({ odoo_partner_id: creado.value }).eq("id", c.id);
    report.clientes.nuevosEnOdoo += 1;
  }

  // ---------- pricelists -> client_prices ----------
  report.precios.asignados = await syncPricelists(report.errores);
  return report;
}

// Solo se traducen reglas de precio fijo por producto: son las que tienen equivalente
// directo en client_prices. Formulas y descuentos por volumen quedan fuera a proposito.
async function syncPricelists(errores: string[]): Promise<number> {
  const supabase = createAdminClient();
  const partners = await odooExecute("res.partner", "search_read",
    [[["customer_rank", ">", 0]], ["id", "property_product_pricelist"]]);
  const items = await odooExecute("product.pricelist.item", "search_read",
    [[["compute_price", "=", "fixed"], ["applied_on", "in", ["1_product", "0_product_variant"]]],
     ["pricelist_id", "product_id", "product_tmpl_id", "fixed_price"]]);
  if (!partners.ok || !items.ok) {
    errores.push(`Pricelists: ${partners.ok ? (items.ok ? "" : items.error) : partners.error}`);
    return 0;
  }

  const porPricelist = new Map<number, { productoOdoo: number; precio: number }[]>();
  for (const it of items.value as { pricelist_id: [number, string]; product_id: [number, string] | false; product_tmpl_id: [number, string] | false; fixed_price: number }[]) {
    const prod = it.product_id || it.product_tmpl_id;
    if (!prod) continue;
    const lista = porPricelist.get(it.pricelist_id[0]) ?? [];
    lista.push({ productoOdoo: prod[0], precio: Number(it.fixed_price) });
    porPricelist.set(it.pricelist_id[0], lista);
  }

  const { data: productos } = await supabase.from("products").select("id, odoo_product_id").not("odoo_product_id", "is", null);
  const porOdooId = new Map((productos ?? []).map((p) => [p.odoo_product_id, p.id]));
  const { data: clientes } = await supabase.from("clients").select("id, odoo_partner_id").not("odoo_partner_id", "is", null);
  const clientePorPartner = new Map((clientes ?? []).map((c) => [c.odoo_partner_id, c.id]));

  const filas: { client_id: string; product_id: string; precio: number }[] = [];
  for (const p of partners.value as { id: number; property_product_pricelist: [number, string] | false }[]) {
    const clientId = clientePorPartner.get(p.id);
    if (!clientId || !p.property_product_pricelist) continue;
    for (const regla of porPricelist.get(p.property_product_pricelist[0]) ?? []) {
      const productId = porOdooId.get(regla.productoOdoo);
      if (productId) filas.push({ client_id: clientId, product_id: productId, precio: regla.precio });
    }
  }
  if (!filas.length) return 0;
  const { error } = await supabase.from("client_prices").upsert(filas, { onConflict: "client_id,product_id" });
  if (error) { errores.push(`Guardar precios: ${error.message}`); return 0; }
  return filas.length;
}
