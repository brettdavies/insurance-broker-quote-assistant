import { hc } from 'hono/client'
// AppType will be imported from @repo/api after Story 1.3
// For now, using a placeholder type
// biome-ignore lint/suspicious/noExplicitAny: Placeholder type until Story 1.3
type AppType = any

export const api = hc<AppType>('http://localhost:7070')
