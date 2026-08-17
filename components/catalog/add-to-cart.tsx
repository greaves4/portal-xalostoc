"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";

export function AddToCart({ productId }: { productId: string }) {
  const [added, setAdded] = useState(false);
  function add() {
    const current = JSON.parse(localStorage.getItem("xalostoc-cart") ?? "[]") as { productId: string; quantity: number }[];
    const existing = current.find((item) => item.productId === productId);
    if (existing) existing.quantity += 1;
    else current.push({ productId, quantity: 1 });
    localStorage.setItem("xalostoc-cart", JSON.stringify(current));
    setAdded(true);
    window.dispatchEvent(new Event("xalostoc-cart-change"));
  }
  return <button className="btn btn-secondary" type="button" onClick={add}><ShoppingCart size={13} strokeWidth={1.5}/> {added ? "Agregado" : "Agregar"}</button>;
}
