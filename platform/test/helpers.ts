import { expect } from 'bun:test'
import type { ErrorCode } from '@/platform/errors'
import { errors } from '@/platform/errors'

/**
 * Call a Hono app route in tests. Returns parsed JSON response.
 */
export async function apiCall(
  app: { fetch: (req: Request) => Promise<Response> },
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  const url = `http://localhost${path}`
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }
  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }
  const response = await app.fetch(new Request(url, init))
  const json = await response.json()
  return { status: response.status, body: json }
}

/**
 * Call a Hono app route with an auth session token.
 */
export async function authenticatedRequest(
  app: { fetch: (req: Request) => Promise<Response> },
  sessionToken: string,
  method: string,
  path: string,
  body?: unknown,
) {
  return apiCall(app, method, path, body, {
    Authorization: `Bearer ${sessionToken}`,
  })
}

/**
 * Assert the response matches the throwError() shape for a given error code.
 */
export function assertError(response: { status: number; body: unknown }, errorCode: ErrorCode) {
  const expected = errors[errorCode]
  expect(response.status).toBe(expected.status)
  const body = response.body as Record<string, unknown>
  expect(body.ok).toBe(false)
  expect(body.code).toBe(expected.code)
  expect(body.message).toBe(expected.message)
}

/**
 * Assert the response matches the success() shape: { ok: true, data: ... }
 */
export function assertSuccess(response: { status: number; body: unknown }) {
  expect(response.status).toBe(200)
  const body = response.body as Record<string, unknown>
  expect(body.ok).toBe(true)
  expect(body.data).toBeDefined()
  return body.data
}
