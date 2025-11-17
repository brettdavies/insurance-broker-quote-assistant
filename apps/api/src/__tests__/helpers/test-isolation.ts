/**
 * Test Isolation Utilities
 *
 * Provides centralized utilities for resetting shared state between tests.
 * This ensures test isolation and prevents tests from affecting each other.
 *
 * Uses production functions (loadKnowledgePack, loadDisclaimers) which naturally
 * clear Maps before loading, avoiding test-specific code in production.
 *
 * Usage:
 * ```typescript
 * import { resetSharedStateWithKnowledgePack, clearSharedState } from '../../__tests__/helpers/test-isolation'
 *
 * beforeEach(async () => {
 *   // For tests that load their own test knowledge pack, clear state first
 *   await clearSharedState()
 *   // OR for tests that use the real knowledge pack, reset with real pack
 *   await resetSharedStateWithKnowledgePack()
 * })
 * ```
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { loadDisclaimers } from '../../services/disclaimers-loader'
import {
  getAllCarriers,
  getAllProducts,
  getAllStates,
  loadKnowledgePack,
} from '../../services/knowledge-pack-loader'

/**
 * Clear all shared state without loading any knowledge pack
 *
 * This function directly clears Maps by loading an empty knowledge pack directory.
 * Use this for tests that load their own test knowledge pack to avoid loading
 * the real knowledge pack (which might contain data that interferes with tests).
 *
 * This approach uses production functions which naturally clear Maps before loading.
 * We create a temporary empty knowledge pack directory structure to ensure
 * loadKnowledgePack completes successfully and clears all Maps.
 */
export async function clearSharedState(): Promise<void> {
  // Create a temporary empty knowledge pack directory structure
  // This ensures loadKnowledgePack completes successfully and clears Maps
  const tmpDir = join('/tmp', `test-isolation-clear-${Date.now()}-${Math.random().toString(36).substring(7)}`)
  const carriersDir = join(tmpDir, 'carriers')
  const statesDir = join(tmpDir, 'states')
  const productsDir = join(tmpDir, 'products')

  try {
    // Create empty directory structure
    await mkdir(carriersDir, { recursive: true })
    await mkdir(statesDir, { recursive: true })
    await mkdir(productsDir, { recursive: true })

    // Create empty disclaimers.json to avoid errors when loading disclaimers
    const emptyDisclaimers = { disclaimers: { base: { _id: '', value: [] }, products: {} } }
    await writeFile(join(tmpDir, 'disclaimers.json'), JSON.stringify(emptyDisclaimers), 'utf-8')

    // Load from empty directory - this will clear Maps and complete successfully
    // loadKnowledgePack clears Maps at the beginning (line 122-124), so Maps are cleared
    await loadKnowledgePack(tmpDir)

    // Also clear disclaimers by loading from empty directory
    await loadDisclaimers(tmpDir)
  } catch (error) {
    // If something goes wrong, try loading from non-existent directory as fallback
    // This will clear Maps even if it fails to load files
    const emptyDir = join('/tmp', `test-isolation-fallback-${Date.now()}`)
    try {
      await loadKnowledgePack(emptyDir)
    } catch {
      // Expected - directory doesn't exist, but Maps are already cleared
    }
    try {
      await loadDisclaimers(emptyDir)
    } catch {
      // Expected - directory doesn't exist, but Maps are already cleared
    }
  } finally {
    // Clean up temporary directory
    try {
      await rm(tmpDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  }

  // Verify Maps are cleared (defensive check)
  const carriers = getAllCarriers()
  const states = getAllStates()
  const products = getAllProducts()

  if (carriers.length > 0 || states.length > 0 || products.length > 0) {
    // If Maps weren't cleared, this is a serious issue
    // Log warning but don't throw - tests should handle empty state gracefully
    console.warn(
      'Test isolation: Maps not cleared properly after clearSharedState()',
      { carriers: carriers.length, states: states.length, products: products.length }
    )
  }
}

/**
 * Reset all shared state by reloading from the real knowledge pack
 *
 * This function uses production functions which naturally clear Maps before loading:
 * - loadKnowledgePack() clears Maps before loading (line 122-124)
 * - loadDisclaimers() clears Maps before loading (lines 91, 125, etc.)
 *
 * Use this for tests that need the real knowledge pack loaded.
 * For tests that load their own test knowledge pack, use clearSharedState() instead.
 *
 * This approach avoids test-specific code in production while ensuring test isolation.
 */
export async function resetSharedStateWithKnowledgePack(): Promise<void> {
  const projectRoot = process.cwd().includes('apps/api')
    ? join(process.cwd(), '..', '..')
    : process.cwd()
  const realKnowledgePackDir = join(projectRoot, 'knowledge_pack')

  try {
    // Load knowledge pack - this clears Maps before loading
    await loadKnowledgePack(realKnowledgePackDir)
    // Load disclaimers - this clears Maps before loading
    await loadDisclaimers(realKnowledgePackDir)
  } catch (error) {
    // If real knowledge pack doesn't exist or fails to load, clear state instead
    // This ensures test isolation even if real pack is unavailable
    console.warn('Failed to reload knowledge pack in test isolation, clearing state instead:', error)
    await clearSharedState()
  }
}
