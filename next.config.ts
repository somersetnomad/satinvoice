import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Works on Vercel and enables self-hosting via `node .next/standalone/server.js`.
  output: "standalone",
  // Blog posts are read from /content at request time; ship them with every function.
  outputFileTracingIncludes: { "/*": ["./content/blog/**/*"] },
  reactStrictMode: true,
};

export default nextConfig;
