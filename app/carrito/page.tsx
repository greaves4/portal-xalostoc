"use client";

import { ArrowLeft, Minus, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { submitOrder } from "@/lib/actions/orders";

type Line = { productId: string; quantity: number };

export default function CartPage() {
  const [lines, setLines] = useState<Line[]>([]);
  useEffect(() => setLines(JSON.parse(localStorage.getItem("xalostoc-cart") ?? "[]")), []);
  function update(productId: string, quantity: number) {
    const next = lines.map((line) => line.productId === productId ? { ...line, quantity } : line).filter((line) => line.quantity > 0);
    setLines(next); localStorage.setItem("xalostoc-cart", JSON.stringify(next));
  }
  const serialized = JSON.stringify(lines);
  return <><nav className="nav"><a className="nav-brand" href="/catalogo">Telas Xalostoc</a><a className="nav-link" href="/catalogo">Catálogo</a><a className="nav-link active" href="/carrito">Carrito</a><a className="nav-link" href="/pedidos">Mis pedidos</a></nav><main className="wrap main"><a href="/catalogo" className="btn btn-ghost"><ArrowLeft size={15} strokeWidth={1.5}/> Volver al catálogo</a><div className="dashboard-head" style={{ marginTop:30 }}><div><span className="kicker">03 · Confirmación</span><h1>Carrito</h1><p className="muted">Revisaremos precios y disponibilidad nuevamente al enviar.</p></div></div><section className="card blueprint"><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/>{lines.length ? <form action={submitOrder}><input type="hidden" name="items" value={serialized}/><div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Cantidad</th><th/></tr></thead><tbody>{lines.map((line) => <tr key={line.productId}><td style={{ fontFamily:"var(--heading)", fontSize:18 }}>{line.productId}</td><td><div style={{ display:"flex", alignItems:"center", gap:8 }}><button className="btn btn-secondary" type="button" onClick={() => update(line.productId, line.quantity - 1)} aria-label="Reducir"><Minus size={13}/></button><strong>{line.quantity}</strong><button className="btn btn-secondary" type="button" onClick={() => update(line.productId, line.quantity + 1)} aria-label="Aumentar"><Plus size={13}/></button></div></td><td><button className="btn btn-ghost" type="button" onClick={() => update(line.productId, 0)} aria-label="Eliminar"><Trash2 size={15}/></button></td></tr>)}</tbody></table></div><div className="field" style={{ maxWidth:560, marginTop:24 }}><label htmlFor="notes">Notas para el validador</label><textarea className="input" id="notes" name="notes" placeholder="Fecha requerida, indicaciones de entrega..."/></div><button className="btn btn-primary blueprint" type="submit" style={{ marginTop:18 }}><Send size={15} strokeWidth={1.5}/> Enviar a validación</button></form> : <div style={{ padding:24 }}><h2 style={{ fontSize:27 }}>Tu carrito está vacío</h2><p className="muted">Agrega productos del catálogo para preparar un pedido.</p><a className="btn btn-primary" href="/catalogo">Explorar catálogo</a></div>}</section></main></>;
}
