/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produce a self-contained server build for Docker (.next/standalone)
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: ['api.aletis.me']
  },
}

export default nextConfig
