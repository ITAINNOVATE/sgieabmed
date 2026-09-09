import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',

  // ── Compression Gzip/Brotli activée
  compress: true,

  // ── Optimisation des imports de bibliothèques lourdes (tree-shaking agressif)
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
      '@tanstack/react-table',
    ],
  },

  // ── En-têtes de cache pour les assets statiques
  async headers() {
    return [
      {
        source: '/logoabmed.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/logoeGED.png',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/_next/image/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=60, stale-while-revalidate=86400' }],
      },
    ];
  },

  // ── Optimisation des images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [32, 48, 64, 96, 128, 256],
  },
};

export default nextConfig;
