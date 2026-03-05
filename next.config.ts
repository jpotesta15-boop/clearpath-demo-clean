import type { NextConfig } from "next";

const baseSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
] as const;

const cspHeader = {
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
} as const;

const nextConfig: NextConfig = {
  async headers() {
    const headers: { key: string; value: string }[] = [...baseSecurityHeaders];

    // Only apply strict CSP and HSTS in production.
    // In development, Next.js dev server relies on inline scripts for HMR
    // and will break if we send a \"script-src 'self'\" CSP.
    if (process.env.NODE_ENV === 'production') {
      headers.push(cspHeader);
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
