import { afterEach, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { createLogger } from './logger'

describe('createLogger', () => {
  let logSpy: ReturnType<typeof spyOn>
  let errorSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    logSpy = spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  it('logs info messages in JSON format', () => {
    const log = createLogger({ level: 'info', pretty: false })
    log.info('test message')

    expect(logSpy).toHaveBeenCalledTimes(1)
    const output = JSON.parse(logSpy.mock.calls[0]![0] as string)
    expect(output.level).toBe('info')
    expect(output.message).toBe('test message')
    expect(output.timestamp).toBeDefined()
  })

  it('logs error and warn to console.error', () => {
    const log = createLogger({ level: 'debug', pretty: false })
    log.error('error message')
    log.warn('warn message')

    expect(errorSpy).toHaveBeenCalledTimes(2)
  })

  it('respects log level filtering', () => {
    const log = createLogger({ level: 'warn', pretty: false })
    log.debug('ignored')
    log.info('ignored')
    log.warn('shown')
    log.error('shown')

    expect(logSpy).not.toHaveBeenCalled()
    expect(errorSpy).toHaveBeenCalledTimes(2)
  })

  it('includes additional data in log entry', () => {
    const log = createLogger({ level: 'info', pretty: false })
    log.info('request', { method: 'GET', path: '/api' })

    const output = JSON.parse(logSpy.mock.calls[0]![0] as string)
    expect(output.method).toBe('GET')
    expect(output.path).toBe('/api')
  })

  it('formats pretty output with colors', () => {
    const log = createLogger({ level: 'info', pretty: true })
    log.info('pretty test')

    expect(logSpy).toHaveBeenCalledTimes(1)
    const output = logSpy.mock.calls[0]![0] as string
    expect(output).toContain('INFO')
    expect(output).toContain('pretty test')
  })

  describe('child logger', () => {
    it('inherits parent bindings', () => {
      const log = createLogger({ level: 'info', pretty: false })
      const child = log.child({ requestId: 'abc-123' })
      child.info('child message')

      const output = JSON.parse(logSpy.mock.calls[0]![0] as string)
      expect(output.requestId).toBe('abc-123')
      expect(output.message).toBe('child message')
    })

    it('does not affect parent logger', () => {
      const log = createLogger({ level: 'info', pretty: false })
      log.child({ requestId: 'abc-123' })
      log.info('parent message')

      const output = JSON.parse(logSpy.mock.calls[0]![0] as string)
      expect(output.requestId).toBeUndefined()
    })

    it('merges bindings from multiple levels', () => {
      const log = createLogger({ level: 'info', pretty: false })
      const child1 = log.child({ service: 'api' })
      const child2 = child1.child({ requestId: 'xyz' })
      child2.info('deep child')

      const output = JSON.parse(logSpy.mock.calls[0]![0] as string)
      expect(output.service).toBe('api')
      expect(output.requestId).toBe('xyz')
    })

    it('call-site data overrides bindings', () => {
      const log = createLogger({ level: 'info', pretty: false })
      const child = log.child({ requestId: 'original' })
      child.info('override test', { requestId: 'overridden' })

      const output = JSON.parse(logSpy.mock.calls[0]![0] as string)
      expect(output.requestId).toBe('overridden')
    })
  })
})
