"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toggleProduct } from "@/lib/actions/admin";

type Producto = { id: string; sku: string; nombre: string; precio_base: number; activo: boolean | null; unidad: string; odoo_product_id: number | null };

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

export function ProductList({ products }: { products: Producto[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [soloInactivos, setSoloInactivos] = useState(false);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return products.filter((p) => {
      if (soloInactivos && p.activo) return false;
      if (!q) return true;
      return p.sku.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q);
    });
  }, [products, busqueda, soloInactivos]);

  const inactivos = products.filter((p) => !p.activo).length;

  return <>
    <div className="section-search" style={{ width: "100%", marginBottom: 12 }}>
      <Search size={15} strokeWidth={1.5} />
      <input className="input" placeholder="Buscar SKU o nombre"
        value={busqueda} onChange={(e) => setBusqueda(e.target.value)} aria-label="Buscar en el catálogo maestro" />
    </div>

    {inactivos > 0 && (
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 14 }}>
        <input type="checkbox" checked={soloInactivos} onChange={(e) => setSoloInactivos(e.target.checked)} />
        Ver solo los {inactivos} inactivos
      </label>
    )}

    <div className="table-wrap"><table className="table">
      <thead><tr><th>SKU</th><th>Nombre</th><th>Unidad</th><th>Precio</th><th>Estado</th></tr></thead>
      <tbody>{visibles.map((product) => <tr key={product.id}>
        <td data-label="SKU" style={{ color: "var(--accent-700)", fontWeight: 600 }}>{product.sku}</td>
        <td data-label="Nombre">{product.nombre}</td>
        <td data-label="Unidad" className="muted">{product.unidad === "metraje" ? "Metraje" : "Pieza"}</td>
        <td data-label="Precio">{money(product.precio_base)}</td>
        <td data-label="Estado"><form action={toggleProduct}>
          <input type="hidden" name="id" value={product.id} />
          <input type="hidden" name="activo" value={String(product.activo)} />
          <button className="status" type="submit" style={{ border: 0, cursor: "pointer" }}>{product.activo ? "Activo" : "Inactivo"}</button>
        </form></td>
      </tr>)}</tbody>
    </table></div>

    {!visibles.length && <p className="muted" style={{ padding: 20 }}>
      {products.length
        ? <>Ningún producto coincide con <strong style={{ color: "var(--text)" }}>{busqueda}</strong>.</>
        : "No hay productos registrados."}
    </p>}

    {Boolean(visibles.length) && (busqueda || soloInactivos) && (
      <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>{visibles.length} de {products.length} productos</p>
    )}
  </>;
}
