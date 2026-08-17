export function fallbackPayload(order: { folio: string; subtotal: number }, items: unknown[]) {
  return { mode: "fallback", folio: order.folio, subtotal: order.subtotal, items, generated_at: new Date().toISOString() };
}

export async function sendFallbackEmail(payload: { folio: string; [key: string]: unknown }) {
  const { RESEND_API_KEY, MAIL_FROM, MAIL_VALIDADOR } = process.env;
  if (!RESEND_API_KEY || !MAIL_FROM || !MAIL_VALIDADOR) return { sent: false, reason: "Resend no configurado." };
  const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: MAIL_FROM, to: [MAIL_VALIDADOR], subject: `Pedido aprobado ${payload.folio} · fallback Odoo`, text: JSON.stringify(payload, null, 2) }) });
  return response.ok ? { sent: true } : { sent: false, reason: await response.text() };
}
