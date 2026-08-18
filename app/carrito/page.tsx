import { ArrowLeft } from "lucide-react";
import { getCatalog, getShippingAddresses } from "@/lib/catalog";
import { CartLines } from "@/components/cart/cart-lines";

export default async function CartPage() {
  // El carrito vive en localStorage (solo id + cantidad); el nombre, la unidad y el
  // precio se resuelven aqui, en el servidor, con los precios que aplican al cliente.
  const [products, addresses] = await Promise.all([getCatalog(), getShippingAddresses()]);
  return <>
    <nav className="nav"><a className="nav-brand" href="/catalogo">Telas Xalostoc</a><a className="nav-link" href="/catalogo">Catálogo</a><a className="nav-link active" href="/carrito">Carrito</a><a className="nav-link" href="/pedidos">Mis pedidos</a></nav>
    <main className="wrap main">
      <a href="/catalogo" className="btn btn-ghost"><ArrowLeft size={15} strokeWidth={1.5} /> Volver al catálogo</a>
      <div className="dashboard-head" style={{ marginTop: 30 }}><div><span className="kicker">03 · Confirmación</span><h1>Carrito</h1><p className="muted">Revisaremos precios y disponibilidad nuevamente al enviar.</p></div></div>
      <section className="card blueprint">
        <i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
        <CartLines products={products} addresses={addresses} />
      </section>
    </main>
  </>;
}
