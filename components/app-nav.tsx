import { LogoutButton } from "@/components/logout-button";

type Enlace = { href: string; label: string };

const CLIENTE: Enlace[] = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/carrito", label: "Carrito" },
  { href: "/pedidos", label: "Mis pedidos" },
];

const STAFF: Enlace[] = [
  { href: "/admin/bandeja", label: "Bandeja" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/sync", label: "Sync Odoo" },
];

// En movil los enlaces bajan a su propia fila y se desplazan en horizontal.
// Antes se ocultaban con display:none, que dejaba el portal sin navegacion.
function Nav({ marca, marcaHref, enlaces, activo }: { marca: string; marcaHref: string; enlaces: Enlace[]; activo: string }) {
  return <nav className="nav">
    <a className="nav-brand" href={marcaHref}>{marca}</a>
    <div className="nav-actions"><LogoutButton /></div>
    <div className="nav-links">
      {enlaces.map((e) => (
        <a key={e.href} className={`nav-link${activo === e.href ? " active" : ""}`} href={e.href} aria-current={activo === e.href ? "page" : undefined}>{e.label}</a>
      ))}
    </div>
  </nav>;
}

export function PortalNav({ activo }: { activo: string }) {
  return <Nav marca="Telas Xalostoc" marcaHref="/catalogo" enlaces={CLIENTE} activo={activo} />;
}

export function AdminNav({ activo }: { activo: string }) {
  return <Nav marca="Telas Xalostoc / Operaciones" marcaHref="/admin/bandeja" enlaces={STAFF} activo={activo} />;
}
