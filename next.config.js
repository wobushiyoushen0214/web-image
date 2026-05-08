/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.110.35", "localhost", "127.0.0.1"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

module.exports = nextConfig;
