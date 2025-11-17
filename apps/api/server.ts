import { serve } from 'bun'
import app from './src/index'

const PORT = process.env.API_PORT ? Number.parseInt(process.env.API_PORT, 10) : 7070

serve({
  fetch: app.fetch,
  port: PORT,
})

console.log(`🚀 API server running on http://localhost:${PORT}`)
