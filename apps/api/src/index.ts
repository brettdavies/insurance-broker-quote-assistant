import { Hono } from 'hono'
import {
  getLoadingStatus,
  isKnowledgePackLoaded,
  loadKnowledgePack,
} from './services/knowledge-pack-loader'
import {
  carrierOperatesInState,
  getAllCarriersList,
  getAllStatesList,
  getCarrierByName,
  getCarrierProducts,
  getCarriersForState,
  getStateByCode,
} from './services/knowledge-pack-rag'
import { getFieldValue } from './utils/field-helpers'
import { logInfo } from './utils/logger'

const app = new Hono()

const PORT = process.env.API_PORT ? Number.parseInt(process.env.API_PORT, 10) : 7070

// Initialize knowledge pack loading on startup (non-blocking)
loadKnowledgePack().catch((error) => {
  console.error('Failed to initialize knowledge pack:', error)
})

// Log server startup
logInfo('Starting Hono API server', {
  type: 'server_start',
  port: PORT,
  url: `http://localhost:${PORT}`,
}).catch((error) => {
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

// Knowledge Pack Query Endpoints
app.get('/api/carriers', (c) => {
  const stateCode = c.req.query('state')

  // If state query param provided, return carriers for that state
  if (stateCode) {
    const carriers = getCarriersForState(stateCode.toUpperCase())
    return c.json({
      state: stateCode.toUpperCase(),
      carriers,
      count: carriers.length,
    })
  }

  // Otherwise return all carriers
  const carriers = getAllCarriersList()
  return c.json({
    carriers: carriers.map((carrier) => ({
      name: carrier.name,
      operatesIn: getFieldValue(carrier.operatesIn, []),
      products: getFieldValue(carrier.products, []),
    })),
    count: carriers.length,
  })
})

app.get('/api/carriers/:name', (c) => {
  const name = c.req.param('name')
  const carrier = getCarrierByName(name)

  if (!carrier) {
    return c.json({ error: 'Carrier not found' }, 404)
  }

  return c.json({
    name: carrier.name,
    operatesIn: getFieldValue(carrier.operatesIn, []),
    products: getFieldValue(carrier.products, []),
    discounts: carrier.discounts || [],
    eligibility: carrier.eligibility,
  })
})

app.get('/api/carriers/:name/products', (c) => {
  const name = c.req.param('name')
  const products = getCarrierProducts(name)

  if (products.length === 0 && !getCarrierByName(name)) {
    return c.json({ error: 'Carrier not found' }, 404)
  }

  return c.json({
    carrier: name,
    products,
    count: products.length,
  })
})

app.get('/api/carriers/:name/operates-in/:state', (c) => {
  const name = c.req.param('name')
  const stateCode = c.req.param('state').toUpperCase()
  const operates = carrierOperatesInState(name, stateCode)

  return c.json({
    carrier: name,
    state: stateCode,
    operatesIn: operates,
  })
})

app.get('/api/states', (c) => {
  const states = getAllStatesList()
  return c.json({
    states: states.map((state) => ({
      code: state.code,
      name: state.name,
      minimumCoverages: state.minimumCoverages,
    })),
    count: states.length,
  })
})

app.get('/api/states/:code', (c) => {
  const code = c.req.param('code').toUpperCase()
  const state = getStateByCode(code)

  if (!state) {
    return c.json({ error: 'State not found' }, 404)
  }

  return c.json({
    code: state.code,
    name: state.name,
    minimumCoverages: state.minimumCoverages,
  })
})

app.get('/api/states/:code/carriers', (c) => {
  const code = c.req.param('code').toUpperCase()
  const carriers = getCarriersForState(code)

  return c.json({
    state: code,
    carriers,
    count: carriers.length,
  })
})

// Root endpoint
app.get('/', (c) => {
  return c.json({
    message: 'Insurance Broker Quote Assistant API',
    version: '0.1.0',
    endpoints: {
      health: '/api/health',
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
