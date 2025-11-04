import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const langgraphUrl =
      process.env.NEXT_PUBLIC_LANGGRAPH_API_URL || "http://localhost:8123";
    return [
      {
        source: "/api/langgraph/:path*",
        destination: `${langgraphUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
