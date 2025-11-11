import type { PrefillPacket, RouteDecision, UserProfile } from '@repo/shared'
import { prefillPacketSchema, userProfileSchema } from '@repo/shared'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { z } from 'zod'
import { config } from './config/env'
import { errorHandler } from './middleware/error-handler'
import { createIntakeRoute } from './routes/intake'
import { createPolicyRoute } from './routes/policy'
import { validateOutput } from './services/compliance-filter'
import { ConversationalExtractor } from './services/conversational-extractor'
import { GeminiProvider } from './services/gemini-provider'
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
import { generatePrefillPacket, getMissingFields } from './services/prefill-generator'
import { routeToCarrier } from './services/routing-engine'
import { createDecisionTrace, logDecisionTrace } from './utils/decision-trace'
import { getFieldValue } from './utils/field-helpers'
import { logError, logInfo } from './utils/logger'

const app = new Hono()

// CORS middleware (allows frontend to call API)
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Frontend dev servers
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
)

// Global error handler middleware (must be after CORS)
app.use('*', errorHandler)

const PORT = config.apiPort

// Initialize LLM provider and extractor
const llmProvider = new GeminiProvider(
  config.geminiApiKey || undefined, // Empty string becomes undefined
  config.geminiModel,
  config.llmTimeoutMs
)
const conversationalExtractor = new ConversationalExtractor(llmProvider)

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
const intakeRoute = createIntakeRoute(conversationalExtractor)
app.route('/', intakeRoute)

// Policy upload endpoint - policy document parsing
const policyRoute = createPolicyRoute(conversationalExtractor, llmProvider)
app.route('/', policyRoute)

// Generate prefill endpoint (flattened from /api/intake/generate-prefill for Hono RPC client compatibility)
app.post('/api/generate-prefill', async (c) => {
  try {
    // Parse and validate request body
    const body = await c.req.json()
    const validationResult = z
      .object({
        profile: userProfileSchema,
      })
      .safeParse(body)

    if (!validationResult.success) {
      return c.json(
        {
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid request body',
            details: validationResult.error.errors,
          },
        },
        400
      )
    }

    const { profile } = validationResult.data

    // Call routing engine to get RouteDecision (if not already available)
    let routeDecision: RouteDecision
    try {
      routeDecision = routeToCarrier(profile)
    } catch (error) {
      // Handle routing errors gracefully - still generate prefill with available data
      await logError('Routing engine error in prefill generation', error as Error, {
        type: 'routing_error',
      })
      // Create minimal route decision for prefill generation
      routeDecision = {
        primaryCarrier: 'Unknown',
        eligibleCarriers: [],
        confidence: 0,
        rationale: 'Routing unavailable - prefill generated with available data',
        citations: [],
      }
    }

    // Call compliance filter to get disclaimers for state/product
    let disclaimers: string[] = []
    try {
      const complianceResult = validateOutput(
        '',
        profile.state || undefined,
        profile.productLine || undefined
      )
      disclaimers = complianceResult.disclaimers || []
    } catch (error) {
      // Handle compliance filter errors gracefully
      await logError('Compliance filter error in prefill generation', error as Error, {
        type: 'compliance_error',
      })
      // Use empty disclaimers array
      disclaimers = []
    }

    // Determine missing fields: compare UserProfile against required fields per product type
    const missingFields = getMissingFields(profile)

    // Call prefillGenerator.generatePrefillPacket
    let prefillPacket: PrefillPacket
    try {
      prefillPacket = generatePrefillPacket(profile, routeDecision, missingFields, disclaimers)
    } catch (error) {
      // Handle prefill generation errors gracefully
      await logError('Prefill generation error', error as Error, {
        type: 'prefill_error',
      })
      // Return proper error response instead of throwing
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to generate prefill packet'
      return c.json(
        {
          error: {
            code: 'PREFILL_GENERATION_ERROR',
            message: errorMessage,
            timestamp: new Date().toISOString(),
          },
        },
        400
      )
    }

    // Validate prefill packet against schema using Zod
    const validationResult2 = prefillPacketSchema.safeParse(prefillPacket)
    if (!validationResult2.success) {
      await logError('Prefill packet validation failed', new Error('Invalid prefill packet'), {
        type: 'validation_error',
        errors: validationResult2.error.errors,
      })
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Generated prefill packet failed validation',
            details: validationResult2.error.errors,
          },
        },
        500
      )
    }

    // Log decision trace for pre-fill generation
    const trace = createDecisionTrace(
      'prefill_generation',
      {
        profile: {
          state: profile.state,
          productLine: profile.productLine,
          name: profile.name,
        },
      },
      {
        method: 'prefill_generator',
        fields: {
          missingFieldsCount: missingFields.length,
          prefillPacketSize: JSON.stringify(prefillPacket).length,
          timestamp: prefillPacket.generatedAt,
        },
      },
      undefined, // llmCalls
      routeDecision
        ? {
            eligibleCarriers: routeDecision.eligibleCarriers,
            primaryCarrier: routeDecision.primaryCarrier,
            matchScores: routeDecision.matchScores,
            confidence: routeDecision.confidence,
            rationale: routeDecision.rationale,
            citations: routeDecision.citations,
            rulesEvaluated: routeDecision.citations.map((c) => c.file),
          }
        : undefined,
      {
        passed: true,
        violations: [],
        disclaimersAdded: disclaimers.length,
        state: profile.state || undefined,
        productLine: profile.productLine || undefined,
      }
    )

    await logDecisionTrace(trace)

    // Return PrefillPacket in response
    return c.json(prefillPacket)
  } catch (error) {
    // Log error (error handler middleware will catch and format response)
    await logError('Generate prefill endpoint error', error as Error, {
      type: 'prefill_endpoint_error',
    })

    // Re-throw to let error handler middleware handle it
    throw error
  }
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
