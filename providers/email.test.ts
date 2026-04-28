import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'

// Mock the Resend SDK before importing the module under test
const mockSend = mock(() => Promise.resolve({ data: { id: 'email_123' }, error: null }))

mock.module('resend', () => ({
  Resend: class MockResend {
    emails = { send: mockSend }
  },
}))

// Must import AFTER mock.module
const { sendEmail } = await import('./email')

afterEach(() => {
  mockSend.mockClear()
})

describe('sendEmail', () => {
  const validMsg = {
    subject: 'Welcome!',
    html: '<h1>Hello</h1>',
    text: 'Hello',
  }

  it('sends an email with correct parameters', async () => {
    await sendEmail('user@example.com', validMsg)
    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith({
      from: 'My App <hello@example.com>',
      to: 'user@example.com',
      subject: 'Welcome!',
      html: '<h1>Hello</h1>',
      text: 'Hello',
    })
  })

  it('returns the Resend response', async () => {
    const result = await sendEmail('user@example.com', validMsg)
    expect(result).toEqual({ data: { id: 'email_123' }, error: null })
  })

  it('logs the email being sent', async () => {
    const infoSpy = spyOn(console, 'info').mockImplementation(() => {})
    await sendEmail('test@example.com', validMsg)
    expect(infoSpy).toHaveBeenCalledWith('[email] Welcome! -> test@example.com')
    infoSpy.mockRestore()
  })

  it('propagates Resend SDK errors', async () => {
    mockSend.mockImplementationOnce(() => Promise.reject(new Error('Resend rate limit')))
    await expect(sendEmail('user@example.com', validMsg)).rejects.toThrow('Resend rate limit')
  })

  it('handles different recipients', async () => {
    await sendEmail('admin@company.com', {
      subject: 'Alert',
      html: '<p>Alert</p>',
      text: 'Alert',
    })
    const call = (mockSend.mock.calls[0] as unknown[])[0] as { to: string; subject: string }
    expect(call.to).toBe('admin@company.com')
    expect(call.subject).toBe('Alert')
  })
})
