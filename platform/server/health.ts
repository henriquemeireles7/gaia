import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { sql } from 'drizzle-orm'
import { db } from '@/platform/db/client'
import { env } from '@/platform/env'
import { email } from '@/providers/email'
import { payments } from '@/providers/payments'

const startTime = Date.now()

type ServiceStatus =
  | { status: 'ok'; latency: number }
  | { status: 'error'; error: string }
  | { status: 'skipped' }

const CHECK_TIMEOUT_MS = 5_000

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out`)), CHECK_TIMEOUT_MS),
    ),
  ])
}

async function timed(fn: () => Promise<unknown>): Promise<number> {
  const start = performance.now()
  await fn()
  return Math.round(performance.now() - start)
}

async function check(label: string, fn: () => Promise<unknown>): Promise<ServiceStatus> {
  try {
    const latency = await withTimeout(timed(fn), label)
    return { status: 'ok', latency }
  } catch (e) {
    console.error(`[health] ${label} check failed:`, e instanceof Error ? e.message : e)
    return { status: 'error', error: `${label} unavailable` }
  }
}

function checkDatabase(): Promise<ServiceStatus> {
  return check('database', () => db.execute(sql`SELECT 1`))
}

function checkPayments(): Promise<ServiceStatus> {
  return check('payments', () => payments.balance.retrieve())
}

function checkEmail(): Promise<ServiceStatus> {
  return check('email', () => email.apiKeys.list())
}

async function checkStorage(): Promise<ServiceStatus> {
  if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID) {
    return { status: 'skipped' }
  }
  return check('storage', () => {
    const client = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    })
    return client.send(new HeadBucketCommand({ Bucket: env.R2_BUCKET_NAME ?? 'default' }))
  })
}

const REQUIRED = ['database', 'payments'] as const
const OPTIONAL = ['email', 'storage'] as const

export async function checkHealth() {
  const [database, paymentsResult, emailResult, storage] = await Promise.all([
    checkDatabase(),
    checkPayments(),
    checkEmail(),
    checkStorage(),
  ])

  const services = { database, payments: paymentsResult, email: emailResult, storage }

  const requiredDown = REQUIRED.some((s) => services[s].status === 'error')
  const optionalDown = OPTIONAL.some((s) => services[s].status === 'error')

  const status = requiredDown ? 'unhealthy' : optionalDown ? 'degraded' : 'healthy'
  const httpStatus = requiredDown ? 503 : 200

  return {
    httpStatus,
    body: {
      status,
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - startTime) / 1000),
      services,
    },
  }
}
