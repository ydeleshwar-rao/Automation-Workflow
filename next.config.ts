import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.trycloudflare.com",
    "*.loca.lt"
  ],
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
