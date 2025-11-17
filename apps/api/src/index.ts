import { Hono } from 'hono'
import { config } from './config/env'
import { setupMiddleware } from './middleware/setup'
import { registerRoutes } from './routes'
import {
  initializeConversationalExtractor,
  initializeKnowledgePack,
  initializeLLMProvider,
} from './services/initialization'
import { getLoadingStatus, isKnowledgePackLoaded } from './services/knowledge-pack-loader'
import { logError, logInfo } from './utils/logger'

const app = new Hono()

// Setup middleware
setupMiddleware(app)

const PORT = config.apiPort

// Initialize services
const llmProvider = initializeLLMProvider()
const conversationalExtractor = initializeConversationalExtractor(llmProvider)
initializeKnowledgePack()

// Log server startup
logInfo('Starting Hono API server', {
  type: 'server_start',
  port: PORT,
  url: `http://localhost:${PORT}`,
}).catch((error) => {
  // Fallback to console.error if logger fails (shouldn't happen, but safe fallback)
  // eslint-disable-next-line no-console
  console.error('Failed to log server startup:', error)
})

// Health check endpoint
app.get('/api/health', (c) => {
  const loadingStatus = getLoadingStatus()

  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'insurance-broker-api',
    version: '0.1.0',
    knowledgePackLoaded: isKnowledgePackLoaded(),
    knowledgePackStatus: loadingStatus.state,
    carriersCount: loadingStatus.carriersCount,
    statesCount: loadingStatus.statesCount,
  })
})

// Register all routes
registerRoutes(app, conversationalExtractor, llmProvider)

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Insurance Broker Quote Assistant API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
      intake: 'POST /api/intake',
      'generate-prefill': 'POST /api/generate-prefill',
      carriers: '/api/carriers',
      'carriers-by-name': '/api/carriers/:name',
      'carriers-by-state': '/api/carriers?state=CA',
      states: '/api/states',
      'states-by-code': '/api/states/:code',
      'carriers-for-state': '/api/states/:code/carriers',
    },
  })
})

export default app
export type AppType = typeof app
