/**
 * Disclaimers Loader Service
 *
 * Loads disclaimers from knowledge pack disclaimers.json file.
 * Provides dynamic disclaimer retrieval based on state and product.
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { logError, logInfo } from '../utils/logger'

/**
 * Disclaimers data structure from knowledge pack
 */
interface DisclaimersData {
  disclaimers: {
    base: {
      _id: string
      value: string[]
      _sources?: unknown[]
    }
    products: {
      [productType: string]: {
        _id: string
        value: string[]
        _sources?: unknown[]
      }
    }
  }
}

/**
 * Prohibited phrases data structure from knowledge pack
 */
interface ProhibitedPhrasesData {
  prohibitedPhrases: {
    phrases: Array<{
      _id: string
      value: string
      _sources?: unknown[]
    }>
  }
}

/**
 * State-specific disclaimers (loaded from state files in knowledge pack)
 * Keyed by state code (e.g., 'CA', 'TX')
 */
const stateDisclaimersMap = new Map<string, string[]>()

/**
 * Base disclaimers (loaded from disclaimers.json)
 */
let baseDisclaimers: string[] = []

/**
 * Product-specific disclaimers (loaded from disclaimers.json)
 */
const productDisclaimersMap = new Map<string, string[]>()

/**
 * Prohibited phrases (loaded from prohibited-phrases.json)
 */
let prohibitedPhrases: string[] = []

/**
 * Load disclaimers from knowledge pack
 */
export async function loadDisclaimers(knowledgePackDir = 'knowledge_pack'): Promise<void> {
  try {
    // Resolve knowledge pack directory
    let resolvedKnowledgePackDir: string
    if (knowledgePackDir.startsWith('/')) {
      resolvedKnowledgePackDir = knowledgePackDir
    } else {
      const projectRoot = process.cwd().includes('apps/api')
        ? join(process.cwd(), '..', '..')
        : process.cwd()
      resolvedKnowledgePackDir = join(projectRoot, knowledgePackDir)
    }

    // Load disclaimers.json
    const disclaimersPath = join(resolvedKnowledgePackDir, 'disclaimers.json')
    const disclaimersContent = await readFile(disclaimersPath, 'utf-8')
    const disclaimersData: DisclaimersData = JSON.parse(disclaimersContent)

    // Extract base disclaimers
    baseDisclaimers = disclaimersData.disclaimers.base.value || []

    // Extract product-specific disclaimers
    productDisclaimersMap.clear()
    for (const [productType, productData] of Object.entries(disclaimersData.disclaimers.products)) {
      if (productData?.value && Array.isArray(productData.value)) {
        productDisclaimersMap.set(productType, productData.value)
      }
    }

    // Load prohibited phrases from separate file
    const prohibitedPhrasesPath = join(resolvedKnowledgePackDir, 'prohibited-phrases.json')
    try {
      const prohibitedPhrasesContent = await readFile(prohibitedPhrasesPath, 'utf-8')
      const prohibitedPhrasesData: ProhibitedPhrasesData = JSON.parse(prohibitedPhrasesContent)

      // Extract each phrase as its own element
      prohibitedPhrases = []
      if (prohibitedPhrasesData.prohibitedPhrases?.phrases) {
        for (const phraseObj of prohibitedPhrasesData.prohibitedPhrases.phrases) {
          if (phraseObj?.value) {
            prohibitedPhrases.push(phraseObj.value)
          }
        }
      }
    } catch (error) {
      await logError('Failed to load prohibited phrases from knowledge pack', error as Error)
      prohibitedPhrases = []
    }

    // Load state-specific disclaimers from state files
    const statesDir = join(resolvedKnowledgePackDir, 'states')
    try {
      const { readdir } = await import('node:fs/promises')
      const stateFiles = await readdir(statesDir)
      const stateJsonFiles = stateFiles.filter((file) => file.endsWith('.json'))

      stateDisclaimersMap.clear()
      for (const stateFile of stateJsonFiles) {
        try {
          const statePath = join(statesDir, stateFile)
          const stateContent = await readFile(statePath, 'utf-8')
          const stateData = JSON.parse(stateContent)

          // Extract state code from filename (e.g., 'ca.json' -> 'CA')
          const stateCode = stateFile.replace('.json', '').toUpperCase()

          // Check if state has disclaimers field
          if (
            stateData.state?.disclaimers?.value &&
            Array.isArray(stateData.state.disclaimers.value)
          ) {
            stateDisclaimersMap.set(stateCode, stateData.state.disclaimers.value)
          }
        } catch (error) {
          // Skip invalid state files
          await logError(`Failed to load state disclaimers from ${stateFile}`, error as Error)
        }
      }
    } catch (error) {
      // States directory might not exist or be readable - that's okay
      await logInfo('No state-specific disclaimers found', { error: (error as Error).message })
    }

    await logInfo('Disclaimers loaded successfully', {
      baseCount: baseDisclaimers.length,
      productCount: productDisclaimersMap.size,
      stateCount: stateDisclaimersMap.size,
      prohibitedPhrasesCount: prohibitedPhrases.length,
    })
  } catch (error) {
    await logError('Failed to load disclaimers from knowledge pack', error as Error)
    // Use empty arrays as fallback
    baseDisclaimers = []
    productDisclaimersMap.clear()
    stateDisclaimersMap.clear()
    prohibitedPhrases = []
  }
}

/**
 * Get prohibited phrases
 *
 * @returns Array of prohibited phrases
 */
export function getProhibitedPhrases(): string[] {
  return [...prohibitedPhrases]
}

/**
 * Get disclaimers based on state and product
 *
 * @param state - State code (e.g., 'CA', 'TX')
 * @param productType - Product type (e.g., 'auto', 'home')
 * @returns Array of disclaimers (base + state-specific + product-specific)
 */
export function getDisclaimers(state?: string, productType?: string): string[] {
  const disclaimers: string[] = [...baseDisclaimers]

  // Add state-specific disclaimers
  if (state) {
    const stateCode = state.toUpperCase()
    const stateDisclaimers = stateDisclaimersMap.get(stateCode)
    if (stateDisclaimers) {
      disclaimers.push(...stateDisclaimers)
    }
  }

  // Add product-specific disclaimers
  if (productType) {
    const productDisclaimers = productDisclaimersMap.get(productType)
    if (productDisclaimers) {
      disclaimers.push(...productDisclaimers)
    }
  }

  // Remove duplicates (preserve order)
  return Array.from(new Set(disclaimers))
}
