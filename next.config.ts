import type { NextConfig } from "next";

// This app is statically prerendered and makes no requests of its own at
// runtime: all SSB traffic happens at ingest time (ADR-001), and
// `next/font` self-hosts its fonts at build time. The policy below is
// scoped to that shape -- no external origin is allowed anywhere.
//
// `'unsafe-inline'` is required by the App Router's hydration payload and
// by `next/font`'s injected styles. No user input reaches the page, so
// there is no injection source today; if a route handler or middleware is
// ever added, this should move to a nonce.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Redundant with frame-ancestors, kept for older browsers.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
