import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1mb — raised so admins can upload larger Word/Excel vocabulary files.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
