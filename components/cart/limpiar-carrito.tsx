"use client";

import { useEffect } from "react";

// Se monta solo en el detalle del pedido recien enviado (?enviado=1). Vaciar el carrito
// aqui y no al hacer submit garantiza que solo se borra cuando el pedido si se creo:
// antes, volver atras dejaba las mismas lineas listas para enviarse por segunda vez.
export function LimpiarCarrito() {
  useEffect(() => {
    localStorage.removeItem("xalostoc-cart");
    window.dispatchEvent(new Event("xalostoc-cart-change"));
  }, []);
  return null;
}
