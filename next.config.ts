import type { NextConfig } from "next";

// NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY llegan como build args
// desde Coolify (ver Dockerfile). Next los inlinea solos por el prefijo NEXT_PUBLIC_.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

export default nextConfig;
