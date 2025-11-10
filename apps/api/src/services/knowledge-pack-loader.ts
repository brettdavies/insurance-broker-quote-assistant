/**
 * Knowledge Pack Loader Service
 *
 * Loads all knowledge pack JSON files into memory at startup.
 * Provides non-blocking async loading with error handling.
 */

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Carrier, CarrierFile, State, StateFile } from '@repo/shared'
import { logError, logInfo, logWarn } from '../utils/logger'

/**
 * Loading state for knowledge pack
 */
export type LoadingState = 'loading' | 'loaded' | 'error'

/**
 * Loading status with counts and error tracking
 */
export interface LoadingStatus {
  state: LoadingState
  carriersCount: number
  statesCount: number
  productsCount: number
  discountsCount: number
  errors: Array<{ file: string; error: string }>
}

/**
 * In-memory storage for carriers (keyed by carrier name)
 */
const carriersMap = new Map<string, Carrier>()

/**
 * In-memory storage for states (keyed by state code)
 */
const statesMap = new Map<string, State>()

/**
 * Current loading status
 */
let loadingStatus: LoadingStatus = {
  state: 'loading',
  carriersCount: 0,
  statesCount: 0,
  productsCount: 0,
  discountsCount: 0,
  errors: [],
}

/**
 * Get the current loading status
 */
export function getLoadingStatus(): LoadingStatus {
  return { ...loadingStatus }
}

/**
 * Get a carrier by name
 */
export function getCarrier(name: string): Carrier | undefined {
  return carriersMap.get(name)
}

/**
 * Get a state by code
 */
export function getState(code: string): State | undefined {
  return statesMap.get(code)
}

/**
 * Get all carriers
 */
export function getAllCarriers(): Carrier[] {
  return Array.from(carriersMap.values())
}

/**
 * Get all states
 */
export function getAllStates(): State[] {
  return Array.from(statesMap.values())
}

/**
 * Load a single carrier file
 */
async function loadCarrierFile(filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const data: CarrierFile = JSON.parse(content)

    // Validate required fields
    if (!data.carrier || !data.carrier.name) {
      throw new Error('Invalid carrier file: missing carrier.name')
    }

    // Store in map keyed by carrier name
    carriersMap.set(data.carrier.name, data.carrier)

    // Count products and discounts
    const products = data.carrier.products?.value || []
    const discounts = data.carrier.discounts || []

    loadingStatus.carriersCount++
    loadingStatus.productsCount += products.length
    loadingStatus.discountsCount += discounts.length
  } catch (error) {
    const fileName = filePath.split('/').pop() || filePath
    const errorMessage = error instanceof Error ? error.message : String(error)
    loadingStatus.errors.push({ file: fileName, error: errorMessage })
    await logWarn('Failed to load carrier file', { file: fileName, error: errorMessage })
  }
}

/**
 * Load a single state file
 */
async function loadStateFile(filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const data: StateFile = JSON.parse(content)

    // Validate required fields
    if (!data.state || !data.state.code) {
      throw new Error('Invalid state file: missing state.code')
    }

    // Store in map keyed by state code
    statesMap.set(data.state.code, data.state)

    loadingStatus.statesCount++
  } catch (error) {
    const fileName = filePath.split('/').pop() || filePath
    const errorMessage = error instanceof Error ? error.message : String(error)
    loadingStatus.errors.push({ file: fileName, error: errorMessage })
    await logWarn('Failed to load state file', { file: fileName, error: errorMessage })
  }
}

/**
 * Load all knowledge pack files asynchronously
 *
 * This function is non-blocking - it starts loading files but doesn't wait for completion.
 * The server can start responding to requests while files are still loading.
 */
export async function loadKnowledgePack(knowledgePackDir = 'knowledge_pack'): Promise<void> {
  await logInfo('Loading knowledge pack from knowledge_pack/...', {
    type: 'knowledge_pack_load_start',
  })

  // Clear existing Maps before loading new data
  carriersMap.clear()
  statesMap.clear()

  loadingStatus = {
    state: 'loading',
    carriersCount: 0,
    statesCount: 0,
    productsCount: 0,
    discountsCount: 0,
    errors: [],
  }

  try {
    // Resolve knowledge pack directory relative to project root (not apps/api)
    // When running from monorepo root, process.cwd() is the project root
    // When running from apps/api, we need to go up two levels
    const projectRoot = process.cwd().includes('apps/api')
      ? join(process.cwd(), '..', '..')
      : process.cwd()

    const carriersDir = join(projectRoot, knowledgePackDir, 'carriers')
    const statesDir = join(projectRoot, knowledgePackDir, 'states')

    // Read directory contents
    const carrierFiles = await readdir(carriersDir)
    const stateFiles = await readdir(statesDir)

    // Filter to JSON files only
    const carrierJsonFiles = carrierFiles
      .filter((file) => file.endsWith('.json'))
      .map((file) => join(carriersDir, file))

    const stateJsonFiles = stateFiles
      .filter((file) => file.endsWith('.json'))
      .map((file) => join(statesDir, file))

    // Load all files concurrently
    const loadPromises = [
      ...carrierJsonFiles.map((file) => loadCarrierFile(file)),
      ...stateJsonFiles.map((file) => loadStateFile(file)),
    ]

    await Promise.all(loadPromises)

    // Update status based on results
    if (
      loadingStatus.errors.length > 0 &&
      loadingStatus.carriersCount === 0 &&
      loadingStatus.statesCount === 0
    ) {
      loadingStatus.state = 'error'
    } else {
      loadingStatus.state = 'loaded'
    }

    // Log successful load with entity counts
    await logInfo('Knowledge pack loaded successfully', {
      type: 'knowledge_pack_load_complete',
      carriersCount: loadingStatus.carriersCount,
      statesCount: loadingStatus.statesCount,
      productsCount: loadingStatus.productsCount,
      discountsCount: loadingStatus.discountsCount,
      errorsCount: loadingStatus.errors.length,
    })
  } catch (error) {
    loadingStatus.state = 'error'
    const errorMessage = error instanceof Error ? error.message : String(error)
    loadingStatus.errors.push({ file: 'knowledge_pack', error: errorMessage })
    await logError('Failed to load knowledge pack', error)
  }
}

/**
 * Check if knowledge pack is loaded
 */
export function isKnowledgePackLoaded(): boolean {
  return loadingStatus.state === 'loaded'
}
