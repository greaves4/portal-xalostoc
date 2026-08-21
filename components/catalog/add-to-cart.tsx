"use client";

import { Check, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { UNIDADES, normalizarCantidad, type Unidad } from "@/lib/unidades";

type Linea = { productId: string; quantity: number };

export function AddToCart({ productId, unidad, nombre }: { productId: string; unidad: Unidad; nombre: string }) {
  const u = UNIDADES[unidad];
  const [cantidad, setCantidad] = useState(String(u.minimo === 0.5 ? 1 : u.minimo));
  const [agregado, setAgregado] = useState(false);

  const valor = normalizarCantidad(Number(cantidad.replace(",", ".")), unidad);
  const valido = valor > 0;

  function agregar() {
    if (!valido) return;
    const actual = JSON.parse(localStorage.getItem("xalostoc-cart") ?? "[]") as Linea[];
    const existente = actual.find((item) => item.productId === productId);
    if (existente) existente.quantity = normalizarCantidad(existente.quantity + valor, unidad);
    else actual.push({ productId, quantity: valor });
    localStorage.setItem("xalostoc-cart", JSON.stringify(actual));
    window.dispatchEvent(new Event("xalostoc-cart-change"));
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  }

  return <div className="add-to-cart">
    <div className="add-to-cart-qty">
      <input
        className="input" type="number" inputMode={u.decimales ? "decimal" : "numeric"}
        min={u.minimo} step={u.paso} value={cantidad}
        onChange={(e) => setCantidad(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); agregar(); } }}
        aria-label={`Cantidad de ${nombre} en ${u.sustantivo}`}
      />
      <span className="add-to-cart-unit">{u.sustantivo}</span>
    </div>
    <button className="btn btn-secondary" type="button" onClick={agregar} disabled={!valido}>
      {agregado ? <><Check size={13} strokeWidth={1.5} /> Agregado</> : <><ShoppingCart size={13} strokeWidth={1.5} /> Agregar</>}
    </button>
  </div>;
}
