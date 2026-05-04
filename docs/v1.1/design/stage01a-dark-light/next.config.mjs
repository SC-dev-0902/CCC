/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/CCC/design-preview',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
