import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // keep the on-screen route indicator out of fidelity screenshots
  devIndicators: false,
  // photo uploads arrive through a server action, several phone photos at a time; the default 1 MB would refuse one
  experimental: { serverActions: { bodySizeLimit: '40mb' } },
};

export default nextConfig;
