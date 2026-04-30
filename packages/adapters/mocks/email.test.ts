import { describe, expect, it } from 'bun:test'
import { sendEmailMock } from './email'

describe('sendEmailMock', () => {
  it('returns a fake id with the mock_email_ prefix', async () => {
    const result = await sendEmailMock('user@example.com', {
      subject: 'Welcome',
      html: '<h1>Hi</h1>',
    })
    expect(result.id).toMatch(/^mock_email_\d+_[a-z0-9]+$/)
  })

  it('handles the optional text fallback without throwing', async () => {
    const result = await sendEmailMock('a@b.c', {
      subject: 'Test',
      html: '<p>Body</p>',
      text: 'Plain body',
    })
    expect(result.id).toContain('mock_email_')
  })
})
