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
 * import { resetSharedStateWithKnowledgePack } from '../../__tests__/helpers/test-isolation'
 *
 * beforeEach(async () => {
 *   await resetSharedStateWithKnowledgePack()
 * })
 * ```
 */

import { join } from 'node:path'
import { loadDisclaimers } from '../../services/disclaimers-loader'
import { loadKnowledgePack } from '../../services/knowledge-pack-loader'

/**
 * Reset all shared state by reloading from the real knowledge pack
 *
 * This function uses production functions which naturally clear Maps before loading:
 * - loadKnowledgePack() clears Maps before loading (line 122-124)
 * - loadDisclaimers() clears Maps before loading (lines 91, 125, etc.)
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
    // If real knowledge pack doesn't exist or fails to load, that's okay
    // The Maps will be cleared on next load anyway
    console.warn('Failed to reload knowledge pack in test isolation:', error)
  }
}
