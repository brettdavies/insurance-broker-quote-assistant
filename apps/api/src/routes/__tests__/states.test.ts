import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createTestCarrier, createTestState } from '../../__tests__/fixtures/knowledge-pack'
import app from '../../index'
import { loadKnowledgePack } from '../../services/knowledge-pack-loader'
import { TestClient } from '../helpers'

describe('States Endpoints Integration', () => {
  const testKnowledgePackDir = 'test_knowledge_pack'
  const testCarriersDir = join(testKnowledgePackDir, 'carriers')
  const testStatesDir = join(testKnowledgePackDir, 'states')
  let client: TestClient

  beforeEach(async () => {
    client = new TestClient(app, 'http://localhost:7070')
    // Create test directories
    await mkdir(testCarriersDir, { recursive: true })
    await mkdir(testStatesDir, { recursive: true })

    // Create test data
    const ca = createTestState('CA', 'California')
    const tx = createTestState('TX', 'Texas')
    const geico = createTestCarrier('GEICO', ['CA', 'TX'], ['auto'])
    const progressive = createTestCarrier('Progressive', ['CA'], ['auto'])

    await writeFile(join(testStatesDir, 'CA.json'), JSON.stringify(ca), 'utf-8')
    await writeFile(join(testStatesDir, 'TX.json'), JSON.stringify(tx), 'utf-8')
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

  describe('GET /api/states', () => {
    it('should return all states', async () => {
      const body = await client.getJson<{
        states: Array<{ code: string; name: string; minimumCoverages: unknown }>
        count: number
      }>('/api/states')
      expect(body.count).toBe(2)
      expect(body.states).toHaveLength(2)
      expect(body.states.map((s) => s.code)).toContain('CA')
      expect(body.states.map((s) => s.code)).toContain('TX')
      expect(body.states.find((s) => s.code === 'CA')?.name).toBe('California')
      expect(body.states.find((s) => s.code === 'TX')?.name).toBe('Texas')
    })

    it('should include minimumCoverages in response', async () => {
      const body = await client.getJson<{
        states: Array<{ code: string; minimumCoverages: unknown }>
      }>('/api/states')
      const caState = body.states.find((s) => s.code === 'CA')
      expect(caState?.minimumCoverages).toBeDefined()
    })
  })

  describe('GET /api/states/:code', () => {
    it('should return state details by code', async () => {
      const body = await client.getJson<{
        code: string
        name: string
        minimumCoverages: unknown
      }>('/api/states/CA')
      expect(body.code).toBe('CA')
      expect(body.name).toBe('California')
      expect(body.minimumCoverages).toBeDefined()
    })

    it('should handle lowercase state codes', async () => {
      const body = await client.getJson<{
        code: string
        name: string
      }>('/api/states/ca')
      expect(body.code).toBe('CA')
      expect(body.name).toBe('California')
    })

    it('should return 404 for non-existent state', async () => {
      const res = await client.get('/api/states/XX')
      const body = (await res.json()) as { error: string }
      expect(res.status).toBe(404)
      expect(body.error).toBe('State not found')
    })
  })

  describe('GET /api/states/:code/carriers', () => {
    it('should return carriers operating in a state', async () => {
      const body = await client.getJson<{
        state: string
        carriers: string[]
        count: number
      }>('/api/states/CA/carriers')
      expect(body.state).toBe('CA')
      expect(body.count).toBe(2)
      expect(body.carriers).toContain('GEICO')
      expect(body.carriers).toContain('Progressive')
    })

    it('should return empty array for state with no carriers', async () => {
      const body = await client.getJson<{
        state: string
        carriers: string[]
        count: number
      }>('/api/states/XX/carriers')
      expect(body.state).toBe('XX')
      expect(body.count).toBe(0)
      expect(body.carriers).toHaveLength(0)
    })

    it('should handle lowercase state codes', async () => {
      const body = await client.getJson<{
        state: string
        carriers: string[]
      }>('/api/states/tx/carriers')
      expect(body.state).toBe('TX')
      expect(body.carriers).toContain('GEICO')
      expect(body.carriers).not.toContain('Progressive')
    })
  })
})
