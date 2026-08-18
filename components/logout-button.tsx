import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export function LogoutButton() {
  return <form action={signOut} style={{ display: "inline" }}>
    <button className="btn btn-ghost" type="submit"><LogOut size={15} strokeWidth={1.5} /> Salir</button>
  </form>;
}
