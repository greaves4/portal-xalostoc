"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const form = new FormData(event.currentTarget);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      if (form.get("email") === "demo@xalostoc.local" && form.get("password") === "xalostoc-demo") {
        await fetch("/api/demo-login", { method: "POST" });
        window.location.assign("/catalogo");
      } else setError("Demo local: usa demo@xalostoc.local y xalostoc-demo.");
      setLoading(false);
      return;
    }
    try {
      const { error: authError } = await createClient().auth.signInWithPassword({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      if (authError) setError("No pudimos validar tus credenciales.");
      else window.location.assign("/catalogo");
    } catch { setError("El servicio de acceso aún no está configurado."); }
    finally { setLoading(false); }
  }
  return <main className="login-page">
    <section className="login-visual">
      <div className="login-mark">Xalostoc / Portal</div>
      <div><span className="eyebrow" style={{ color: "#b5d9fd" }}>Acceso de clientes</span><h1>Tu pedido. Bajo control.</h1><p>Catálogo, precios y seguimiento en un solo punto de operación.</p></div>
      <div className="login-spec"><span>PL-01</span><span>REV 01</span><span>2026</span></div>
    </section>
    <section className="login-panel"><div className="login-box">
      <span className="kicker">01 · Identificación</span><h2>Entrar al portal</h2><p className="intro">Usa las credenciales de tu cuenta recurrente.</p>
      <form className="login-form" onSubmit={submit}>
        <div className="field"><label htmlFor="email">Correo electrónico</label><input className="input" id="email" name="email" type="email" placeholder="contacto@empresa.com" required /></div>
        <div className="field"><label htmlFor="password">Contraseña</label><input className="input" id="password" name="password" type="password" placeholder="••••••••" required /></div>
        {error && <p role="alert" style={{ margin: 0, color: "var(--accent-700)", fontSize: 13 }}>{error}</p>}
        <button className="btn btn-primary blueprint" type="submit" disabled={loading}><i className="corner tl"/><i className="corner tr"/><i className="corner bl"/><i className="corner br"/>{loading ? "Validando..." : "Continuar"} <ArrowRight size={15} strokeWidth={1.5}/></button>
      </form>
      <p className="muted" style={{ marginTop: 24, fontSize: 12 }}><LockKeyhole size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} strokeWidth={1.5}/> Acceso privado para clientes autorizados.</p>
    </div></section>
  </main>;
}
