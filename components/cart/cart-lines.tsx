"use client";

import { Minus, Plus, Send, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { submitOrder } from "@/lib/actions/orders";
import type { CatalogItem } from "@/lib/catalog";

type Line = { productId: string; quantity: number };

const money = (value: number) => `$${value.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

export function CartLines({ products }: { products: CatalogItem[] }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    const guardadas = JSON.parse(localStorage.getItem("xalostoc-cart") ?? "[]") as Line[];
    // Un producto puede haberse desactivado desde que se agregó al carrito.
    setLines(guardadas.filter((line) => products.some((p) => p.id === line.productId)));
    setCargado(true);
  }, [products]);

  function update(productId: string, quantity: number) {
    const next = lines.map((line) => (line.productId === productId ? { ...line, quantity } : line)).filter((line) => line.quantity > 0);
    setLines(next);
    localStorage.setItem("xalostoc-cart", JSON.stringify(next));
  }

  const detalle = lines.flatMap((line) => {
    const producto = products.find((p) => p.id === line.productId);
    return producto ? [{ ...line, producto, importe: producto.precioNumero * line.quantity }] : [];
  });
  const total = detalle.reduce((suma, l) => suma + l.importe, 0);

  if (!cargado) return <div style={{ padding: 24 }} className="muted">Cargando carrito...</div>;

  if (!detalle.length) {
    return <div style={{ padding: 24 }}>
      <h2 style={{ fontSize: 27 }}>Tu carrito está vacío</h2>
      <p className="muted">Agrega productos del catálogo para preparar un pedido.</p>
      <a className="btn btn-primary" href="/catalogo">Explorar catálogo</a>
    </div>;
  }

  return <form action={submitOrder}>
    <input type="hidden" name="items" value={JSON.stringify(lines)} />
    <div className="table-wrap"><table className="table">
      <thead><tr><th>SKU</th><th>Producto</th><th>Unidad</th><th>Precio</th><th>Cantidad</th><th>Importe</th><th aria-label="Quitar" /></tr></thead>
      <tbody>{detalle.map((l) => <tr key={l.productId}>
        <td style={{ fontFamily: "var(--heading)", fontWeight: 600, color: "var(--accent-700)" }}>{l.producto.sku}</td>
        <td>{l.producto.name}</td>
        <td className="muted">{l.producto.unit}</td>
        <td>{l.producto.price}</td>
        <td><div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-secondary" type="button" onClick={() => update(l.productId, l.quantity - 1)} aria-label={`Reducir ${l.producto.name}`}><Minus size={13} /></button>
          <strong>{l.quantity}</strong>
          <button className="btn btn-secondary" type="button" onClick={() => update(l.productId, l.quantity + 1)} aria-label={`Aumentar ${l.producto.name}`}><Plus size={13} /></button>
        </div></td>
        <td style={{ fontFamily: "var(--heading)", fontSize: 18 }}>{money(l.importe)}</td>
        <td><button className="btn btn-ghost" type="button" onClick={() => update(l.productId, 0)} aria-label={`Eliminar ${l.producto.name}`}><Trash2 size={15} /></button></td>
      </tr>)}</tbody>
    </table></div>

    <p style={{ textAlign: "right", fontFamily: "var(--heading)", fontSize: 24, margin: "20px 0 0" }}>Total: {money(total)}</p>
    <p className="muted" style={{ textAlign: "right", fontSize: 12 }}>Los precios se vuelven a verificar en el servidor al enviar.</p>

    <div className="field" style={{ maxWidth: 560, marginTop: 24 }}>
      <label htmlFor="notes">Notas para el validador</label>
      <textarea className="input" id="notes" name="notes" placeholder="Fecha requerida, indicaciones de entrega..." />
    </div>
    <button className="btn btn-primary blueprint" type="submit" style={{ marginTop: 18 }}><Send size={15} strokeWidth={1.5} /> Enviar a validación</button>
  </form>;
}
