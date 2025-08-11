import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    if(!config.experiments) {
      config.experiments = {}
    }
    config.experiments.topLevelAwait = true
    return config
  }
};

export default nextConfig;
