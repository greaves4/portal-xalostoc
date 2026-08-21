import { createClient } from "@/lib/supabase/server";
import { UNIDADES, unidadDe, type Unidad } from "@/lib/unidades";

export type CatalogItem = { id: string; sku: string; name: string; unidad: Unidad; unit: string; price: string; precioNumero: number; state: string };

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
  return products.map((product) => {
    const precio = Number(priceMap.get(product.id) ?? product.precio_base);
    return {
      id: product.id,
      sku: product.sku,
      name: product.nombre,
      unidad: unidadDe(product.unidad),
      unit: UNIDADES[unidadDe(product.unidad)].etiqueta,
      price: `$${precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
      precioNumero: precio,
      state: "Disponible",
    };
  });
}

export type ClientSummary = {
  razonSocial: string;
  productosActivos: number;
  pedidosEnCurso: number;
  creditoDisponible: number | null;
  cuentaActiva: boolean;
};

export async function getClientSummary(): Promise<ClientSummary | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).maybeSingle();
  if (!profile?.client_id) return null;
  const [{ data: client }, { count: productos }, { count: enCurso }] = await Promise.all([
    supabase.from("clients").select("razon_social, credito_limite, credito_usado, credito_liquidado, activo").eq("id", profile.client_id).maybeSingle(),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("client_id", profile.client_id).in("status", ["borrador", "enviado", "en_validacion", "aprobado"]),
  ]);
  if (!client) return null;
  const limite = Number(client.credito_limite ?? 0);
  return {
    razonSocial: client.razon_social,
    productosActivos: productos ?? 0,
    pedidosEnCurso: enCurso ?? 0,
    creditoDisponible: limite > 0 ? limite - (Number(client.credito_usado ?? 0) - Number(client.credito_liquidado ?? 0)) : null,
    cuentaActiva: Boolean(client.activo),
  };
}

export type ShippingAddress = { id: string; etiqueta: string | null; calle: string | null; ciudad: string | null; estado: string | null; cp: string | null; es_default: boolean | null };

export async function getShippingAddresses(): Promise<ShippingAddress[]> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return [];
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data: profile } = await supabase.from("profiles").select("client_id").eq("id", user.id).maybeSingle();
  if (!profile?.client_id) return [];
  const { data } = await supabase.from("shipping_addresses").select("id, etiqueta, calle, ciudad, estado, cp, es_default")
    .eq("client_id", profile.client_id).order("es_default", { ascending: false });
  return (data ?? []) as ShippingAddress[];
}
