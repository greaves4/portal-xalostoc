"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AddToCart } from "@/components/catalog/add-to-cart";
import type { CatalogItem } from "@/lib/catalog";

export function ProductTable({ products }: { products: CatalogItem[] }) {
  const [busqueda, setBusqueda] = useState("");

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return products;
    // Se busca por SKU y por nombre: el cliente llega con cualquiera de los dos.
    return products.filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
  }, [products, busqueda]);

  return <>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, marginBottom: 18 }}>
      <div>
        <span className="kicker">02 · Lista de productos</span>
        <h2 style={{ marginBottom: 0 }}>Líneas disponibles</h2>
      </div>
      <div style={{ position: "relative", width: 240 }}>
        <Search size={15} strokeWidth={1.5} style={{ position: "absolute", left: 10, top: 11, color: "var(--muted)" }} />
        <input className="input" style={{ paddingLeft: 32 }} placeholder="Buscar SKU o nombre"
          value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar en el catálogo" />
      </div>
    </div>

    <div className="table-wrap">
      {visibles.length ? <table className="table">
        <thead><tr><th>SKU</th><th>Producto</th><th>Unidad</th><th>Precio</th><th>Estado</th><th aria-label="Acción" /></tr></thead>
        <tbody>{visibles.map((product) => <tr key={product.sku}>
          <td data-label="SKU" style={{ fontFamily: "var(--heading)", fontWeight: 600, color: "var(--accent-700)" }}>{product.sku}</td>
          <td data-label="Producto">{product.name}</td>
          <td data-label="Unidad" className="muted">{product.unit}</td>
          <td data-label="Precio" style={{ fontFamily: "var(--heading)", fontSize: 18 }}>{product.price}</td>
          <td data-label="Estado"><span className="status">{product.state}</span></td>
          <td><AddToCart productId={product.id} /></td>
        </tr>)}</tbody>
      </table> : <div style={{ padding: "24px 10px", color: "var(--muted)" }}>
        {products.length
          ? <>Ningún producto coincide con <strong style={{ color: "var(--text)" }}>{busqueda}</strong>.</>
          : "El catálogo aún no tiene productos activos. Carga el inventario desde el panel de administración."}
      </div>}
    </div>

    {busqueda && visibles.length > 0 && (
      <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>{visibles.length} de {products.length} productos</p>
    )}
  </>;
}
