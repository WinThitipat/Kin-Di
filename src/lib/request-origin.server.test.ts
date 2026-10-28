import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { isSameOriginRequest } from './request-origin.server';
describe('browser-facing same-origin checks', () => {
  it('supports Next internal localhost URLs without accepting a foreign origin', () => {
    const request = (origin: string) => new NextRequest('http://localhost:3100/api/recipes', { headers: { host: '127.0.0.1:3100', origin } });
    expect(isSameOriginRequest(request('http://127.0.0.1:3100'))).toBe(true);
    expect(isSameOriginRequest(request('https://other.example'))).toBe(false);
    expect(isSameOriginRequest(request('null'))).toBe(false);
  });
});
