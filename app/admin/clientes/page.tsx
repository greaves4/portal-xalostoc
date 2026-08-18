import { KeyRound, MapPin, Pencil, Save, UserPlus } from "lucide-react";
import { createClientAccount, createClientUser, createShippingAddress, updateClient } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/logout-button";

const money = (value: unknown) => `$${Number(value ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`;

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ editar?: string }> }) {
  const { editar } = await searchParams;
  const supabase = await createClient();
  const [{ data: clients }, { data: direcciones }] = await Promise.all([
    supabase.from("clients").select("id, razon_social, rfc, contacto_email, contacto_tel, odoo_partner_id, activo, credito_limite, credito_usado, credito_liquidado").order("razon_social"),
    supabase.from("shipping_addresses").select("id, client_id, etiqueta, calle, ciudad, estado, cp, es_default"),
  ]);
  const enEdicion = editar ? (clients ?? []).find((c) => c.id === editar) : undefined;
  const disponible = (c: { credito_limite: number; credito_usado: number; credito_liquidado: number }) =>
    Number(c.credito_limite) - (Number(c.credito_usado) - Number(c.credito_liquidado));

  return <>
    <nav className="nav"><span className="nav-brand">Telas Xalostoc / Admin</span><a className="nav-link" href="/admin/productos">Productos</a><a className="nav-link active" href="/admin/clientes">Clientes</a><a className="nav-link" href="/admin/bandeja">Bandeja</a><a className="nav-link" href="/admin/sync">Sync Odoo</a><span className="nav-divider" /><LogoutButton /></nav>
    <main className="wrap main">
      <div className="dashboard-head"><div><span className="kicker">Administración / Cuentas</span><h1>Clientes</h1><p className="muted">Cuentas recurrentes, crédito y mapeos de Odoo.</p></div></div>
      <div className="grid">

        {enEdicion ? (
          <section className="card blueprint span-4"><i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            <span className="kicker">01 · Edición</span><h2 style={{ fontSize: 27 }}>{enEdicion.razon_social}</h2>
            <form action={updateClient} className="login-form">
              <input type="hidden" name="id" value={enEdicion.id} />
              <div className="field"><label htmlFor="razon_social">Razón social</label><input className="input" id="razon_social" name="razon_social" defaultValue={enEdicion.razon_social} required /></div>
              <div className="field"><label htmlFor="rfc">RFC</label><input className="input" id="rfc" name="rfc" defaultValue={enEdicion.rfc ?? ""} /></div>
              <div className="field"><label htmlFor="contacto_email">Correo de contacto</label><input className="input" id="contacto_email" name="contacto_email" type="email" defaultValue={enEdicion.contacto_email ?? ""} /></div>
              <div className="field"><label htmlFor="contacto_tel">Teléfono</label><input className="input" id="contacto_tel" name="contacto_tel" defaultValue={enEdicion.contacto_tel ?? ""} /></div>
              <div className="field"><label htmlFor="odoo_partner_id">ID partner Odoo</label><input className="input" id="odoo_partner_id" name="odoo_partner_id" type="number" min="1" defaultValue={enEdicion.odoo_partner_id ?? ""} /></div>
              <hr className="hr" />
              <div className="field"><label htmlFor="credito_limite">Límite de crédito</label><input className="input" id="credito_limite" name="credito_limite" type="number" min="0" step="0.01" defaultValue={Number(enEdicion.credito_limite)} /></div>
              <div className="field">
                <label htmlFor="credito_liquidado">Pagos registrados</label>
                <input className="input" id="credito_liquidado" name="credito_liquidado" type="number" min="0" step="0.01" defaultValue={Number(enEdicion.credito_liquidado)} />
                <span className="muted" style={{ fontSize: 12 }}>Comprometido hoy: {money(enEdicion.credito_usado)} · lo calcula el sistema con los pedidos, no se edita.</span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" name="activo" defaultChecked={Boolean(enEdicion.activo)} /> Cuenta activa</label>
              <button className="btn btn-primary blueprint" type="submit"><Save size={15} strokeWidth={1.5} /> Guardar cambios</button>
              <a className="btn btn-ghost" href="/admin/clientes">Cancelar</a>
            </form>
          </section>
        ) : (
          <section className="card blueprint span-4"><i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
            <span className="kicker">01 · Nueva cuenta</span><h2 style={{ fontSize: 27 }}>Agregar cliente</h2>
            <form action={createClientAccount} className="login-form">
              <div className="field"><label htmlFor="razon_social">Razón social</label><input className="input" id="razon_social" name="razon_social" placeholder="Confecciones del Centro, S.A." required /></div>
              <div className="field"><label htmlFor="rfc">RFC</label><input className="input" id="rfc" name="rfc" placeholder="CCE010101ABC" /></div>
              <div className="field"><label htmlFor="contacto_email">Correo de contacto</label><input className="input" id="contacto_email" name="contacto_email" type="email" placeholder="compras@empresa.com" required /></div>
              <div className="field"><label htmlFor="odoo_partner_id">ID partner Odoo <span className="muted">(opcional)</span></label><input className="input" id="odoo_partner_id" name="odoo_partner_id" type="number" min="1" placeholder="Se crea solo al sincronizar" /></div>
              <button className="btn btn-primary blueprint" type="submit"><UserPlus size={15} strokeWidth={1.5} /> Guardar cliente</button>
            </form>
            <p className="muted" style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}>El crédito se asigna después, desde «Editar» en el directorio.</p>
          </section>
        )}

        <section className="card blueprint span-4"><i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
          <span className="kicker">02 · Acceso portal</span><h2 style={{ fontSize: 27 }}>Crear usuario</h2>
          <form action={createClientUser} className="login-form">
            <div className="field"><label htmlFor="client_id">Cliente</label><select className="input" id="client_id" name="client_id" required defaultValue=""><option value="" disabled>Selecciona una cuenta</option>{(clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.razon_social}</option>)}</select></div>
            <div className="field"><label htmlFor="user_email">Correo de acceso</label><input className="input" id="user_email" name="user_email" type="email" placeholder="compras@empresa.com" required /></div>
            <div className="field"><label htmlFor="user_password">Contraseña temporal</label><input className="input" id="user_password" name="user_password" type="password" minLength={8} placeholder="Mínimo 8 caracteres" required /></div>
            <button className="btn btn-primary blueprint" type="submit"><KeyRound size={15} strokeWidth={1.5} /> Crear acceso</button>
          </form>
          <hr className="hr" />
          <span className="kicker">03 · Entregas</span>
          <form action={createShippingAddress} className="login-form">
            <div className="field"><label htmlFor="addr_client_id">Cliente</label><select className="input" id="addr_client_id" name="addr_client_id" required defaultValue=""><option value="" disabled>Selecciona una cuenta</option>{(clients ?? []).map((client) => <option key={client.id} value={client.id}>{client.razon_social}</option>)}</select></div>
            <div className="field"><label htmlFor="etiqueta">Etiqueta</label><input className="input" id="etiqueta" name="etiqueta" placeholder="Matriz, Sucursal Norte..." /></div>
            <div className="field"><label htmlFor="calle">Calle y número</label><input className="input" id="calle" name="calle" required /></div>
            <div className="field"><label htmlFor="ciudad">Ciudad</label><input className="input" id="ciudad" name="ciudad" /></div>
            <div className="field"><label htmlFor="estado_dir">Estado</label><input className="input" id="estado_dir" name="estado_dir" /></div>
            <div className="field"><label htmlFor="cp">Código postal</label><input className="input" id="cp" name="cp" inputMode="numeric" /></div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}><input type="checkbox" name="es_default" /> Usar como predeterminada</label>
            <button className="btn btn-secondary" type="submit"><MapPin size={15} strokeWidth={1.5} /> Guardar dirección</button>
          </form>
        </section>

        <section className="card blueprint span-4"><i className="corner tl" /><i className="corner tr" /><i className="corner bl" /><i className="corner br" />
          <span className="kicker">04 · Directorio</span><h2 style={{ fontSize: 27 }}>Clientes registrados</h2>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Razón social</th><th>Crédito</th><th>Odoo</th><th>Estado</th><th aria-label="Editar" /></tr></thead>
            <tbody>{(clients ?? []).map((client) => <tr key={client.id}>
              <td>{client.razon_social}<div className="muted" style={{ fontSize: 12 }}>{client.contacto_email || "sin correo"}</div></td>
              <td>{Number(client.credito_limite) > 0
                ? <>{money(disponible(client))} <span className="muted" style={{ fontSize: 12 }}>de {money(client.credito_limite)}</span></>
                : <span className="muted">sin límite</span>}
                <div className="muted" style={{ fontSize: 12 }}>comprometido {money(client.credito_usado)}{Number(client.credito_liquidado) > 0 && <> · pagado {money(client.credito_liquidado)}</>}</div>
              </td>
              <td className="muted">{client.odoo_partner_id ?? "-"}</td>
              <td><span className="status">{client.activo ? "Activo" : "Inactivo"}</span></td>
              <td><a className="btn btn-ghost" href={`/admin/clientes?editar=${client.id}`}><Pencil size={13} strokeWidth={1.5} /> Editar</a></td>
            </tr>)}</tbody>
          </table>{!clients?.length && <p className="muted" style={{ padding: 20 }}>No hay clientes registrados.</p>}</div>
          <hr className="hr" />
          <span className="kicker">Direcciones cargadas</span>
          <div className="table-wrap"><table className="table">
            <tbody>{(direcciones ?? []).map((d) => <tr key={d.id}>
              <td className="muted">{(clients ?? []).find((c) => c.id === d.client_id)?.razon_social ?? "-"}</td>
              <td>{[d.etiqueta, d.calle, d.ciudad, d.estado, d.cp].filter(Boolean).join(" · ")}{d.es_default && <span className="status" style={{ marginLeft: 6 }}>default</span>}</td>
            </tr>)}</tbody>
          </table>{!direcciones?.length && <p className="muted" style={{ padding: 16 }}>Aún no hay direcciones cargadas.</p>}</div>
        </section>

      </div>
    </main>
  </>;
}
