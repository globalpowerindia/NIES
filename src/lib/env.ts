import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PAYLOAD_SECRET: z.string().min(1),
  R2_BUCKET: z.string().min(1).optional(),
  R2_ACCOUNT_ID: z.string().min(1).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_PUBLIC_URL: z.string().min(1).optional(),
  // "true" once the bucket's CORS allows this site to PUT: uploads then go
  // from the browser straight to R2, past Vercel's 4.5MB request limit.
  R2_CLIENT_UPLOADS: z.enum(['true', 'false']).optional(),
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  // Scheduled jobs answer only to `Authorization: Bearer <CRON_SECRET>`, which
  // Vercel Cron sends. Unset, the job routes refuse every call.
  CRON_SECRET: z.string().min(16).optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
    .join('\n')
  throw new Error(`Invalid environment configuration:\n${issues}`)
}

export const env = parsed.data

export const r2 =
  env.R2_BUCKET && env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY
    ? {
        bucket: env.R2_BUCKET,
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        publicUrl: env.R2_PUBLIC_URL,
      }
    : null

/** Google sign-in is offered only once both halves of the OAuth client are set. */
export const googleOAuth =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
    : null
