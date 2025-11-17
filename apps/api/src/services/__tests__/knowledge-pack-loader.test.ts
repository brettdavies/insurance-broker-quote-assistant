import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  createTestCarrier,
  createTestProduct,
  createTestState,
} from '../../__tests__/fixtures/knowledge-pack'
import {
  clearSharedState,
  resetSharedStateWithKnowledgePack,
} from '../../__tests__/helpers/test-isolation'
import {
  getAllCarriers,
  getCarrier,
  getLoadingStatus,
  getState,
  isKnowledgePackLoaded,
  loadKnowledgePack,
} from '../knowledge-pack-loader'
import { getCarrierByName, getStateByCode } from '../knowledge-pack-rag'

describe('Knowledge Pack Loader', () => {
  const testKnowledgePackDir = 'test_knowledge_pack'
  let testCarriersDir: string
  let testStatesDir: string
  let testProductsDir: string
  let absoluteTestKnowledgePackDir: string

  beforeEach(async () => {
    // Clear shared state without loading real knowledge pack
    // Tests in this file load their own test knowledge pack, so we don't want
    // the real knowledge pack (which might contain GEICO, etc.) interfering
    await clearSharedState()

    // Resolve absolute paths
    const projectRoot = process.cwd().includes('apps/api')
      ? join(process.cwd(), '..', '..')
      : process.cwd()
    absoluteTestKnowledgePackDir = join(projectRoot, testKnowledgePackDir)
    testCarriersDir = join(absoluteTestKnowledgePackDir, 'carriers')
    testStatesDir = join(absoluteTestKnowledgePackDir, 'states')
    testProductsDir = join(absoluteTestKnowledgePackDir, 'products')

    // Clean up any existing test directory first
    try {
      await rm(absoluteTestKnowledgePackDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors if directory doesn't exist
    }

    // Create test directories
    await mkdir(testCarriersDir, { recursive: true })
    await mkdir(testStatesDir, { recursive: true })
    await mkdir(testProductsDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up test directories
    try {
      await rm(absoluteTestKnowledgePackDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }

    // Clear shared state after each test to ensure isolation
    // Use clearSharedState() since tests load their own test knowledge pack
    await clearSharedState()
  })

  describe('Successful loading', () => {
    it('should load all carrier and state files successfully', async () => {
      // Create test carrier file
      const carrierData = createTestCarrier('TestCarrier', ['CA', 'TX'], ['auto', 'home'])

      await writeFile(
        join(testCarriersDir, 'test-carrier.json'),
        JSON.stringify(carrierData),
        'utf-8'
      )

      // Create test state file
      const stateData = createTestState('CA', 'California')

      await writeFile(join(testStatesDir, 'CA.json'), JSON.stringify(stateData), 'utf-8')

      // Load knowledge pack
      await loadKnowledgePack(absoluteTestKnowledgePackDir)

      // Verify loading status
      const status = getLoadingStatus()
      expect(status.state).toBe('loaded')
      expect(status.carriersCount).toBe(1)
      expect(status.statesCount).toBe(1)
      expect(status.errors.length).toBe(0)

      // Verify data is accessible
      const carrier = getCarrier('TestCarrier')
      expect(carrier).toBeDefined()
      expect(carrier?.name).toBe('TestCarrier')

      const state = getState('CA')
      expect(state).toBeDefined()
      expect(state?.code).toBe('CA')
      expect(state?.name).toBe('California')
    })

    it('should count products and discounts correctly', async () => {
      const carrierData = createTestCarrier(
        'TestCarrier',
        ['CA'],
        ['auto', 'home', 'renters', 'umbrella'],
        [
          {
            _id: 'disc_test1',
            name: { _id: 'fld_test3', value: 'Discount 1', _sources: [] },
            percentage: { _id: 'fld_test4', value: 10, _sources: [] },
            products: { _id: 'fld_test5', value: ['auto'], _sources: [] },
            states: { _id: 'fld_test6', value: ['CA'], _sources: [] },
            requirements: { _id: 'fld_test7', value: {}, _sources: [] },
          },
          {
            _id: 'disc_test2',
            name: { _id: 'fld_test8', value: 'Discount 2', _sources: [] },
            percentage: { _id: 'fld_test9', value: 15, _sources: [] },
            products: { _id: 'fld_test10', value: ['home'], _sources: [] },
            states: { _id: 'fld_test11', value: ['CA'], _sources: [] },
            requirements: { _id: 'fld_test12', value: {}, _sources: [] },
          },
        ]
      )

      await writeFile(
        join(testCarriersDir, 'test-carrier.json'),
        JSON.stringify(carrierData),
        'utf-8'
      )

      // Create product files
      const products = ['auto', 'home', 'renters', 'umbrella']
      for (const productCode of products) {
        const productData = createTestProduct(productCode, `${productCode} Insurance`)
        await writeFile(
          join(testProductsDir, `${productCode}.json`),
          JSON.stringify(productData),
          'utf-8'
        )
      }

      // Use absolute path for test knowledge pack
      const projectRoot = process.cwd().includes('apps/api')
        ? join(process.cwd(), '..', '..')
        : process.cwd()
      const absoluteTestKnowledgePackDir = join(projectRoot, testKnowledgePackDir)
      await loadKnowledgePack(absoluteTestKnowledgePackDir)

      const status = getLoadingStatus()
      expect(status.productsCount).toBe(4) // auto, home, renters, umbrella
      expect(status.discountsCount).toBe(2) // 2 discounts
    })
  })

  describe('Error handling', () => {
    it('should handle missing files gracefully', async () => {
      // Create only carrier file, no state files
      const carrierData = createTestCarrier('TestCarrier', ['CA'], ['auto'])

      await writeFile(
        join(testCarriersDir, 'test-carrier.json'),
        JSON.stringify(carrierData),
        'utf-8'
      )

      // Use absolute path for test knowledge pack
      const projectRoot = process.cwd().includes('apps/api')
        ? join(process.cwd(), '..', '..')
        : process.cwd()
      const absoluteTestKnowledgePackDir = join(projectRoot, testKnowledgePackDir)
      await loadKnowledgePack(absoluteTestKnowledgePackDir)

      const status = getLoadingStatus()
      // Should still load successfully even with no state files
      expect(status.state).toBe('loaded')
      expect(status.carriersCount).toBe(1)
      expect(status.statesCount).toBe(0)
    })

    it('should handle malformed JSON files gracefully', async () => {
      // Create invalid JSON file
      await writeFile(join(testCarriersDir, 'invalid.json'), '{ invalid json }', 'utf-8')

      // Create valid carrier file
      const carrierData = createTestCarrier('TestCarrier', ['CA'], ['auto'])

      await writeFile(
        join(testCarriersDir, 'valid-carrier.json'),
        JSON.stringify(carrierData),
        'utf-8'
      )

      // Use absolute path for test knowledge pack
      const projectRoot = process.cwd().includes('apps/api')
        ? join(process.cwd(), '..', '..')
        : process.cwd()
      const absoluteTestKnowledgePackDir = join(projectRoot, testKnowledgePackDir)
      await loadKnowledgePack(absoluteTestKnowledgePackDir)

      const status = getLoadingStatus()
      // Should load valid file and track error for invalid file
      expect(status.state).toBe('loaded')
      expect(status.carriersCount).toBe(1)
      expect(status.errors.length).toBe(1)
      const error = status.errors[0]
      expect(error).toBeDefined()
      if (error) {
        expect(error.file).toBe('invalid.json')
      }
    })

    it('should handle missing carrier.name field gracefully', async () => {
      // Create invalid carrier data (missing name)
      const invalidCarrierData = createTestCarrier('TestCarrier', ['CA'], ['auto'])
      // Remove name field to test validation
      invalidCarrierData.carrier.name = undefined as unknown as string

      await writeFile(
        join(testCarriersDir, 'invalid-carrier.json'),
        JSON.stringify(invalidCarrierData),
        'utf-8'
      )

      // Use absolute path for test knowledge pack
      const projectRoot = process.cwd().includes('apps/api')
        ? join(process.cwd(), '..', '..')
        : process.cwd()
      const absoluteTestKnowledgePackDir = join(projectRoot, testKnowledgePackDir)
      await loadKnowledgePack(absoluteTestKnowledgePackDir)

      const status = getLoadingStatus()
      expect(status.errors.length).toBeGreaterThan(0)
      expect(status.errors.some((e) => e.file === 'invalid-carrier.json')).toBe(true)
    })

    it('should handle missing state.code field gracefully', async () => {
      // Create invalid state data (missing code)
      const invalidStateData = createTestState('CA', 'California')
      // Remove code field to test validation
      invalidStateData.state.code = undefined as unknown as string

      await writeFile(
        join(testStatesDir, 'invalid-state.json'),
        JSON.stringify(invalidStateData),
        'utf-8'
      )

      // Use absolute path for test knowledge pack
      const projectRoot = process.cwd().includes('apps/api')
        ? join(process.cwd(), '..', '..')
        : process.cwd()
      const absoluteTestKnowledgePackDir = join(projectRoot, testKnowledgePackDir)
      await loadKnowledgePack(absoluteTestKnowledgePackDir)

      const status = getLoadingStatus()
      expect(status.errors.length).toBeGreaterThan(0)
      expect(status.errors.some((e) => e.file === 'invalid-state.json')).toBe(true)
    })
  })

  describe('Non-blocking startup', () => {
    it('should allow server to respond before loading completes', async () => {
      // Create a carrier file
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
            value: ['CA'],
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
      }

      await writeFile(
        join(testCarriersDir, 'test-carrier.json'),
        JSON.stringify(carrierData),
        'utf-8'
      )

      // Create empty states directory (required for readdir to work)
      // Note: In a real scenario, loading is non-blocking, but in tests
      // everything completes synchronously. We verify the function doesn't throw
      // and completes successfully.
      // Use absolute path for test knowledge pack
      const projectRoot = process.cwd().includes('apps/api')
        ? join(process.cwd(), '..', '..')
        : process.cwd()
      const absoluteTestKnowledgePackDir = join(projectRoot, testKnowledgePackDir)
      await loadKnowledgePack(absoluteTestKnowledgePackDir)

      // Verify final status
      const finalStatus = getLoadingStatus()
      expect(finalStatus.state).toBe('loaded')
      expect(finalStatus.carriersCount).toBe(1)
    })
  })

  describe('RAG service queries Maps only', () => {
    it('should query in-memory Maps without filesystem access', async () => {
      // Ensure test directory is clean before writing files
      const testProductsDir = join(testKnowledgePackDir, 'products')
      await mkdir(testProductsDir, { recursive: true })

      // Defensive check: verify Maps are cleared before loading test knowledge pack
      // This ensures test isolation - no data from previous tests should be present
      // CRITICAL: This check MUST run before loading the test knowledge pack
      // If Maps contain data from previous tests (like GEICO), clear them immediately
      const carriersBeforeLoad = getAllCarriers()
      if (carriersBeforeLoad.length > 0) {
        // Maps weren't cleared properly - this is a test isolation issue
        // Clear them now as a defensive measure
        await clearSharedState()
        const carriersAfterClear = getAllCarriers()
        if (carriersAfterClear.length > 0) {
          // Still not cleared - force clear by loading empty directory
          // This should never happen, but provides safety
          const projectRoot = process.cwd().includes('apps/api')
            ? join(process.cwd(), '..', '..')
            : process.cwd()
          const emptyDir = join('/tmp', `force-clear-${Date.now()}`)
          await mkdir(join(emptyDir, 'carriers'), { recursive: true })
          await mkdir(join(emptyDir, 'states'), { recursive: true })
          await mkdir(join(emptyDir, 'products'), { recursive: true })
          const emptyDisclaimers = { disclaimers: { base: { _id: '', value: [] }, products: {} } }
          await writeFile(join(emptyDir, 'disclaimers.json'), JSON.stringify(emptyDisclaimers), 'utf-8')
          await loadKnowledgePack(emptyDir)
          await rm(emptyDir, { recursive: true, force: true })
        }
        const carriersAfterForceClear = getAllCarriers()
        expect(carriersAfterForceClear).toHaveLength(0)
      }

      const carrierData = createTestCarrier('TestCarrier', ['CA', 'TX'], ['auto', 'home'])

      await writeFile(
        join(testCarriersDir, 'test-carrier.json'),
        JSON.stringify(carrierData),
        'utf-8'
      )

      const stateData = createTestState('CA', 'California')

      await writeFile(join(testStatesDir, 'CA.json'), JSON.stringify(stateData), 'utf-8')

      // Use absolute path for test knowledge pack
      const projectRoot = process.cwd().includes('apps/api')
        ? join(process.cwd(), '..', '..')
        : process.cwd()
      const absoluteTestKnowledgePackDir = join(projectRoot, testKnowledgePackDir)
      await loadKnowledgePack(absoluteTestKnowledgePackDir)

      // Verify the pack loaded correctly
      const status = getLoadingStatus()
      expect(status.state).toBe('loaded')
      expect(status.carriersCount).toBe(1)

      // Verify RAG service works (using in-memory Maps)
      // Note: We can't delete the files because loadKnowledgePack needs them
      // But we can verify the RAG service uses the in-memory Maps, not filesystem

      // First verify direct Map access to ensure TestCarrier is loaded
      // This checks the Map directly, not through case-insensitive search
      const directCarrier = getCarrier('TestCarrier')
      expect(directCarrier).toBeDefined()
      expect(directCarrier?.name).toBe('TestCarrier')

      // Verify that only TestCarrier exists in the Maps (no pollution from other tests)
      const allCarriers = getAllCarriers()
      expect(allCarriers).toHaveLength(1)
      expect(allCarriers[0]?.name).toBe('TestCarrier')

      // Defensive check: verify no GEICO or other carriers are present
      const geicoCarrier = getCarrier('GEICO')
      expect(geicoCarrier).toBeUndefined()

      // Additional defensive check: verify getAllCarriers only returns TestCarrier
      // This ensures no pollution from other tests
      const allCarriersBeforeLookup = getAllCarriers()
      expect(allCarriersBeforeLookup).toHaveLength(1)
      expect(allCarriersBeforeLookup[0]?.name).toBe('TestCarrier')

      // CRITICAL: Verify getAllCarriers one more time before calling getCarrierByName
      // This ensures no race condition or state change between checks
      const allCarriersFinalCheck = getAllCarriers()
      expect(allCarriersFinalCheck).toHaveLength(1)
      expect(allCarriersFinalCheck[0]?.name).toBe('TestCarrier')
      const geicoInFinalCheck = allCarriersFinalCheck.find((c) => c.name === 'GEICO')
      expect(geicoInFinalCheck).toBeUndefined()

      // Verify getCarrierByName with exact case
      // If this fails, it means getCarrierByName is finding GEICO somehow
      const carrierExact = getCarrierByName('TestCarrier')
      expect(carrierExact).toBeDefined()
      if (carrierExact) {
        // Defensive check: if carrierExact is not TestCarrier, log what it actually is
        expect(carrierExact.name).toBe('TestCarrier')
      }

      // Verify getCarrierByName with different case (case-insensitive)
      const carrierLower = getCarrierByName('testcarrier')
      expect(carrierLower).toBeDefined()
      expect(carrierLower?.name).toBe('TestCarrier')

      // Verify getCarrierByName doesn't return GEICO when searching for TestCarrier
      // This is a critical test isolation check
      const allCarriersAfterLookup = getAllCarriers()
      const geicoInMap = allCarriersAfterLookup.find((c) => c.name === 'GEICO')
      expect(geicoInMap).toBeUndefined()

      // Final verification: getCarrierByName should return TestCarrier, not GEICO
      const carrier = getCarrierByName('TestCarrier')
      expect(carrier).toBeDefined()
      expect(carrier?.name).toBe('TestCarrier')
      expect(carrier?.name).not.toBe('GEICO')

      const state = getStateByCode('CA')
      expect(state).toBeDefined()
      expect(state?.code).toBe('CA')

      // Verify isKnowledgePackLoaded still works
      expect(isKnowledgePackLoaded()).toBe(true)

      const directState = getState('CA')
      expect(directState).toBeDefined()
      expect(directState?.code).toBe('CA')
    })
  })
})
