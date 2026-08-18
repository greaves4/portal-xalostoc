import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) notFound();
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders").select("id, folio, status, subtotal, notas_cliente, created_at, order_items(nombre_snapshot, sku_snapshot, unidad, cantidad, precio_unit, importe)").eq("id", id).maybeSingle();
  if (!order) notFound();
  return <main className="wrap main"><a className="btn btn-ghost" href="/pedidos">← Mis pedidos</a><div className="dashboard-head" style={{ marginTop:30 }}><div><span className="kicker">Detalle / {order.folio}</span><h1>{order.folio}</h1><p className="muted">Enviado el {new Date(order.created_at).toLocaleDateString("es-MX")}</p></div><span className="status">{order.status}</span></div><section className="card blueprint"><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/><table className="table"><thead><tr><th>SKU</th><th>Producto</th><th>Unidad</th><th>Cantidad</th><th>Precio</th><th>Importe</th></tr></thead><tbody>{(order.order_items ?? []).map((item) => <tr key={item.sku_snapshot}><td>{item.sku_snapshot}</td><td>{item.nombre_snapshot}</td><td className="muted">{item.unidad === "metraje" ? "Metraje" : "Pieza"}</td><td>{item.cantidad}</td><td>${Number(item.precio_unit).toFixed(2)}</td><td>${Number(item.importe).toFixed(2)}</td></tr>)}</tbody></table><p style={{ textAlign:"right", fontFamily:"var(--heading)", fontSize:24, margin:"20px 0 0" }}>Total: ${Number(order.subtotal).toFixed(2)}</p></section></main>;
}
