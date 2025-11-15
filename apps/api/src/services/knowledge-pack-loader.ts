/**
 * Knowledge Pack Loader Service
 *
 * Loads all knowledge pack JSON files into memory at startup.
 * Provides non-blocking async loading with error handling.
 */

import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import type { Carrier, Product, State } from '@repo/shared'
import { logError, logInfo } from '../utils/logger'
import { loadCarrierFile } from './knowledge-pack-loader/loaders/carrier-loader'
import { loadProductFile } from './knowledge-pack-loader/loaders/product-loader'
import { loadStateFile } from './knowledge-pack-loader/loaders/state-loader'

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
 * In-memory storage for products (keyed by product code)
 */
const productsMap = new Map<string, Product>()

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
 * Get a product by code
 */
export function getProduct(code: string): Product | undefined {
  return productsMap.get(code)
}

/**
 * Get all products
 */
export function getAllProducts(): Product[] {
  return Array.from(productsMap.values())
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
    knowledgePackDir,
  })

  // Clear existing Maps before loading new data
  carriersMap.clear()
  statesMap.clear()
  productsMap.clear()

  // Reset loading status
  loadingStatus = {
    state: 'loading',
    carriersCount: 0,
    statesCount: 0,
    productsCount: 0,
    discountsCount: 0,
    errors: [],
  }

  try {
    // If knowledgePackDir is already an absolute path, use it directly
    // Otherwise, resolve relative to project root (not apps/api)
    let resolvedKnowledgePackDir: string
    if (knowledgePackDir.startsWith('/') || knowledgePackDir.includes('__tests__')) {
      // Absolute path or test directory path - use as-is
      resolvedKnowledgePackDir = knowledgePackDir
    } else {
      // Relative path - resolve relative to project root
      const projectRoot = process.cwd().includes('apps/api')
        ? join(process.cwd(), '..', '..')
        : process.cwd()
      resolvedKnowledgePackDir = join(projectRoot, knowledgePackDir)
    }

    const carriersDir = join(resolvedKnowledgePackDir, 'carriers')
    const statesDir = join(resolvedKnowledgePackDir, 'states')
    const productsDir = join(resolvedKnowledgePackDir, 'products')

    // Read directory contents (handle missing directories gracefully)
    let carrierFiles: string[] = []
    let stateFiles: string[] = []
    let productFiles: string[] = []

    try {
      carrierFiles = await readdir(carriersDir)
    } catch {
      // Directory doesn't exist, use empty array
    }

    try {
      stateFiles = await readdir(statesDir)
    } catch {
      // Directory doesn't exist, use empty array
    }

    try {
      productFiles = await readdir(productsDir)
    } catch {
      // Directory doesn't exist, use empty array
    }

    // Filter to JSON files only
    const carrierJsonFiles = carrierFiles
      .filter((file) => file.endsWith('.json'))
      .map((file) => join(carriersDir, file))

    const stateJsonFiles = stateFiles
      .filter((file) => file.endsWith('.json'))
      .map((file) => join(statesDir, file))

    const productJsonFiles = productFiles
      .filter((file) => file.endsWith('.json'))
      .map((file) => join(productsDir, file))

    // Load all files concurrently
    const loadPromises = [
      ...carrierJsonFiles.map((file) => loadCarrierFile(file, carriersMap, loadingStatus)),
      ...stateJsonFiles.map((file) => loadStateFile(file, statesMap, loadingStatus)),
      ...productJsonFiles.map((file) => loadProductFile(file, productsMap, loadingStatus)),
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
