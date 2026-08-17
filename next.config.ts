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
    "stripe",
    "@stripe/connect-js",
    "@stripe/react-connect-js",
  ],
};

export default nextConfig;
