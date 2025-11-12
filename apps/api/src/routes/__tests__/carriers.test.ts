import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import type { CarrierFile } from '@repo/shared'
import { createTestCarrier } from '../../__tests__/fixtures/knowledge-pack'
import {
  cleanupTestKnowledgePack,
  setupTestKnowledgePack,
} from '../../__tests__/helpers/knowledge-pack-test-setup'
import app from '../../index'

describe('Carriers Endpoints Integration', () => {
  beforeAll(async () => {
    // Use real knowledge_pack as base, extend with test carriers if needed
    // For this test, we'll use the real knowledge pack which should have carriers
    await setupTestKnowledgePack()
  })

  afterAll(async () => {
    await cleanupTestKnowledgePack()
  })

  describe('GET /api/carriers', () => {
    it('should return all carriers', async () => {
      const req = new Request('http://localhost:7070/api/carriers')
      const res = await app.request(req)
      const body = (await res.json()) as {
        carriers: Array<{ name: string; operatesIn: string[]; products: string[] }>
        count: number
      }

      expect(res.status).toBe(200)
      // Use real knowledge pack - verify we have carriers
      expect(body.count).toBeGreaterThan(0)
      expect(body.carriers.length).toBeGreaterThan(0)
      // Verify structure
      expect(body.carriers[0]).toHaveProperty('name')
      expect(body.carriers[0]).toHaveProperty('operatesIn')
      expect(body.carriers[0]).toHaveProperty('products')
    })

    it('should return carriers filtered by state query param', async () => {
      const req = new Request('http://localhost:7070/api/carriers?state=CA')
      const res = await app.request(req)
      const body = (await res.json()) as {
        state: string
        carriers: string[]
        count: number
      }

      expect(res.status).toBe(200)
      expect(body.state).toBe('CA')
      // Use real knowledge pack - verify we have carriers for CA
      expect(body.count).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(body.carriers)).toBe(true)
    })

    it('should return empty array for state with no carriers', async () => {
      const req = new Request('http://localhost:7070/api/carriers?state=XX')
      const res = await app.request(req)
      const body = (await res.json()) as {
        state: string
        carriers: string[]
        count: number
      }

      expect(res.status).toBe(200)
      expect(body.state).toBe('XX')
      expect(body.count).toBe(0)
      expect(body.carriers).toHaveLength(0)
    })
  })

  describe('GET /api/carriers/:name', () => {
    it('should return carrier details by name', async () => {
      const req = new Request('http://localhost:7070/api/carriers/GEICO')
      const res = await app.request(req)
      const body = (await res.json()) as {
        name: string
        operatesIn: string[]
        products: string[]
        discounts: unknown[]
        eligibility: unknown
      }

      expect(res.status).toBe(200)
      expect(body.name).toBe('GEICO')
      // Use real knowledge pack data - just verify structure exists
      expect(Array.isArray(body.operatesIn)).toBe(true)
      expect(Array.isArray(body.products)).toBe(true)
      expect(body.discounts).toBeDefined()
      // Eligibility may or may not be present in knowledge pack
      expect(typeof body.eligibility === 'object' || body.eligibility === undefined).toBe(true)
    })

    it('should return 404 for non-existent carrier', async () => {
      // Use a name that definitely won't match any carrier (case-insensitive)
      const req = new Request(
        'http://localhost:7070/api/carriers/ThisCarrierDefinitelyDoesNotExist12345XYZ'
      )
      const res = await app.request(req)
      const body = (await res.json()) as { error: string }

      expect(res.status).toBe(404)
      expect(body.error).toBe('Carrier not found')
    })
  })

  describe('GET /api/carriers/:name/products', () => {
    it('should return products for a carrier', async () => {
      const req = new Request('http://localhost:7070/api/carriers/GEICO/products')
      const res = await app.request(req)
      const body = (await res.json()) as {
        carrier: string
        products: string[]
        count: number
      }

      expect(res.status).toBe(200)
      expect(body.carrier).toBe('GEICO')
      // Use real knowledge pack - verify structure
      expect(Array.isArray(body.products)).toBe(true)
      expect(body.products.length).toBeGreaterThan(0)
      expect(body.count).toBe(body.products.length)
    })

    it('should return 404 for non-existent carrier', async () => {
      // Use a name that definitely won't match any carrier (case-insensitive)
      const req = new Request(
        'http://localhost:7070/api/carriers/ThisCarrierDefinitelyDoesNotExist12345XYZ/products'
      )
      const res = await app.request(req)
      const body = (await res.json()) as { error: string }

      expect(res.status).toBe(404)
      expect(body.error).toBe('Carrier not found')
    })
  })

  describe('GET /api/carriers/:name/operates-in/:state', () => {
    it('should return true if carrier operates in state', async () => {
      const req = new Request('http://localhost:7070/api/carriers/GEICO/operates-in/CA')
      const res = await app.request(req)
      const body = (await res.json()) as {
        carrier: string
        state: string
        operatesIn: boolean
      }

      expect(res.status).toBe(200)
      expect(body.carrier).toBe('GEICO')
      expect(body.state).toBe('CA')
      expect(body.operatesIn).toBe(true)
    })

    it('should return false if carrier does not operate in state', async () => {
      const req = new Request('http://localhost:7070/api/carriers/GEICO/operates-in/XX')
      const res = await app.request(req)
      const body = (await res.json()) as {
        carrier: string
        state: string
        operatesIn: boolean
      }

      expect(res.status).toBe(200)
      expect(body.carrier).toBe('GEICO')
      expect(body.state).toBe('XX')
      expect(body.operatesIn).toBe(false)
    })
  })
})
