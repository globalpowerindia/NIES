// @vitest-environment node
// (jose rejects jsdom's Uint8Array, which comes from a different realm.)
import { createHash } from 'node:crypto'

import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK, type JWTVerifyGetKey } from 'jose'
import { beforeAll, describe, expect, it } from 'vitest'

import { readGoogleFlow, startGoogleFlow, verifyGoogleIdToken } from './google'

const CLIENT_ID = 'test-client.apps.googleusercontent.com'
const NONCE = 'the-nonce'

let privateKey: CryptoKey
let keys: JWTVerifyGetKey
let strangerKey: CryptoKey

beforeAll(async () => {
  const pair = await generateKeyPair('RS256')
  privateKey = pair.privateKey
  const jwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' }
  keys = createLocalJWKSet({ keys: [jwk] })
  strangerKey = (await generateKeyPair('RS256')).privateKey
})

const idToken = (claims: Record<string, unknown> = {}, opts: { key?: CryptoKey; exp?: string } = {}) =>
  new SignJWT({ nonce: NONCE, email: 'asha@example.com', email_verified: true, given_name: 'Asha', ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer((claims.iss as string) ?? 'https://accounts.google.com')
    .setAudience((claims.aud as string) ?? CLIENT_ID)
    .setSubject('google-sub-123')
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '5m')
    .sign(opts.key ?? privateKey)

const verify = async (token: string) => verifyGoogleIdToken(token, { clientId: CLIENT_ID, nonce: NONCE, keys })

describe('verifyGoogleIdToken', () => {
  it('accepts a genuine token and reads the profile', async () => {
    expect(await verify(await idToken())).toEqual({
      sub: 'google-sub-123',
      email: 'asha@example.com',
      emailVerified: true,
      firstName: 'Asha',
      lastName: null,
    })
  })

  it('accepts the bare issuer Google also uses', async () => {
    expect(await verify(await idToken({ iss: 'accounts.google.com' }))).not.toBeNull()
  })

  it('treats email_verified "true" as verified and anything else as not', async () => {
    expect((await verify(await idToken({ email_verified: 'true' })))?.emailVerified).toBe(true)
    expect((await verify(await idToken({ email_verified: false })))?.emailVerified).toBe(false)
    expect((await verify(await idToken({ email_verified: undefined })))?.emailVerified).toBe(false)
  })

  it('rejects a token signed by anyone but Google', async () => {
    expect(await verify(await idToken({}, { key: strangerKey }))).toBeNull()
  })

  it('rejects a token issued to another app', async () => {
    expect(await verify(await idToken({ aud: 'someone-else.apps.googleusercontent.com' }))).toBeNull()
  })

  it('rejects a token from another issuer', async () => {
    expect(await verify(await idToken({ iss: 'https://evil.example.com' }))).toBeNull()
  })

  it('rejects a token replayed from a different login', async () => {
    expect(await verify(await idToken({ nonce: 'someone-elses-nonce' }))).toBeNull()
  })

  it('rejects an expired token', async () => {
    expect(await verify(await idToken({}, { exp: '-1m' }))).toBeNull()
  })

  it('rejects garbage', async () => {
    expect(await verify('not.a.token')).toBeNull()
  })
})

describe('Google flow cookie', () => {
  it('round-trips, and the URL carries the PKCE challenge for its verifier', async () => {
    const { url, cookie } = await startGoogleFlow(CLIENT_ID, '/products')
    const flow = await readGoogleFlow(cookie)
    expect(flow?.next).toBe('/products')

    const params = new URL(url).searchParams
    expect(params.get('state')).toBe(flow?.state)
    expect(params.get('nonce')).toBe(flow?.nonce)
    expect(params.get('code_challenge')).toBe(createHash('sha256').update(flow!.verifier).digest('base64url'))
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(params.get('client_id')).toBe(CLIENT_ID)
  })

  it('rejects a cookie edited in the browser', async () => {
    const { cookie } = await startGoogleFlow(CLIENT_ID, '/')
    const [header, body, signature] = cookie.split('.')
    const edited = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(body, 'base64url').toString()), next: '/evil' }),
    ).toString('base64url')
    expect(await readGoogleFlow(`${header}.${edited}.${signature}`)).toBeNull()
    expect(await readGoogleFlow(undefined)).toBeNull()
  })
})
