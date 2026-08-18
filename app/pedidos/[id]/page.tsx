import { notFound } from "next/navigation";
import { AlertCircle, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { etiquetaCliente } from "@/lib/order-status";
import { LimpiarCarrito } from "@/components/cart/limpiar-carrito";

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ enviado?: string }> }) {
  const { id } = await params;
  const { enviado } = await searchParams;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) notFound();
  const supabase = await createClient();
  const { data: order } = await supabase.from("orders")
    .select("id, folio, status, subtotal, notas_cliente, motivo_rechazo, created_at, shipping_addresses(etiqueta, calle, ciudad, estado, cp), order_items(nombre_snapshot, sku_snapshot, unidad, cantidad, precio_unit, importe)")
    .eq("id", id).maybeSingle();
  if (!order) notFound();
  const direccion = Array.isArray(order.shipping_addresses) ? order.shipping_addresses[0] : order.shipping_addresses;

  return <main className="wrap main">
    {enviado === "1" && <LimpiarCarrito />}
    <a className="btn btn-ghost" href="/pedidos">← Mis pedidos</a>
    <div className="dashboard-head" style={{ marginTop: 30 }}>
      <div><span className="kicker">Detalle / {order.folio}</span><h1>{order.folio}</h1><p className="muted">Enviado el {new Date(order.created_at).toLocaleDateString("es-MX")}</p></div>
      <span className="status">{etiquetaCliente(order.status)}</span>
    </div>

    {order.status === "rechazado" && (
      <section className="card blueprint" style={{ marginBottom: 24, borderColor: "var(--accent-700)" }}>
        <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
        <span className="kicker" style={{ color: "var(--accent-700)" }}><AlertCircle size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} strokeWidth={1.5} /> Pedido rechazado</span>
        <p style={{ margin: 0 }}>{order.motivo_rechazo || "El validador no registró un motivo."}</p>
        <p className="muted" style={{ fontSize: 13, marginTop: 8, marginBottom: 0 }}>Corrige lo indicado y levanta un pedido nuevo desde el catálogo.</p>
      </section>
    )}

    <section className="card blueprint">
      <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
      <div className="table-wrap"><table className="table">
        <thead><tr><th>SKU</th><th>Producto</th><th>Unidad</th><th>Cantidad</th><th>Precio</th><th>Importe</th></tr></thead>
        <tbody>{(order.order_items ?? []).map((item) => <tr key={item.sku_snapshot}>
          <td style={{ fontFamily: "var(--heading)", fontWeight: 600, color: "var(--accent-700)" }}>{item.sku_snapshot}</td>
          <td>{item.nombre_snapshot}</td>
          <td className="muted">{item.unidad === "metraje" ? "Metraje" : "Pieza"}</td>
          <td>{item.cantidad}</td>
          <td>{money(item.precio_unit)}</td>
          <td>{money(item.importe)}</td>
        </tr>)}</tbody>
      </table></div>
      <p style={{ textAlign: "right", fontFamily: "var(--heading)", fontSize: 24, margin: "20px 0 0" }}>Total: {money(order.subtotal)}</p>
      {direccion && <p className="muted" style={{ marginTop: 14, marginBottom: 0, fontSize: 13 }}>
        <MapPin size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} strokeWidth={1.5} />
        Entrega en {direccion.etiqueta ? `${direccion.etiqueta}: ` : ""}{[direccion.calle, direccion.ciudad, direccion.estado, direccion.cp].filter(Boolean).join(", ")}
      </p>}
      {order.notas_cliente && <p className="muted" style={{ borderTop: "1px solid var(--divider)", paddingTop: 14, marginTop: 14, marginBottom: 0, fontSize: 13 }}>Nota: {order.notas_cliente}</p>}
    </section>
  </main>;
}
