import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createTestCarrier } from '../../__tests__/fixtures/knowledge-pack'
import app from '../../index'
import { loadKnowledgePack } from '../../services/knowledge-pack-loader'

describe('Carriers Endpoints Integration', () => {
  const testKnowledgePackDir = 'test_knowledge_pack'
  const testCarriersDir = join(testKnowledgePackDir, 'carriers')
  const testStatesDir = join(testKnowledgePackDir, 'states')

  beforeEach(async () => {
    // Create test directories
    await mkdir(testCarriersDir, { recursive: true })
    await mkdir(testStatesDir, { recursive: true })

    // Create test data
    const geico = createTestCarrier('GEICO', ['CA', 'TX', 'FL'], ['auto', 'home'])
    const progressive = createTestCarrier('Progressive', ['CA', 'TX'], ['auto', 'renters'])

    await writeFile(join(testCarriersDir, 'geico.json'), JSON.stringify(geico), 'utf-8')
    await writeFile(join(testCarriersDir, 'progressive.json'), JSON.stringify(progressive), 'utf-8')

    // Load knowledge pack from test directory
    await loadKnowledgePack(testKnowledgePackDir)
  })

  afterEach(async () => {
    // Clean up test directories
    try {
      await rm(testKnowledgePackDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
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
      expect(body.count).toBe(2)
      expect(body.carriers).toHaveLength(2)
      expect(body.carriers.map((c) => c.name)).toContain('GEICO')
      expect(body.carriers.map((c) => c.name)).toContain('Progressive')
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
      expect(body.count).toBe(2)
      expect(body.carriers).toContain('GEICO')
      expect(body.carriers).toContain('Progressive')
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
      expect(body.operatesIn).toEqual(['CA', 'TX', 'FL'])
      expect(body.products).toEqual(['auto', 'home'])
      expect(body.discounts).toBeDefined()
      expect(body.eligibility).toBeDefined()
    })

    it('should return 404 for non-existent carrier', async () => {
      const req = new Request('http://localhost:7070/api/carriers/INVALID')
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
      expect(body.products).toEqual(['auto', 'home'])
      expect(body.count).toBe(2)
    })

    it('should return 404 for non-existent carrier', async () => {
      const req = new Request('http://localhost:7070/api/carriers/INVALID/products')
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
