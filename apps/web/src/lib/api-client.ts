import { hc } from 'hono/client'
import type { AppType } from '../../../api/src/index'

export const api = hc<AppType>('http://localhost:7070')
