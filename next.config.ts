import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      "http://supabasekong-ps9wsyr4b22h2swqeu0jn1ic.85.190.242.104.sslip.io:8000",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiYXVkIjoiYXV0aGVudGljYXRlZCIsImlhdCI6MTc4NzAwMTg4MywiZXhwIjoyMTAyMzYxODgzLCJzdWIiOiJhbm9ueW1vdXMifQ.GXhYOyOSfYF6z5dnYO7FdNBzxBzr9D7SK3twvRVNWvU",
  },
};

export default nextConfig;
