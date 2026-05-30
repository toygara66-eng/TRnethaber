/** @type {import('next').NextConfig} */

const esmDomPackages = [
  "sharp",
  "html-encoding-sniffer",
  "jsdom",
  "cheerio",
  "isomorphic-dompurify",
  "dompurify",
  "@exodus/bytes",
  "whatwg-encoding",
  "whatwg-url",
  "cssstyle",
  "data-urls",
  "parse5",
];

/** Tüm uzak kaynaklar + yaygın RSS/CDN yedekleri (Next en fazla 50 pattern) */
const remotePatterns = [
  { protocol: "https", hostname: "**", pathname: "/**" },
  { protocol: "http", hostname: "**", pathname: "/**" },
  { protocol: "https", hostname: "**.supabase.co", pathname: "/**" },
  { protocol: "https", hostname: "**.haberturk.com", pathname: "/**" },
  { protocol: "https", hostname: "**.ntv.com.tr", pathname: "/**" },
  { protocol: "https", hostname: "**.hurriyet.com.tr", pathname: "/**" },
  { protocol: "https", hostname: "**.hurimg.com", pathname: "/**" },
  { protocol: "https", hostname: "**.milliyet.com.tr", pathname: "/**" },
  { protocol: "https", hostname: "**.sabah.com.tr", pathname: "/**" },
  { protocol: "https", hostname: "**.sozcu.com.tr", pathname: "/**" },
  { protocol: "https", hostname: "**.aa.com.tr", pathname: "/**" },
  { protocol: "https", hostname: "**.dunya.com", pathname: "/**" },
  { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
  { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
  { protocol: "https", hostname: "**.cloudinary.com", pathname: "/**" },
  { protocol: "https", hostname: "**.amazonaws.com", pathname: "/**" },
];

const nextConfig = {
  async redirects() {
    return [
      {
        source: "/favicon.ico",
        destination: "/icon.png",
        permanent: false,
      },
    ];
  },
  transpilePackages: ["framer-motion"],
  experimental: {
    serverComponentsExternalPackages: esmDomPackages,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = config.externals ?? [];
      config.externals = [
        ...externals,
        ...esmDomPackages.map((pkg) => ({ [pkg]: `commonjs ${pkg}` })),
      ];
    }
    return config;
  },
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ["image/avif", "image/webp"],
    remotePatterns,
  },
};

export default nextConfig;
