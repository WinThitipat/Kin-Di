import { NextRequest } from 'next/server';

// Next's internal request URL can use localhost behind a reverse proxy.
// The incoming Host header retains the browser-facing hostname.
export function isSameOriginRequest(request: NextRequest): boolean {
  try {
    const origin = new URL(request.headers.get('origin') ?? '');
    const host = request.headers.get('host') ?? new URL(request.url).host;
    return (origin.protocol === 'http:' || origin.protocol === 'https:') && origin.host.toLowerCase() === host.toLowerCase();
  } catch { return false; }
}
