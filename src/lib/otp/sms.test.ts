// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ env: {} as Record<string, string | undefined> }))
vi.mock('@/lib/env', () => ({ env: mocks.env }))

import { smsSender } from './sms'

const configured = {
  SMS_PROVIDER: 'bonvoice',
  BONVOICE_API_KEY: 'test-key',
  BONVOICE_SENDER_ID: 'TOOLHM',
  BONVOICE_TEMPLATE_ID: '1707000000000000000',
  BONVOICE_OTP_MESSAGE: '{code} is your login code. Valid for 5 minutes.',
}

const reply = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const fetchMock = vi.fn()
const info = vi.spyOn(console, 'info').mockImplementation(() => {})

beforeEach(() => {
  for (const key of Object.keys(mocks.env)) delete mocks.env[key]
  Object.assign(mocks.env, configured)
  fetchMock.mockReset()
  info.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('choosing Bonvoice', () => {
  it('needs every setting', () => {
    expect(smsSender()).not.toBeNull()
    for (const key of ['BONVOICE_API_KEY', 'BONVOICE_SENDER_ID', 'BONVOICE_TEMPLATE_ID', 'BONVOICE_OTP_MESSAGE']) {
      const value = mocks.env[key]
      delete mocks.env[key]
      expect(smsSender()).toBeNull()
      mocks.env[key] = value
    }
  })
})

describe('sending through Bonvoice', () => {
  it('posts the approved wording with the key in the header', async () => {
    fetchMock.mockResolvedValue(reply(202, { status: 'accepted', message_id: 'abc' }))
    await smsSender()!.send('+919876543210', '123456')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://umsapi.ivrsms.com/v1/send')
    expect(init.method).toBe('POST')
    expect(init.headers['X-API-Key']).toBe('test-key')
    expect(JSON.parse(init.body)).toEqual({
      dest_addr: '919876543210',
      source_addr: 'TOOLHM',
      message_payload: '123456 is your login code. Valid for 5 minutes.',
      template_id: '1707000000000000000',
      service_type: 'otp',
    })
  })

  it('turns a typed \\n into the line break the template has', async () => {
    mocks.env.BONVOICE_OTP_MESSAGE = '{code} is your sign-in code.\\nGlobal Spares and Services'
    fetchMock.mockResolvedValue(reply(202, { status: 'accepted', message_id: 'abc' }))
    await smsSender()!.send('+919876543210', '123456')

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).message_payload).toBe(
      '123456 is your sign-in code.\nGlobal Spares and Services',
    )
  })

  it('uses a different address when one is set', async () => {
    mocks.env.BONVOICE_API_URL = 'https://other.example.com/v1/send'
    fetchMock.mockResolvedValue(reply(202, { status: 'accepted', message_id: 'abc' }))
    await smsSender()!.send('+919876543210', '123456')

    expect(fetchMock.mock.calls[0][0]).toBe('https://other.example.com/v1/send')
  })

  it('never logs the number or the code', async () => {
    fetchMock.mockResolvedValue(reply(202, { status: 'accepted', message_id: 'abc' }))
    await smsSender()!.send('+919876543210', '123456')

    const logged = JSON.stringify(info.mock.calls)
    expect(logged).toContain('abc')
    expect(logged).not.toContain('123456')
    expect(logged).not.toContain('9876543210')
  })

  it('reports a refusal without retrying', async () => {
    fetchMock.mockResolvedValue(reply(422, { status: 'error', message: 'unregistered sender' }))
    await expect(smsSender()!.send('+919876543210', '123456')).rejects.toThrow('HTTP 422 unregistered sender')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('retries once after a 500', async () => {
    vi.useFakeTimers()
    fetchMock
      .mockResolvedValueOnce(reply(500, { status: 'error', message: 'internal error' }))
      .mockResolvedValueOnce(reply(202, { status: 'accepted', message_id: 'abc' }))
    const sent = smsSender()!.send('+919876543210', '123456')
    await vi.runAllTimersAsync()
    await expect(sent).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('gives up if the retry fails too', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(async () => reply(500, { status: 'error', message: 'internal error' }))
    const sent = smsSender()!.send('+919876543210', '123456')
    const failed = expect(sent).rejects.toThrow('HTTP 500')
    await vi.runAllTimersAsync()
    await failed
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("doesn't retry a timeout, as the first text may have gone", async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'))
    await expect(smsSender()!.send('+919876543210', '123456')).rejects.toThrow('timed out')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
