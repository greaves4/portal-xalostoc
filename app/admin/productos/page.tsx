import { FileUp, PackagePlus, Tags } from "lucide-react";
import { ProductList } from "@/components/admin/product-list";
import { AdminNav } from "@/components/app-nav";
import { assignClientPrice, createProduct, importProductsCsv } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/server";

export default async function ProductsPage() {
  const supabase = await createClient();
  const [{ data: products }, { data: clients }] = await Promise.all([
    supabase.from("products").select("id, sku, nombre, unidad, precio_base, activo, odoo_product_id").order("sku"),
    supabase.from("clients").select("id, razon_social").eq("activo", true).order("razon_social"),
  ]);
  return <>
    <AdminNav activo="/admin/productos"/>
    <main className="wrap main"><div className="dashboard-head"><div><span className="kicker">Administración / Catálogo</span><h1>Productos</h1><p className="muted">Alta, importación y precios por cuenta.</p></div></div>
      <div className="grid">
        <section className="card blueprint span-4"><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/><span className="kicker">01 · Nuevo registro</span><h2 style={{ fontSize:27 }}>Agregar producto</h2><form action={createProduct} className="login-form"><div className="field"><label htmlFor="sku">SKU</label><input className="input" id="sku" name="sku" placeholder="TX-2048" required /></div><div className="field"><label htmlFor="nombre">Nombre</label><input className="input" id="nombre" name="nombre" placeholder="Loneta industrial" required /></div><div className="field"><label htmlFor="unidad">Unidad de venta</label><select className="input" id="unidad" name="unidad" defaultValue="pieza"><option value="pieza">Pieza</option><option value="metraje">Metraje</option></select></div><div className="field"><label htmlFor="precio_base">Precio base</label><input className="input" id="precio_base" name="precio_base" type="number" min="0" step="0.01" placeholder="0.00" required /></div><button className="btn btn-primary blueprint" type="submit"><PackagePlus size={15} strokeWidth={1.5}/> Guardar producto</button></form></section>
        <section className="card blueprint span-4"><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/><span className="kicker">02 · Importación</span><h2 style={{ fontSize:27 }}>Cargar CSV</h2><p className="muted" style={{ fontSize:13 }}>Columnas: <code>sku,nombre,unidad,precio_base,odoo_product_id</code>.</p><form action={importProductsCsv} className="login-form"><div className="field"><label htmlFor="csv">Archivo CSV</label><input className="input" id="csv" name="csv" type="file" accept=".csv,text/csv" required /></div><button className="btn btn-secondary" type="submit"><FileUp size={15} strokeWidth={1.5}/> Importar por SKU</button></form><hr className="hr"/><span className="kicker">03 · Precio especial</span><form action={assignClientPrice} className="login-form"><div className="field"><label htmlFor="price_client_id">Cliente</label><select className="input" id="price_client_id" name="price_client_id" required defaultValue=""><option value="" disabled>Selecciona</option>{(clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.razon_social}</option>)}</select></div><div className="field"><label htmlFor="price_product_id">Producto</label><select className="input" id="price_product_id" name="price_product_id" required defaultValue=""><option value="" disabled>Selecciona</option>{(products ?? []).map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.nombre}</option>)}</select></div><div className="field"><label htmlFor="price">Precio para cliente</label><input className="input" id="price" name="price" type="number" min="0" step="0.01" required /></div><button className="btn btn-secondary" type="submit"><Tags size={15} strokeWidth={1.5}/> Guardar precio</button></form></section>
        <section className="card blueprint span-4"><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/><span className="kicker">04 · Registros activos</span><h2 style={{ fontSize:27 }}>Catálogo maestro</h2><ProductList products={(products ?? []) as never}/></section>
      </div>
    </main>
  </>;
}
