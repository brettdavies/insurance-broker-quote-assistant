import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import app from '../../index'
import { loadKnowledgePack } from '../../services/knowledge-pack-loader'

describe('States Endpoints Integration', () => {
  const testKnowledgePackDir = 'test_knowledge_pack'
  const testCarriersDir = join(testKnowledgePackDir, 'carriers')
  const testStatesDir = join(testKnowledgePackDir, 'states')

  const createTestState = (code: string, name: string) => ({
    meta: {
      schemaVersion: '1.0',
      generatedDate: new Date().toISOString(),
      state: code,
    },
    state: {
      _id: `state_${code.toLowerCase()}`,
      _sources: [],
      code,
      name,
      minimumCoverages: {
        _id: 'fld_test1',
        auto: {
          _id: 'fld_test2',
          bodilyInjuryPerPerson: {
            _id: 'fld_test3',
            value: 25000,
            _sources: [],
          },
          bodilyInjuryPerAccident: {
            _id: 'fld_test4',
            value: 50000,
            _sources: [],
          },
          propertyDamage: {
            _id: 'fld_test5',
            value: 10000,
            _sources: [],
          },
        },
        home: {
          _id: 'fld_test6',
        },
        renters: {
          _id: 'fld_test7',
        },
      },
    },
  })

  const createTestCarrier = (name: string, operatesIn: string[]) => ({
    meta: {
      schemaVersion: '1.0',
      generatedDate: new Date().toISOString(),
      carrier: name,
    },
    carrier: {
      _id: `carr_${name.toLowerCase()}`,
      _sources: [],
      name,
      operatesIn: {
        _id: 'fld_test1',
        value: operatesIn,
        _sources: [],
      },
      products: {
        _id: 'fld_test2',
        value: ['auto'],
        _sources: [],
      },
      eligibility: {
        _id: 'elig_test1',
        _sources: [],
      },
      discounts: [],
    },
  })

  beforeEach(async () => {
    // Create test directories
    await mkdir(testCarriersDir, { recursive: true })
    await mkdir(testStatesDir, { recursive: true })

    // Create test data
    const ca = createTestState('CA', 'California')
    const tx = createTestState('TX', 'Texas')
    const geico = createTestCarrier('GEICO', ['CA', 'TX'])
    const progressive = createTestCarrier('Progressive', ['CA'])

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
      const req = new Request('http://localhost:7070/api/states')
      const res = await app.request(req)
      const body = (await res.json()) as {
        states: Array<{ code: string; name: string; minimumCoverages: unknown }>
        count: number
      }

      expect(res.status).toBe(200)
      expect(body.count).toBe(2)
      expect(body.states).toHaveLength(2)
      expect(body.states.map((s) => s.code)).toContain('CA')
      expect(body.states.map((s) => s.code)).toContain('TX')
      expect(body.states.find((s) => s.code === 'CA')?.name).toBe('California')
      expect(body.states.find((s) => s.code === 'TX')?.name).toBe('Texas')
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
      expect(body.count).toBe(2)
      expect(body.carriers).toContain('GEICO')
      expect(body.carriers).toContain('Progressive')
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
      expect(body.carriers).toContain('GEICO')
      expect(body.carriers).not.toContain('Progressive')
    })
  })
})
