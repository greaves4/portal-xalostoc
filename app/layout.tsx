import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portal Xalostoc",
  description: "Portal de pedidos para clientes recurrentes de Telas Xalostoc.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es"><body>{children}</body></html>;
}
