import { createHash, randomBytes } from 'node:crypto'

import {
  createRemoteJWKSet,
  jwtVerify,
  SignJWT,
  type JWTVerifyGetKey,
} from 'jose'

import { env } from '@/lib/env'
import { siteUrl } from '@/lib/site-url'

/**
 * "Sign in with Google" — OpenID Connect authorisation-code flow with PKCE,
 * hand-rolled because it is short and a library would be most of the code.
 *
 *   1. /api/auth/google          makes state, nonce and a PKCE verifier, keeps
 *                                them in a signed cookie, sends the browser to
 *                                Google.
 *   2. /api/auth/google/callback checks `state` against the cookie, swaps the
 *                                code (plus verifier) for an ID token, and
 *                                verifies that token's signature, issuer,
 *                                audience, expiry and nonce.
 *
 * What each piece stops:
 *  - `state`: a forged callback that signs the victim into the attacker's
 *    Google account (login CSRF).
 *  - PKCE: a stolen authorisation code being redeemed by anyone else.
 *  - `nonce`: an ID token minted for another login being replayed into this one.
 */

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs')
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com']

export const GOOGLE_FLOW_COOKIE = 'google_oauth'
export const GOOGLE_FLOW_MAX_AGE_SECONDS = 10 * 60

export const googleRedirectUri = (): string => `${siteUrl()}/api/auth/google/callback`

const random = (): string => randomBytes(32).toString('base64url')

const flowKey = new TextEncoder().encode(`${env.PAYLOAD_SECRET}:google-oauth-flow`)

export type GoogleFlow = { state: string; nonce: string; verifier: string; next: string }

/** Everything the callback needs to check, signed so it cannot be edited in the browser. */
export const startGoogleFlow = async (
  clientId: string,
  next: string,
): Promise<{ url: string; cookie: string }> => {
  const flow: GoogleFlow = { state: random(), nonce: random(), verifier: random(), next }

  const url = new URL(AUTHORIZE_URL)
  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state: flow.state,
    nonce: flow.nonce,
    code_challenge: createHash('sha256').update(flow.verifier).digest('base64url'),
    code_challenge_method: 'S256',
    // Let someone with several Google accounts pick, instead of silently
    // using whichever one the browser last signed into.
    prompt: 'select_account',
  }).toString()

  const cookie = await new SignJWT(flow)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${GOOGLE_FLOW_MAX_AGE_SECONDS}s`)
    .sign(flowKey)

  return { url: url.toString(), cookie }
}

export const readGoogleFlow = async (cookie: string | undefined): Promise<GoogleFlow | null> => {
  if (!cookie) return null
  try {
    const { payload } = await jwtVerify<GoogleFlow>(cookie, flowKey)
    return payload
  } catch {
    return null
  }
}

export type GoogleProfile = {
  sub: string
  email: string | null
  emailVerified: boolean
  firstName: string | null
  lastName: string | null
}

type GoogleClaims = {
  sub?: string
  nonce?: string
  email?: string
  email_verified?: boolean | string
  given_name?: string
  family_name?: string
}

// Cached by jose across requests; Google rotates keys and jose refetches on a
// key id it has not seen.
let googleKeys: JWTVerifyGetKey | undefined
const defaultKeys = (): JWTVerifyGetKey => (googleKeys ??= createRemoteJWKSet(JWKS_URL))

/**
 * Checks an ID token really came from Google, for this app, for this login.
 * Returns null on any failure — the caller does not need to know which.
 */
export const verifyGoogleIdToken = async (
  idToken: string,
  { clientId, nonce, keys = defaultKeys() }: { clientId: string; nonce: string; keys?: JWTVerifyGetKey },
): Promise<GoogleProfile | null> => {
  try {
    const { payload } = await jwtVerify<GoogleClaims>(idToken, keys, {
      issuer: ISSUERS,
      audience: clientId,
      algorithms: ['RS256'],
    })
    if (!payload.sub || payload.nonce !== nonce) return null

    return {
      sub: payload.sub,
      email: payload.email ?? null,
      // Google has sent this as both a boolean and the string "true".
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
      firstName: payload.given_name ?? null,
      lastName: payload.family_name ?? null,
    }
  } catch {
    return null
  }
}

/** Swaps the one-time code for tokens. Server to server; the secret never reaches the browser. */
export const exchangeGoogleCode = async (
  { clientId, clientSecret }: { clientId: string; clientSecret: string },
  code: string,
  verifier: string,
): Promise<string | null> => {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: verifier,
      grant_type: 'authorization_code',
      redirect_uri: googleRedirectUri(),
    }),
    cache: 'no-store',
  }).catch(() => null)

  if (!response?.ok) return null
  const body = (await response.json().catch(() => null)) as { id_token?: string } | null
  return body?.id_token ?? null
}
