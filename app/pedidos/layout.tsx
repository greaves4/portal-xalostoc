import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";

export default async function OrdersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (isDemoMode() && (await cookies()).get("xalostoc-demo")?.value === "1") return children;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return children;
}
