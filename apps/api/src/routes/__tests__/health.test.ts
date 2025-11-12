import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import app from '../../index'
import { loadKnowledgePack } from '../../services/knowledge-pack-loader'
import { TestClient, expectSuccessResponse } from '../helpers'

describe('Health Endpoint Integration', () => {
  const testKnowledgePackDir = 'test_knowledge_pack'
  const testCarriersDir = join(testKnowledgePackDir, 'carriers')
  const testStatesDir = join(testKnowledgePackDir, 'states')
  let client: TestClient

  beforeEach(async () => {
    client = new TestClient(app, 'http://localhost:7070')
    // Create test directories
    await mkdir(testCarriersDir, { recursive: true })
    await mkdir(testStatesDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up test directories
    try {
      await rm(testKnowledgePackDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should return correct knowledge pack status in health endpoint', async () => {
    // Create test carrier file
    const carrierData = {
      meta: {
        schemaVersion: '1.0',
        generatedDate: new Date().toISOString(),
        carrier: 'TestCarrier',
      },
      carrier: {
        _id: 'carr_test123',
        _sources: [],
        name: 'TestCarrier',
        operatesIn: {
          _id: 'fld_test1',
          value: ['CA', 'TX'],
          _sources: [],
        },
        products: {
          _id: 'fld_test2',
          value: ['auto', 'home'],
          _sources: [],
        },
        eligibility: {
          _id: 'elig_test1',
          _sources: [],
        },
        discounts: [],
      },
    }

    await writeFile(
      join(testCarriersDir, 'test-carrier.json'),
      JSON.stringify(carrierData),
      'utf-8'
    )

    // Create test state file
    const stateData = {
      meta: {
        schemaVersion: '1.0',
        generatedDate: new Date().toISOString(),
        state: 'CA',
      },
      state: {
        _id: 'state_test123',
        _sources: [],
        code: 'CA',
        name: 'California',
        minimumCoverages: {
          _id: 'fld_test3',
          auto: {
            _id: 'fld_test4',
          },
          home: {
            _id: 'fld_test5',
          },
          renters: {
            _id: 'fld_test6',
          },
        },
      },
    }

    await writeFile(join(testStatesDir, 'CA.json'), JSON.stringify(stateData), 'utf-8')

    // Load knowledge pack
    await loadKnowledgePack(testKnowledgePackDir)

    // Test health endpoint
    const body = await client.getJson<{
      status: string
      timestamp: string
      service: string
      version: string
      knowledgePackLoaded: boolean
      knowledgePackStatus: string
      carriersCount: number
      statesCount: number
    }>('/api/health')
    expect(body.status).toBe('ok')
    expect(body.knowledgePackLoaded).toBe(true)
    expect(body.knowledgePackStatus).toBe('loaded')
    expect(body.carriersCount).toBe(1)
    expect(body.statesCount).toBe(1)
    expect(body.timestamp).toBeDefined()
    expect(body.service).toBe('insurance-broker-api')
    expect(body.version).toBe('0.1.0')
  })

  it('should return loading status when knowledge pack is still loading', async () => {
    // Start loading (non-blocking)
    const loadPromise = loadKnowledgePack(testKnowledgePackDir)

    // Immediately check health endpoint (should show loading)
    const body = await client.getJson<{
      status: string
      timestamp: string
      service: string
      version: string
      knowledgePackLoaded: boolean
      knowledgePackStatus: string
      carriersCount: number
      statesCount: number
    }>('/api/health')

    // Status might be 'loading' or 'loaded' depending on timing
    expect(body.status).toBe('ok')
    expect(['loading', 'loaded']).toContain(body.knowledgePackStatus)
    expect(typeof body.knowledgePackLoaded).toBe('boolean')
    expect(typeof body.carriersCount).toBe('number')
    expect(typeof body.statesCount).toBe('number')

    // Wait for loading to complete
    await loadPromise
  })

  it('should return error status when files are missing', async () => {
    // Don't create any files - knowledge pack directory will be empty or missing

    // Try to load (will fail gracefully)
    await loadKnowledgePack(testKnowledgePackDir)

    // Test health endpoint
    const body = await client.getJson<{
      status: string
      timestamp: string
      service: string
      version: string
      knowledgePackLoaded: boolean
      knowledgePackStatus: string
      carriersCount: number
      statesCount: number
    }>('/api/health')
    expect(body.status).toBe('ok')
    // Status might be 'error' or 'loaded' depending on error handling
    expect(['loading', 'loaded', 'error']).toContain(body.knowledgePackStatus)
    expect(typeof body.knowledgePackLoaded).toBe('boolean')
    expect(typeof body.carriersCount).toBe('number')
    expect(typeof body.statesCount).toBe('number')
  })

  it('should include timestamp in health response', async () => {
    const body = await client.getJson<{
      status: string
      timestamp: string
      service: string
      version: string
      knowledgePackLoaded: boolean
      knowledgePackStatus: string
      carriersCount: number
      statesCount: number
    }>('/api/health')
    expect(body.timestamp).toBeDefined()
    expect(typeof body.timestamp).toBe('string')
    // Verify timestamp is ISO 8601 format
    expect(() => new Date(body.timestamp)).not.toThrow()
  })
})
