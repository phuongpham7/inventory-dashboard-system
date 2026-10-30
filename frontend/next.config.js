/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // The browser only talks to /api on its own origin, so there is no CORS to manage
  // and the backend URL stays a server-side setting.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL || "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};
