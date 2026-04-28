import { describe, expect, it } from 'bun:test'
import { Hono } from 'hono'
import { accepted, created, paginated, partial, success } from './responses'

const app = new Hono()

app.get('/success', (c) => success(c, { id: 1, name: 'test' }))
app.get('/created', (c) => created(c, { id: 2 }))
app.get('/accepted', (c) => accepted(c, { id: 3 }))
app.get('/paginated', (c) => paginated(c, [{ id: 1 }, { id: 2 }], 50, 1, 10))
app.get('/partial', (c) => partial(c, [{ id: 1 }], ['item2 failed']))

describe('success', () => {
  it('returns 200 with { ok: true, data }', async () => {
    const res = await app.request('/success')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ ok: true, data: { id: 1, name: 'test' } })
  })
})

describe('created', () => {
  it('returns 201 with { ok: true, data }', async () => {
    const res = await app.request('/created')
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body).toEqual({ ok: true, data: { id: 2 } })
  })
})

describe('accepted', () => {
  it('returns 202 with { ok: true, data }', async () => {
    const res = await app.request('/accepted')
    const body = await res.json()
    expect(res.status).toBe(202)
    expect(body).toEqual({ ok: true, data: { id: 3 } })
  })
})

describe('paginated', () => {
  it('returns 200 with data and meta', async () => {
    const res = await app.request('/paginated')
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.data).toEqual([{ id: 1 }, { id: 2 }])
    expect(body.meta).toEqual({
      total: 50,
      page: 1,
      perPage: 10,
      totalPages: 5,
    })
  })

  it('calculates totalPages correctly for non-even division', async () => {
    const testApp = new Hono()
    testApp.get('/p', (c) => paginated(c, [], 11, 1, 5))
    const res = await testApp.request('/p')
    const body = await res.json()
    expect(body.meta.totalPages).toBe(3)
  })
})

describe('partial', () => {
  it('returns 207 with data, partial flag, and failures', async () => {
    const res = await app.request('/partial')
    const body = await res.json()
    expect(res.status).toBe(207)
    expect(body.ok).toBe(true)
    expect(body.partial).toBe(true)
    expect(body.data).toEqual([{ id: 1 }])
    expect(body.failures).toEqual(['item2 failed'])
  })
})
