/** @type {import('next').NextConfig} */
const nextConfig = {
  // OneDrive altındaki bozuk .next önbelleğinden kaçınmak için varsayılan klasör adı değiştirildi
  distDir: process.env.NEXT_DIST_DIR ?? ".cache/next",
  transpilePackages: ["framer-motion"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "fastly.picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "www.kulturportali.gov.tr",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "kulturportali.gov.tr",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
