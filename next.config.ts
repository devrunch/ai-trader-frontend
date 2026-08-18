import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["diascript"],
  async redirects() {
    return [
      // IA collapse to 3 tabs — old destinations fold into the new ones.
      // NOTE: /dashboard is deliberately NOT redirected here — it renders a
      // client page that routes by time of day (Brief pre/post market,
      // Terminal during). A static redirect would defeat that.
      { source: "/dashboard/paper-trade", destination: "/dashboard/portfolio", permanent: false },
      { source: "/dashboard/news", destination: "/dashboard/signals", permanent: false },
      { source: "/dashboard/charts", destination: "/dashboard/terminal", permanent: false },
      { source: "/dashboard/charts/:symbol", destination: "/dashboard/terminal", permanent: false },
    ];
  },
};

export default nextConfig;
