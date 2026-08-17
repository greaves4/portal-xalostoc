import { NextResponse } from "next/server";

export function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("xalostoc-demo", "1", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
