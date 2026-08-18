// El enum de Postgres no se muestra crudo en pantalla. El cliente y el personal
// interno leen lo mismo salvo sync_error: para el cliente el pedido ya esta aprobado
// y lo que falta es interno, no suyo.
const CLIENTE: Record<string, string> = {
  borrador: "Borrador",
  enviado: "Enviado",
  en_validacion: "En validación",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  sincronizado: "Confirmado",
  sync_error: "Aprobado, pendiente de confirmar",
};

const STAFF: Record<string, string> = {
  ...CLIENTE,
  sincronizado: "Sincronizado con Odoo",
  sync_error: "Error de sincronización",
};

export const etiquetaCliente = (estado: string) => CLIENTE[estado] ?? estado;
export const etiquetaStaff = (estado: string) => STAFF[estado] ?? estado;
