import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  serverExternalPackages: [
    "resend",
    "@react-email/components",
    "@react-pdf/renderer",
  ],
};

export default nextConfig;
