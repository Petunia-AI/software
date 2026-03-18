import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Tree-shake icon libraries — avoids loading all 577 lucide icons on each compile
    optimizePackageImports: ["lucide-react", "@base-ui/react", "date-fns"],
  },
};

export default nextConfig;
