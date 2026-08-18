import { Box, ClipboardList, LogOut, Search, ShoppingCart } from "lucide-react";
import { getCatalog, getClientSummary } from "@/lib/catalog";
import { signOut } from "@/lib/actions/auth";
import { AddToCart } from "@/components/catalog/add-to-cart";

function Corners() { return <><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/></>; }

const money = (value: number) => `$${value.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export default async function CatalogoPage() {
  const [products, summary] = await Promise.all([getCatalog(), getClientSummary()]);
  const hoy = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  return <><nav className="nav"><span className="nav-brand">Telas Xalostoc</span><a className="nav-link active" href="/catalogo">Catálogo</a><a className="nav-link" href="/pedidos">Mis pedidos</a><span className="nav-divider"/><form action={signOut}><button className="btn btn-ghost" type="submit"><LogOut size={15} strokeWidth={1.5}/> Salir</button></form></nav>
      <main className="wrap main"><div className="dashboard-head"><div><span className="kicker">Cliente · {hoy}</span><h1>Catálogo</h1><p className="muted">{summary ? <>Precios asignados a <strong style={{ color: "var(--text)" }}>{summary.razonSocial}</strong></> : "Precios asignados a tu cuenta"}</p></div><div className="head-action"><a className="btn btn-secondary" href="/pedidos"><ClipboardList size={15} strokeWidth={1.5}/> Mis pedidos</a><a className="btn btn-primary blueprint" href="/carrito"><Corners/><ShoppingCart size={15} strokeWidth={1.5}/> Ver carrito</a></div></div>
      <div className="grid" style={{ marginBottom: 42 }}>
        <div className="card stat span-3 blueprint"><Corners/><span className="kicker">Productos activos</span><span className="number">{summary?.productosActivos ?? products.length}</span><span className="muted" style={{ fontSize: 12 }}>Disponibles para tu cuenta</span></div>
        <div className="card stat span-3 blueprint"><Corners/><span className="kicker">Pedidos en curso</span><span className="number">{String(summary?.pedidosEnCurso ?? 0).padStart(2, "0")}</span><span className="muted" style={{ fontSize: 12 }}>Enviados o en validación</span></div>
        <div className="card stat span-3 blueprint"><Corners/><span className="kicker">Crédito disponible</span><span className="number">{summary?.creditoDisponible != null ? money(summary.creditoDisponible) : "—"}</span><span className="muted" style={{ fontSize: 12 }}>{summary?.creditoDisponible != null ? "Referencia informativa" : "Sin límite registrado"}</span></div>
        <div className="card stat span-3 blueprint"><Corners/><span className="kicker">Cuenta</span><span className="number">{summary?.cuentaActiva === false ? "SUSPENDIDA" : "ACTIVA"}</span><span className="muted" style={{ fontSize: 12 }}>Cliente recurrente</span></div>
      </div>
      <section className="card blueprint"><Corners/><div style={{ display:"flex", justifyContent:"space-between", alignItems:"end", gap:16, marginBottom:18 }}><div><span className="kicker">02 · Lista de productos</span><h2 style={{ marginBottom:0 }}>Líneas disponibles</h2></div><div style={{ position:"relative", width:240 }}><Search size={15} strokeWidth={1.5} style={{ position:"absolute", left:10, top:11, color:"var(--muted)" }}/><input className="input" style={{ paddingLeft:32 }} placeholder="Buscar SKU o nombre"/></div></div><div className="table-wrap">{products.length ? <table className="table"><thead><tr><th>SKU</th><th>Producto</th><th>Unidad</th><th>Precio</th><th>Estado</th><th aria-label="Acción"/></tr></thead><tbody>{products.map((product) => <tr key={product.sku}><td style={{ fontFamily:"var(--heading)", fontWeight:600, color:"var(--accent-700)" }}>{product.sku}</td><td>{product.name}</td><td className="muted">{product.unit}</td><td style={{ fontFamily:"var(--heading)", fontSize:18 }}>{product.price}</td><td><span className="status">{product.state}</span></td><td><AddToCart productId={product.id}/></td></tr>)}</tbody></table> : <div style={{ padding:"24px 10px", color:"var(--muted)" }}>El catálogo aún no tiene productos activos. Carga el inventario desde el panel de administración.</div>}</div></section>
      <p className="muted" style={{ marginTop:22, fontSize:12 }}><Box size={13} style={{ verticalAlign:"-2px", marginRight:5 }} strokeWidth={1.5}/> Los precios mostrados son exclusivos de tu cuenta y pueden variar por unidad de venta.</p>
    </main></>;
}
