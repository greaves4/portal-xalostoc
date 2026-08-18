import { Box, ClipboardList, ShoppingCart } from "lucide-react";
import { getCatalog, getClientSummary } from "@/lib/catalog";
import { LogoutButton } from "@/components/logout-button";
import { ProductTable } from "@/components/catalog/product-table";

function Corners() { return <><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/></>; }

const money = (value: number) => `$${value.toLocaleString("es-MX", { maximumFractionDigits: 0 })}`;

export default async function CatalogoPage() {
  const [products, summary] = await Promise.all([getCatalog(), getClientSummary()]);
  const hoy = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  return <><nav className="nav"><span className="nav-brand">Telas Xalostoc</span><a className="nav-link active" href="/catalogo">Catálogo</a><a className="nav-link" href="/pedidos">Mis pedidos</a><span className="nav-divider"/><LogoutButton/></nav>
      <main className="wrap main"><div className="dashboard-head"><div><span className="kicker">Cliente · {hoy}</span><h1>Catálogo</h1><p className="muted">{summary ? <>Precios asignados a <strong style={{ color: "var(--text)" }}>{summary.razonSocial}</strong></> : "Precios asignados a tu cuenta"}</p></div><div className="head-action"><a className="btn btn-secondary" href="/pedidos"><ClipboardList size={15} strokeWidth={1.5}/> Mis pedidos</a><a className="btn btn-primary blueprint" href="/carrito"><Corners/><ShoppingCart size={15} strokeWidth={1.5}/> Ver carrito</a></div></div>
      <div className="grid" style={{ marginBottom: 42 }}>
        <div className="card stat span-3 blueprint"><Corners/><span className="kicker">Productos activos</span><span className="number">{summary?.productosActivos ?? products.length}</span><span className="muted" style={{ fontSize: 12 }}>Disponibles para tu cuenta</span></div>
        <div className="card stat span-3 blueprint"><Corners/><span className="kicker">Pedidos en curso</span><span className="number">{String(summary?.pedidosEnCurso ?? 0).padStart(2, "0")}</span><span className="muted" style={{ fontSize: 12 }}>Enviados o en validación</span></div>
        <div className="card stat span-3 blueprint"><Corners/><span className="kicker">Crédito disponible</span><span className="number">{summary?.creditoDisponible != null ? money(summary.creditoDisponible) : "—"}</span><span className="muted" style={{ fontSize: 12 }}>{summary?.creditoDisponible != null ? "Referencia informativa" : "Sin límite registrado"}</span></div>
        <div className="card stat span-3 blueprint"><Corners/><span className="kicker">Cuenta</span><span className="number">{summary?.cuentaActiva === false ? "SUSPENDIDA" : "ACTIVA"}</span><span className="muted" style={{ fontSize: 12 }}>Cliente recurrente</span></div>
      </div>
      <section className="card blueprint"><Corners/><ProductTable products={products}/></section>
      <p className="muted" style={{ marginTop:22, fontSize:12 }}><Box size={13} style={{ verticalAlign:"-2px", marginRight:5 }} strokeWidth={1.5}/> Los precios mostrados son exclusivos de tu cuenta y pueden variar por unidad de venta.</p>
    </main></>;
}
