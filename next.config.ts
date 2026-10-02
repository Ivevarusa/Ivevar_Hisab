import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows uploading the old Excel file in Settings
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
