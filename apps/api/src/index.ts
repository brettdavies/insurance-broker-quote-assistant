import type { IntakeResult, UserProfile } from '@repo/shared'
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

// Intake endpoint - conversational field extraction
app.post('/api/intake', async (c) => {
  const body = await c.req.json()
  const { message, conversationHistory } = body as {
    message: string
    conversationHistory?: Array<{ role: string; content: string }>
  }

  // TODO: Replace with actual LLM-based Conversational Extractor (Story TBD)
  // For now, use basic key-value parsing as a stub
  const profile: UserProfile = {}
  const extractedFields: string[] = []

  // Simple key-value extraction regex
  const kvPattern = /(\w+):(\w+|\d+)/gi
  let match: RegExpExecArray | null = kvPattern.exec(message)

  while (match !== null) {
    const key = match[1]
    const value = match[2]
    if (!key || !value) continue
    const lowerKey = key.toLowerCase()

    // Map common aliases to field names
    const fieldMap: Record<string, string> = {
      k: 'kids',
      kids: 'kids',
      h: 'householdSize',
      household: 'householdSize',
      householdSize: 'householdSize',
      v: 'vehicles',
      vehicles: 'vehicles',
      s: 'state',
      state: 'state',
      a: 'age',
      age: 'age',
      l: 'productLine',
      line: 'productLine',
      product: 'productLine',
    }

    const fieldName = fieldMap[lowerKey]
    if (fieldName) {
      // Convert to appropriate type
      if (
        fieldName === 'age' ||
        fieldName === 'kids' ||
        fieldName === 'householdSize' ||
        fieldName === 'vehicles'
      ) {
        profile[fieldName] = Number.parseInt(value, 10)
      } else {
        profile[fieldName] = value
      }
      extractedFields.push(fieldName)
    }
    match = kvPattern.exec(message)
  }

  // Define all required fields for intake
  const allFields = [
    { name: 'State', fieldKey: 'state', alias: 's', priority: 'critical' as const },
    { name: 'Product Line', fieldKey: 'productLine', alias: 'l', priority: 'critical' as const },
    { name: 'Age', fieldKey: 'age', alias: 'a', priority: 'important' as const },
    {
      name: 'Kids',
      fieldKey: 'kids',
      alias: 'k',
      priority: 'important' as const,
    },
    {
      name: 'Household Size',
      fieldKey: 'householdSize',
      alias: 'h',
      priority: 'important' as const,
    },
    { name: 'Vehicles', fieldKey: 'vehicles', alias: 'v', priority: 'important' as const },
    { name: 'Owns Home', fieldKey: 'ownsHome', alias: 'o', priority: 'optional' as const },
    {
      name: 'Clean Record 3Yr',
      fieldKey: 'cleanRecord3Yr',
      alias: 'c',
      priority: 'optional' as const,
    },
  ]

  // Determine missing fields
  const missingFields = allFields
    .filter((field) => !profile[field.fieldKey])
    .map((field) => ({
      name: field.name,
      priority: field.priority,
      alias: field.alias,
    }))

  const result: IntakeResult = {
    profile,
    missingFields,
  }

  return c.json(result)
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
      intake: 'POST /api/intake',
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
