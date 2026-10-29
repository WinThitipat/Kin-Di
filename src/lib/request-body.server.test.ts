import { expect, it } from 'vitest';
import { readBoundedJson, RequestBodyTooLarge } from './request-body.server';
it('bounds declared and streamed bodies and parses valid JSON', async () => {
  const request = (body: string, headers = {}) => new Request('http://localhost', {method:'POST',headers,body});
  expect(await readBoundedJson(request('{"ok":true}'),100)).toEqual({ok:true});
  await expect(readBoundedJson(request('{}',{'content-length':'1000'}),10)).rejects.toBeInstanceOf(RequestBodyTooLarge);
  await expect(readBoundedJson(request(' '.repeat(50)),10)).rejects.toBeInstanceOf(RequestBodyTooLarge);
  await expect(readBoundedJson(request('{bad'),100)).rejects.toThrow();
});
