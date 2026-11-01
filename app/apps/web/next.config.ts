import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // The product is text only. Camera and microphone are refused at the browser level for every page.
  async headers() {
    return [{ source: "/(.*)", headers: [{ key: "Permissions-Policy", value: "camera=(), microphone=(), display-capture=()" }] }];
  },
};
export default nextConfig;
