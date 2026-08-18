import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

export default async function CatalogoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const demo = isDemoMode() && (await cookies()).get("xalostoc-demo")?.value === "1";
  if (demo) return children;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "cliente") redirect("/admin/bandeja");
  return children;
}
