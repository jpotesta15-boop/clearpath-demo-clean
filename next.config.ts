import type { NextConfig } from "next";

const baseSecurityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
] as const;

const nextConfig: NextConfig = {
  async headers() {
    const headers: { key: string; value: string }[] = [...baseSecurityHeaders];

    // Apply HSTS only in production; avoid in dev/local.
    if (process.env.NODE_ENV === 'production') {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000; includeSubDomains',
      });
    }

    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
