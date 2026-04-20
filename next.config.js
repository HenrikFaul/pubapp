/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/admin',
        destination: '/venueadmin',
        permanent: true,
      },
      {
        source: '/admin/:path*',
        destination: '/venueadmin/:path*',
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'xotxtplmwxzmnphvbydl.supabase.co' },
    ],
  },
}
module.exports = nextConfig
