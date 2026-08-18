import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo";

export function POST() {
  if (!isDemoMode()) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("xalostoc-demo", "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
