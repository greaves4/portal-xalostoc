import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export default async function CartLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if ((await cookies()).get("xalostoc-demo")?.value === "1") return children;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");
  return children;
}
