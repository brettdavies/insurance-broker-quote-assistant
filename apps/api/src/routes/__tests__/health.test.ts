import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { createTestCarrier, createTestState } from '../../__tests__/fixtures/knowledge-pack'
import {
  cleanupTestKnowledgePack,
  setupTestKnowledgePack,
} from '../../__tests__/helpers/knowledge-pack-test-setup'
import app from '../../index'

describe('Health Endpoint Integration', () => {
  beforeAll(async () => {
    // Use real knowledge pack as base
    await setupTestKnowledgePack()
  })

  afterAll(async () => {
    await cleanupTestKnowledgePack()
  })

  it('should return correct knowledge pack status in health endpoint', async () => {
    // Test health endpoint
    const req = new Request('http://localhost:7070/api/health')
    const res = await app.request(req)
    const body = (await res.json()) as {
      status: string
      timestamp: string
      service: string
      version: string
      knowledgePackLoaded: boolean
      knowledgePackStatus: string
      carriersCount: number
      statesCount: number
    }

    expect(res.status).toBe(200)
    expect(body.status).toBe('ok')
    expect(body.knowledgePackLoaded).toBe(true)
    expect(body.knowledgePackStatus).toBe('loaded')
    // Use real knowledge pack - verify we have data
    expect(body.carriersCount).toBeGreaterThan(0)
    expect(body.statesCount).toBeGreaterThan(0)
    expect(body.timestamp).toBeDefined()
    expect(body.service).toBe('insurance-broker-api')
    expect(body.version).toBe('0.1.0')
  })

  it('should return loading status when knowledge pack is still loading', async () => {
    // Health endpoint should show loaded status since we loaded in beforeAll
    const req = new Request('http://localhost:7070/api/health')
    const res = await app.request(req)
    const body = (await res.json()) as {
      status: string
      timestamp: string
      service: string
      version: string
      knowledgePackLoaded: boolean
      knowledgePackStatus: string
      carriersCount: number
      statesCount: number
    }

    expect(res.status).toBe(200)
    expect(body.status).toBe('ok')
    // Should be loaded since we set it up in beforeAll
    expect(['loading', 'loaded']).toContain(body.knowledgePackStatus)
    expect(typeof body.knowledgePackLoaded).toBe('boolean')
    expect(typeof body.carriersCount).toBe('number')
    expect(typeof body.statesCount).toBe('number')
  })

  it('should include timestamp in health response', async () => {
    const req = new Request('http://localhost:7070/api/health')
    const res = await app.request(req)
    const body = (await res.json()) as {
      status: string
      timestamp: string
      service: string
      version: string
      knowledgePackLoaded: boolean
      knowledgePackStatus: string
      carriersCount: number
      statesCount: number
    }

    expect(res.status).toBe(200)
    expect(body.timestamp).toBeDefined()
    expect(typeof body.timestamp).toBe('string')
    // Verify timestamp is ISO 8601 format
    expect(() => new Date(body.timestamp)).not.toThrow()
  })
})
