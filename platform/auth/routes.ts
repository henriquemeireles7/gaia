import { Hono } from 'hono'
import type { AppEnv } from '../types'
import { auth } from './config'

export const authRoutes = new Hono<AppEnv>().on(['POST', 'GET'], '/*', (c) => {
  return auth.handler(c.req.raw)
})
