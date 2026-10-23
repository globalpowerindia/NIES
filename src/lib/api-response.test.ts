import { describe, expect, it } from 'vitest'

import { readJson, readText } from './api-response'

/** A body with no Content-Length, as a chunked upload would send it. */
const streamed = (bytes: number) =>
  new Request('http://localhost/x', {
    method: 'POST',
    body: new ReadableStream({
      start(controller) {
        for (let sent = 0; sent < bytes; sent += 1024) controller.enqueue(new Uint8Array(Math.min(1024, bytes - sent)).fill(97))
        controller.close()
      },
    }),
    // @ts-expect-error Node needs this for a streamed request body; the DOM types don't know it.
    duplex: 'half',
  })

describe('bounded body reads', () => {
  it('returns the body under the limit', async () => {
    expect(await readText(new Request('http://localhost/x', { method: 'POST', body: 'hello' }), 10)).toBe('hello')
  })

  it('refuses a body over the limit even without a Content-Length', async () => {
    expect(await readText(streamed(5000), 4096)).toBeNull()
  })

  it('refuses on a declared Content-Length over the limit', async () => {
    const request = new Request('http://localhost/x', { method: 'POST', body: 'x', headers: { 'content-length': '999999' } })
    expect(await readText(request, 1024)).toBeNull()
  })

  it('parses only JSON bodies', async () => {
    const json = (body: string, type = 'application/json') =>
      readJson(new Request('http://localhost/x', { method: 'POST', body, headers: { 'content-type': type } }))
    expect(await json('{"a":1}')).toEqual({ a: 1 })
    expect(await json('{"a":1}', 'text/plain')).toBeNull()
    expect(await json('not json')).toBeNull()
  })
})
