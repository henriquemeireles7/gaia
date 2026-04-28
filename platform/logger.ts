type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

type LogEntry = {
  level: LogLevel
  message: string
  timestamp: string
  [key: string]: unknown
}

type LoggerOptions = {
  level?: LogLevel
  pretty?: boolean
}

export type Logger = {
  debug: (message: string, data?: Record<string, unknown>) => void
  info: (message: string, data?: Record<string, unknown>) => void
  warn: (message: string, data?: Record<string, unknown>) => void
  error: (message: string, data?: Record<string, unknown>) => void
  child: (bindings: Record<string, unknown>) => Logger
}

function formatPretty(entry: LogEntry): string {
  const { level, message, timestamp, ...rest } = entry
  const color = { debug: '36', info: '32', warn: '33', error: '31' }[level]
  const extra = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : ''
  return `\x1b[${color}m${level.toUpperCase().padEnd(5)}\x1b[0m ${timestamp} ${message}${extra}`
}

/**
 * Create a structured logger instance.
 *
 * @example
 * const log = createLogger({ level: 'info', pretty: true })
 * log.info('Server started', { port: 3000 })
 *
 * const reqLog = log.child({ requestId: 'abc-123' })
 * reqLog.info('Request received', { method: 'GET', path: '/api/users' })
 */
export function createLogger(
  options?: LoggerOptions,
  parentBindings?: Record<string, unknown>,
): Logger {
  const minLevel = LOG_LEVELS[options?.level ?? 'info']
  const pretty = options?.pretty ?? false
  const bindings: Record<string, unknown> = { ...parentBindings }

  function log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < minLevel) return

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...bindings,
      ...data,
    }

    const output = pretty ? formatPretty(entry) : JSON.stringify(entry)
    const writer = level === 'error' || level === 'warn' ? console.error : console.log
    writer(output)
  }

  return {
    debug: (msg, data) => log('debug', msg, data),
    info: (msg, data) => log('info', msg, data),
    warn: (msg, data) => log('warn', msg, data),
    error: (msg, data) => log('error', msg, data),
    child: (extra) => createLogger(options, { ...bindings, ...extra }),
  }
}

// Default app-wide logger — configured once at startup
let _logger: Logger | null = null

export function getLogger(): Logger {
  if (!_logger) {
    try {
      const { env } = require('@/platform/env')
      _logger = createLogger({
        level: env.NODE_ENV === 'production' ? 'info' : 'debug',
        pretty: env.NODE_ENV !== 'production',
      })
    } catch {
      _logger = createLogger({ level: 'info', pretty: true })
    }
  }
  return _logger
}
