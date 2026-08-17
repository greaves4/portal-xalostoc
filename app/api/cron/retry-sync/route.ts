import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncOrderToOdoo } from "@/lib/actions/sync";

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (process.env.ODOO_SYNC_ENABLED !== "true") return NextResponse.json({ skipped: true, reason: "ODOO_SYNC_ENABLED=false" });
  const admin = createAdminClient();
  const { data: orders } = await admin.from("orders").select("id").eq("status", "sync_error").limit(25);
  for (const order of orders ?? []) await admin.from("orders").update({ status: "aprobado" }).eq("id", order.id);
  for (const order of orders ?? []) await syncOrderToOdoo(order.id);
  return NextResponse.json({ retried: orders?.length ?? 0 });
}
