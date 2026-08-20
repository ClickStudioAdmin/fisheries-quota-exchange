import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  outputFileTracingIncludes: {
    "/*": ["./lib/transfers/forms/fdu1465-v09-23.pdf"],
  },
  serverExternalPackages: [
    "resend",
    "@react-email/components",
    "@react-pdf/renderer",
    "pdf-lib",
    "stripe",
    "@stripe/connect-js",
    "@stripe/react-connect-js",
  ],
};

export default nextConfig;
