/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'xotxtplmwxzmnphvbydl.supabase.co',
      },
    ],
  },
}

module.exports = nextConfig
