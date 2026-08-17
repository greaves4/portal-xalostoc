type OdooResult = { ok: true; value: unknown } | { ok: false; error: string };
let cachedUid: number | null = null;

const config = () => ({ url: process.env.ODOO_URL, db: process.env.ODOO_DB, username: process.env.ODOO_USERNAME, key: process.env.ODOO_API_KEY });

async function call(service: string, method: string, args: unknown[]): Promise<OdooResult> {
  const response = await fetch(`${config().url}/jsonrpc`, { method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.timeout(10_000), body: JSON.stringify({ jsonrpc: "2.0", method: "call", params: { service, method, args }, id: Date.now() }) });
  const payload = await response.json();
  if (payload.error) return { ok: false, error: payload.error.data?.message ?? "Odoo devolvió un error." };
  return { ok: true, value: payload.result };
}

export async function odooExecute(model: string, method: string, args: unknown[], kwargs: object = {}): Promise<OdooResult> {
  const { url, db, username, key } = config();
  if (!url || !db || !username || !key) return { ok: false, error: "Faltan variables de conexión Odoo." };
  try {
    if (!cachedUid) {
      const auth = await call("common", "authenticate", [db, username, key, {}]);
      if (!auth.ok || typeof auth.value !== "number") return { ok: false, error: auth.ok ? "Odoo no autenticó al usuario." : auth.error };
      cachedUid = auth.value;
    }
    const result = await call("object", "execute_kw", [db, cachedUid, key, model, method, args, kwargs]);
    if (!result.ok) cachedUid = null;
    return result;
  } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Error de red con Odoo." }; }
}
