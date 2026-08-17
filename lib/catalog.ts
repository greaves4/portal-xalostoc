import { createClient } from "@/lib/supabase/server";

export type CatalogItem = { id: string; sku: string; name: string; unit: string; price: string; state: string };

export async function getCatalog(): Promise<CatalogItem[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).maybeSingle();
  const { data: products, error } = await supabase.from("products").select("id, sku, nombre, unidad, precio_base").eq("activo", true).order("sku");
  if (error || !products) return [];
  const { data: prices } = profile?.client_id
    ? await supabase.from("client_prices").select("product_id, precio").eq("client_id", profile.client_id)
    : { data: [] as { product_id: string; precio: number }[] };
  const priceMap = new Map((prices ?? []).map((price) => [price.product_id, price.precio]));
  return products.map((product) => ({
    id: product.id,
    sku: product.sku,
    name: product.nombre,
    unit: product.unidad === "metraje" ? "Metraje" : "Pieza",
    price: `$${Number(priceMap.get(product.id) ?? product.precio_base).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
    state: "Disponible",
  }));
}
