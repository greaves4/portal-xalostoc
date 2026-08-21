// La unidad de venta decide como se pide el producto: la tela va por metros y
// admite fracciones (cantidad es numeric(12,3) en la base), la pieza no.
export const UNIDADES = {
  metraje: { etiqueta: "Metraje", sustantivo: "metros", abrev: "m", paso: 0.5, minimo: 0.5, decimales: true },
  pieza: { etiqueta: "Pieza", sustantivo: "piezas", abrev: "pz", paso: 1, minimo: 1, decimales: false },
} as const;

export type Unidad = keyof typeof UNIDADES;

export const unidadDe = (valor: string | null | undefined): Unidad => (valor === "metraje" ? "metraje" : "pieza");

// El cliente puede mandar cualquier cosa: las piezas se redondean, el metraje
// se limita a tres decimales, que es lo que guarda la columna.
export function normalizarCantidad(cantidad: number, unidad: Unidad) {
  if (!Number.isFinite(cantidad) || cantidad <= 0) return 0;
  const acotada = Math.min(cantidad, 999999);
  return UNIDADES[unidad].decimales ? Math.round(acotada * 1000) / 1000 : Math.round(acotada);
}

export const formatearCantidad = (cantidad: number, unidad: Unidad) =>
  `${Number(cantidad).toLocaleString("es-MX", { maximumFractionDigits: 3 })} ${UNIDADES[unidad].abrev}`;
