import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  experimental: {
    serverSourceMaps: false,
  },
  output: 'standalone',
  webpack(config, { dev, isServer }) {
    if (dev) {
      config.devtool = false;
    }
    // Ensure ESM packages like @xenova/transformers are transpiled on the server
    if (isServer) {
      const externals = config.externals || [];
      config.externals = externals;
    }
    return config;
  },
};

export default nextConfig;
