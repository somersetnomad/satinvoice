import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Works on Vercel and enables self-hosting via `node .next/standalone/server.js`.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
