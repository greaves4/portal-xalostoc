import { ClipboardList } from "lucide-react";
import { PortalNav } from "@/components/app-nav";
import { createClient } from "@/lib/supabase/server";
import { etiquetaCliente } from "@/lib/order-status";

export default async function OrdersPage() {
  let orders: { id: string; folio: string; status: string; subtotal: number; created_at: string; motivo_rechazo: string | null }[] = [];
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = user ? await supabase.from("profiles").select("client_id").eq("id", user.id).maybeSingle() : { data: null };
    const result = profile?.client_id ? await supabase.from("orders").select("id, folio, status, subtotal, created_at, motivo_rechazo").eq("client_id", profile.client_id).order("created_at", { ascending: false }) : { data: [] };
    orders = (result.data ?? []) as typeof orders;
  }
  return <><PortalNav activo="/pedidos"/><main className="wrap main"><span className="kicker">Cliente / Historial</span><h1>Mis pedidos</h1><p className="muted">Seguimiento de solicitudes enviadas a validación.</p><section className="card blueprint" style={{ marginTop:36 }}><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/><div className="table-wrap"><table className="table"><thead><tr><th>Folio</th><th>Fecha</th><th>Subtotal</th><th>Estado</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td data-label="Folio"><a href={`/pedidos/${order.id}`} style={{ color:"var(--accent-700)", fontWeight:600 }}>{order.folio}</a></td><td data-label="Fecha">{new Date(order.created_at).toLocaleDateString("es-MX")}</td><td data-label="Subtotal">${Number(order.subtotal).toFixed(2)}</td><td data-label="Estado"><span className="status">{etiquetaCliente(order.status)}</span>{order.status === "rechazado" && order.motivo_rechazo && <div className="muted" style={{ fontSize:12, marginTop:4, maxWidth:320 }}>{order.motivo_rechazo}</div>}</td></tr>)}</tbody></table>{!orders.length && <div style={{ padding:24 }}><ClipboardList size={20} strokeWidth={1.5}/><p className="muted" style={{ marginTop:8 }}>Todavía no tienes pedidos enviados.</p></div>}</div></section></main></>;
}
