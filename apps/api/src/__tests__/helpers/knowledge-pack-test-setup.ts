/**
 * Knowledge Pack Test Setup Helper
 *
 * Provides utilities for tests to use the real knowledge_pack data as a base,
 * with the ability to extend or override it for specific test scenarios.
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { CarrierFile, ProductFile, StateFile } from '@repo/shared'
import { loadKnowledgePack } from '../../services/knowledge-pack-loader'

/**
 * Test knowledge pack directory (temporary, cleaned up after tests)
 */
let testKnowledgePackDir: string | null = null

/**
 * Setup test knowledge pack using real knowledge_pack as base
 *
 * This function:
 * 1. Creates a temporary test directory
 * 2. Copies real knowledge_pack data into it
 * 3. Allows tests to extend/override with additional test data
 *
 * @param overrides - Optional overrides/extensions to add to the knowledge pack
 * @returns Path to the test knowledge pack directory
 */
export async function setupTestKnowledgePack(overrides?: {
  carriers?: CarrierFile[]
  states?: StateFile[]
  products?: ProductFile[]
}): Promise<string> {
  // Resolve project root (works from both monorepo root and apps/api)
  const projectRoot = process.cwd().includes('apps/api')
    ? join(process.cwd(), '..', '..')
    : process.cwd()

  // Create unique test directory
  const timestamp = Date.now()
  testKnowledgePackDir = join(
    projectRoot,
    'apps/api/src/__tests__/fixtures/knowledge-packs',
    `test_knowledge_pack_${timestamp}`
  )

  const carriersDir = join(testKnowledgePackDir, 'carriers')
  const statesDir = join(testKnowledgePackDir, 'states')
  const productsDir = join(testKnowledgePackDir, 'products')

  // Create directories
  await mkdir(carriersDir, { recursive: true })
  await mkdir(statesDir, { recursive: true })
  await mkdir(productsDir, { recursive: true })

  // Copy real knowledge pack files
  const realKnowledgePackDir = join(projectRoot, 'knowledge_pack')
  await copyKnowledgePackFiles(realKnowledgePackDir, testKnowledgePackDir)

  // Add test overrides/extensions
  if (overrides) {
    if (overrides.carriers) {
      for (const carrier of overrides.carriers) {
        const fileName = `${carrier.carrier.name.toLowerCase().replace(/\s+/g, '-')}.json`
        await writeFile(join(carriersDir, fileName), JSON.stringify(carrier), 'utf-8')
      }
    }

    if (overrides.states) {
      for (const state of overrides.states) {
        const fileName = `${state.state.code}.json`
        await writeFile(join(statesDir, fileName), JSON.stringify(state), 'utf-8')
      }
    }

    if (overrides.products) {
      for (const product of overrides.products) {
        const fileName = `${product.product.code}.json`
        await writeFile(join(productsDir, fileName), JSON.stringify(product), 'utf-8')
      }
    }
  }

  // Load the test knowledge pack
  await loadKnowledgePack(testKnowledgePackDir)

  // Verify knowledge pack loaded successfully
  const { getLoadingStatus, isKnowledgePackLoaded } = await import(
    '../../services/knowledge-pack-loader'
  )
  const status = getLoadingStatus()

  if (!isKnowledgePackLoaded() || status.state !== 'loaded') {
    throw new Error(
      `Failed to load test knowledge pack. Status: ${status.state}, ` +
        `Carriers: ${status.carriersCount}, States: ${status.statesCount}, ` +
        `Errors: ${status.errors.length}`
    )
  }

  return testKnowledgePackDir
}

/**
 * Copy knowledge pack files from source to destination
 */
async function copyKnowledgePackFiles(sourceDir: string, destDir: string): Promise<void> {
  const { readdir, copyFile, access } = await import('node:fs/promises')
  const { constants } = await import('node:fs')

  // Copy carriers
  try {
    await access(join(sourceDir, 'carriers'), constants.F_OK)
    const carrierFiles = await readdir(join(sourceDir, 'carriers'))
    for (const file of carrierFiles) {
      if (file.endsWith('.json')) {
        await copyFile(join(sourceDir, 'carriers', file), join(destDir, 'carriers', file))
      }
    }
  } catch {
    // Carriers directory doesn't exist, skip
  }

  // Copy states
  try {
    await access(join(sourceDir, 'states'), constants.F_OK)
    const stateFiles = await readdir(join(sourceDir, 'states'))
    for (const file of stateFiles) {
      if (file.endsWith('.json')) {
        await copyFile(join(sourceDir, 'states', file), join(destDir, 'states', file))
      }
    }
  } catch {
    // States directory doesn't exist, skip
  }

  // Copy products
  try {
    await access(join(sourceDir, 'products'), constants.F_OK)
    const productFiles = await readdir(join(sourceDir, 'products'))
    for (const file of productFiles) {
      if (file.endsWith('.json')) {
        await copyFile(join(sourceDir, 'products', file), join(destDir, 'products', file))
      }
    }
  } catch {
    // Products directory doesn't exist, skip
  }
}

/**
 * Clean up test knowledge pack directory
 */
export async function cleanupTestKnowledgePack(): Promise<void> {
  if (testKnowledgePackDir) {
    try {
      await rm(testKnowledgePackDir, { recursive: true, force: true })
      testKnowledgePackDir = null
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Get the current test knowledge pack directory
 */
export function getTestKnowledgePackDir(): string | null {
  return testKnowledgePackDir
}
