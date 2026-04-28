import type { Context } from 'hono'

// CUSTOMIZE: Add your error codes here
export const errors = {
  // Auth
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
  SESSION_EXPIRED: { status: 401, code: 'SESSION_EXPIRED', message: 'Session expired' },

  // Validation
  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
  INVALID_REQUEST: { status: 400, code: 'INVALID_REQUEST', message: 'Invalid request' },

  // Not Found
  NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: 'Resource not found' },
  USER_NOT_FOUND: { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' },

  // Payments
  PAYMENT_FAILED: { status: 402, code: 'PAYMENT_FAILED', message: 'Payment failed' },
  SUBSCRIPTION_NOT_FOUND: {
    status: 404,
    code: 'SUBSCRIPTION_NOT_FOUND',
    message: 'No active subscription found',
  },
  SUBSCRIPTION_REQUIRED: {
    status: 403,
    code: 'SUBSCRIPTION_REQUIRED',
    message: 'Active subscription required',
  },

  // Organizations
  ORG_NOT_FOUND: { status: 404, code: 'ORG_NOT_FOUND', message: 'Organization not found' },
  NOT_A_MEMBER: {
    status: 403,
    code: 'NOT_A_MEMBER',
    message: 'You are not a member of this organization',
  },
  INVITATION_EXPIRED: {
    status: 410,
    code: 'INVITATION_EXPIRED',
    message: 'Invitation has expired',
  },
  INVITATION_NOT_FOUND: {
    status: 404,
    code: 'INVITATION_NOT_FOUND',
    message: 'Invitation not found',
  },

  // Conflict
  ALREADY_EXISTS: { status: 409, code: 'ALREADY_EXISTS', message: 'Resource already exists' },
  CONFLICT: { status: 409, code: 'CONFLICT', message: 'Conflict with current state' },

  // Rate Limiting
  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED', message: 'Too many requests' },

  // Server
  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' },
  SERVICE_UNAVAILABLE: {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
  },
} as const

export type ErrorCode = keyof typeof errors

export function throwError(c: Context, code: ErrorCode, details?: string) {
  const error = errors[code]
  return c.json(
    { ok: false, code: error.code, message: error.message, details },
    error.status as 400,
  )
}
