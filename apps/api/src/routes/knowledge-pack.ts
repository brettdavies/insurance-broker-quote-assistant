/**
 * Knowledge Pack Query Routes
 *
 * GET endpoints for querying carriers and states from the knowledge pack.
 * Single Responsibility: Knowledge pack query endpoints only
 */

import { Hono } from 'hono'
import {
  carrierOperatesInState,
  getAllCarriersList,
  getAllStatesList,
  getCarrierByName,
  getCarrierProducts,
  getCarriersForState,
  getStateByCode,
} from '../services/knowledge-pack-rag'
import { getFieldValue } from '../utils/field-helpers'

/**
 * Create knowledge pack query routes
 *
 * @returns Hono route with knowledge pack query endpoints
 */
export function createKnowledgePackRoute(): Hono {
  const route = new Hono()

  // Carriers endpoints
  route.get('/api/carriers', (c) => {
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

  route.get('/api/carriers/:name', (c) => {
    const name = c.req.param('name')
    // getCarrierByName is now case-insensitive
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

  route.get('/api/carriers/:name/products', (c) => {
    const name = c.req.param('name')
    // getCarrierProducts uses getCarrierByName which is case-insensitive
    const products = getCarrierProducts(name)
    const carrier = getCarrierByName(name)

    if (products.length === 0 && !carrier) {
      return c.json({ error: 'Carrier not found' }, 404)
    }

    return c.json({
      carrier: carrier?.name || name, // Return actual carrier name from knowledge pack
      products,
      count: products.length,
    })
  })

  route.get('/api/carriers/:name/operates-in/:state', (c) => {
    const name = c.req.param('name')
    const stateCode = c.req.param('state').toUpperCase()
    // carrierOperatesInState is now case-insensitive for carrier name
    const operates = carrierOperatesInState(name, stateCode)
    const carrier = getCarrierByName(name) // Get actual carrier name

    return c.json({
      carrier: carrier?.name || name, // Return actual carrier name from knowledge pack
      state: stateCode,
      operatesIn: operates,
    })
  })

  // States endpoints
  route.get('/api/states', (c) => {
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

  route.get('/api/states/:code', (c) => {
    const code = c.req.param('code').toUpperCase()
    // getStateByCode normalizes to uppercase internally
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

  route.get('/api/states/:code/carriers', (c) => {
    const code = c.req.param('code').toUpperCase()
    const carriers = getCarriersForState(code)

    return c.json({
      state: code,
      carriers,
      count: carriers.length,
    })
  })

  return route
}
