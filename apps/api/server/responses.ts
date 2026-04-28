import type { Context } from 'hono'

export function success<T>(c: Context, data: T) {
  return c.json({ ok: true, data })
}

export function paginated<T>(c: Context, data: T[], total: number, page: number, perPage: number) {
  return c.json({
    ok: true,
    data,
    meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
  })
}

export function created<T>(c: Context, data: T) {
  return c.json({ ok: true, data }, 201)
}

export function accepted<T>(c: Context, data: T) {
  return c.json({ ok: true, data }, 202)
}

export function partial<T>(c: Context, data: T[], failures: string[]) {
  return c.json({ ok: true, data, partial: true, failures }, 207)
}
