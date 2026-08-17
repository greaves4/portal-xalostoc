type Notice = { to: string | null | undefined; subject: string; text: string };

export async function sendNotice(notice: Notice) {
  const { RESEND_API_KEY, MAIL_FROM } = process.env;
  if (!RESEND_API_KEY || !MAIL_FROM || !notice.to) return { sent: false };
  try {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: MAIL_FROM, to: [notice.to], subject: notice.subject, text: notice.text }) });
    return { sent: response.ok };
  } catch { return { sent: false }; }
}
