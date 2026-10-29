export class RequestBodyTooLarge extends Error {}

/** Bound memory usage while reading, including requests without Content-Length. */
export async function readBoundedJson(request: Request, limit = 2_000_000) {
  if (Number(request.headers.get('content-length')) > limit) throw new RequestBodyTooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RequestBodyTooLarge(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
