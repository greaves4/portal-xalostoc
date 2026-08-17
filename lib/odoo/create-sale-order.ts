import { odooExecute } from "@/lib/odoo/client";

type SaleOrder = { folio: string; client: { odoo_partner_id: number | null }; items: { odoo_product_id: number | null; cantidad: number; precio_unit: number; nombre_snapshot: string }[] };

export async function createSaleOrder(order: SaleOrder) {
  if (!order.client.odoo_partner_id) return { ok: false, error: "Falta odoo_partner_id en el cliente." };
  const missing = order.items.find((item) => !item.odoo_product_id);
  if (missing) return { ok: false, error: `Falta odoo_product_id en la línea ${missing.nombre_snapshot}.` };
  const result = await odooExecute("sale.order", "create", [{ partner_id: order.client.odoo_partner_id, client_order_ref: order.folio, order_line: order.items.map((item) => [0, 0, { product_id: item.odoo_product_id, product_uom_qty: item.cantidad, price_unit: item.precio_unit, name: item.nombre_snapshot }]) }]);
  if (!result.ok || typeof result.value !== "number") return { ok: false, error: result.ok ? "Odoo no devolvió el ID del pedido." : result.error };
  const name = await odooExecute("sale.order", "read", [[result.value], ["name"]]);
  const saleName = name.ok && Array.isArray(name.value) ? String((name.value[0] as { name?: string })?.name ?? "") : undefined;
  return { ok: true, odoo_id: result.value, odoo_name: saleName };
}
