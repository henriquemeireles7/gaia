// packages/errors/index.ts — application error catalog (vision §Errors)
//
// Framework-agnostic. Elysia routes throw `AppError` and a handler maps
// it to the JSON response shape. No Hono Context, no router-specific
// helpers.

export const errors = {
  UNAUTHORIZED: { status: 401, code: 'UNAUTHORIZED', message: 'Authentication required' },
  FORBIDDEN: { status: 403, code: 'FORBIDDEN', message: 'Insufficient permissions' },
  SESSION_EXPIRED: { status: 401, code: 'SESSION_EXPIRED', message: 'Session expired' },

  VALIDATION_ERROR: { status: 400, code: 'VALIDATION_ERROR', message: 'Invalid input' },
  INVALID_REQUEST: { status: 400, code: 'INVALID_REQUEST', message: 'Invalid request' },

  NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: 'Resource not found' },
  USER_NOT_FOUND: { status: 404, code: 'USER_NOT_FOUND', message: 'User not found' },

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

  ALREADY_EXISTS: { status: 409, code: 'ALREADY_EXISTS', message: 'Resource already exists' },
  CONFLICT: { status: 409, code: 'CONFLICT', message: 'Conflict with current state' },

  RATE_LIMITED: { status: 429, code: 'RATE_LIMITED', message: 'Too many requests' },

  INTERNAL_ERROR: { status: 500, code: 'INTERNAL_ERROR', message: 'Internal server error' },
  SERVICE_UNAVAILABLE: {
    status: 503,
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service temporarily unavailable',
  },
} as const

export type ErrorCode = keyof typeof errors
export type ErrorEntry = (typeof errors)[ErrorCode]

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: string

  constructor(code: ErrorCode, details?: string) {
    const entry = errors[code]
    super(entry.message)
    this.name = 'AppError'
    this.code = code
    this.status = entry.status
    this.details = details
  }

  toJSON() {
    return {
      ok: false,
      code: this.code,
      message: errors[this.code].message,
      ...(this.details ? { details: this.details } : {}),
    }
  }
}
