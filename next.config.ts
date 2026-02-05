import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker/Coolify deployment
  // This creates a minimal Node.js server without unnecessary dependencies
  output: 'standalone',

  // Disable telemetry in production
  experimental: {
    // No experimental features needed for now
  },
};

export default nextConfig;
