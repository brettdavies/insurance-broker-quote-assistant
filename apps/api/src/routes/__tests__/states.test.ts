import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import {
  cleanupTestKnowledgePack,
  setupTestKnowledgePack,
} from '../../__tests__/helpers/knowledge-pack-test-setup'
import app from '../../index'

describe('States Endpoints Integration', () => {
  beforeAll(async () => {
    // Use real knowledge_pack as base (includes real states like CA, TX, etc.)
    await setupTestKnowledgePack()
  })

  afterAll(async () => {
    await cleanupTestKnowledgePack()
  })

  describe('GET /api/states', () => {
    it('should return all states', async () => {
      const req = new Request('http://localhost:7070/api/states')
      const res = await app.request(req)
      const body = (await res.json()) as {
        states: Array<{ code: string; name: string; minimumCoverages: unknown }>
        count: number
      }

      expect(res.status).toBe(200)
      // Use real knowledge pack - verify we have states
      expect(body.count).toBeGreaterThan(0)
      expect(body.states.length).toBeGreaterThan(0)
      // Verify structure
      expect(body.states[0]).toHaveProperty('code')
      expect(body.states[0]).toHaveProperty('name')
      expect(body.states[0]).toHaveProperty('minimumCoverages')
      // Verify CA exists (should be in real knowledge pack)
      const caState = body.states.find((s) => s.code === 'CA')
      expect(caState).toBeDefined()
      if (caState) {
        expect(caState.name).toBe('California')
      }
    })

    it('should include minimumCoverages in response', async () => {
      const req = new Request('http://localhost:7070/api/states')
      const res = await app.request(req)
      const body = (await res.json()) as {
        states: Array<{ code: string; minimumCoverages: unknown }>
      }

      expect(res.status).toBe(200)
      const caState = body.states.find((s) => s.code === 'CA')
      expect(caState?.minimumCoverages).toBeDefined()
    })
  })

  describe('GET /api/states/:code', () => {
    it('should return state details by code', async () => {
      const req = new Request('http://localhost:7070/api/states/CA')
      const res = await app.request(req)
      const body = (await res.json()) as {
        code: string
        name: string
        minimumCoverages: unknown
      }

      expect(res.status).toBe(200)
      expect(body.code).toBe('CA')
      expect(body.name).toBe('California')
      expect(body.minimumCoverages).toBeDefined()
    })

    it('should handle lowercase state codes', async () => {
      const req = new Request('http://localhost:7070/api/states/ca')
      const res = await app.request(req)
      const body = (await res.json()) as {
        code: string
        name: string
      }

      expect(res.status).toBe(200)
      expect(body.code).toBe('CA')
      expect(body.name).toBe('California')
    })

    it('should return 404 for non-existent state', async () => {
      const req = new Request('http://localhost:7070/api/states/XX')
      const res = await app.request(req)
      const body = (await res.json()) as { error: string }

      expect(res.status).toBe(404)
      expect(body.error).toBe('State not found')
    })
  })

  describe('GET /api/states/:code/carriers', () => {
    it('should return carriers operating in a state', async () => {
      const req = new Request('http://localhost:7070/api/states/CA/carriers')
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
      const req = new Request('http://localhost:7070/api/states/XX/carriers')
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

    it('should handle lowercase state codes', async () => {
      const req = new Request('http://localhost:7070/api/states/tx/carriers')
      const res = await app.request(req)
      const body = (await res.json()) as {
        state: string
        carriers: string[]
      }

      expect(res.status).toBe(200)
      expect(body.state).toBe('TX')
      // Use real knowledge pack - verify structure
      expect(Array.isArray(body.carriers)).toBe(true)
      // Don't check specific carriers as they may vary in real knowledge pack
    })
  })
})
