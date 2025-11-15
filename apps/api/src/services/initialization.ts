/**
 * Service Initialization
 *
 * Initializes all services (LLM provider, extractor, knowledge pack).
 * Single Responsibility: Service initialization only
 */

import { logInfo, logWarn } from '../utils/logger'
import type { ConversationalExtractor } from './conversational-extractor'
import { ConversationalExtractor as ConversationalExtractorClass } from './conversational-extractor'
import { loadDisclaimers } from './disclaimers-loader'
import { GeminiProvider } from './gemini-provider'
import { loadKnowledgePack } from './knowledge-pack-loader'
import type { LLMProvider } from './llm-provider'

/**
 * Initialize LLM provider
 * Supports TEST_TARGETS env var to enable/disable real LLM
 *
 * @returns Initialized LLM provider
 */
export function initializeLLMProvider(): LLMProvider {
  const { config } = require('../config/env')
  const testTargets = process.env.TEST_TARGETS?.split(',').map((t) => t.trim()) || []
  const useRealLLM = !testTargets.includes('mock') || testTargets.includes('real-api')

  if (useRealLLM) {
    const provider = new GeminiProvider(
      config.geminiApiKey || undefined, // Empty string becomes undefined
      config.geminiModel,
      config.llmTimeoutMs
    )
    logInfo('Using real Gemini API (LLM enabled)', {
      type: 'llm_provider_init',
      provider: 'gemini',
      model: config.geminiModel,
    }).catch(() => {
      // Ignore logging errors during initialization
    })
    return provider
  }
  // Mock provider not available in production - use real LLM instead
  // (Mock provider is only available in test files)
  const provider = new GeminiProvider(
    config.geminiApiKey || undefined,
    config.geminiModel,
    config.llmTimeoutMs
  )
  logWarn(
    'TEST_TARGETS=mock specified but mock provider not available in production - using real Gemini API',
    {
      type: 'llm_provider_init',
      provider: 'gemini',
      model: config.geminiModel,
      testTargets: process.env.TEST_TARGETS,
    }
  ).catch(() => {
    // Ignore logging errors during initialization
  })
  return provider
}

/**
 * Initialize conversational extractor
 *
 * @param llmProvider - LLM provider instance
 * @returns Initialized conversational extractor
 */
export function initializeConversationalExtractor(
  llmProvider: LLMProvider
): ConversationalExtractor {
  return new ConversationalExtractorClass(llmProvider)
}

/**
 * Initialize knowledge pack and disclaimers (non-blocking)
 * Loads knowledge pack and disclaimers in the background
 */
export function initializeKnowledgePack(): void {
  Promise.all([loadKnowledgePack(), loadDisclaimers()]).catch((error) => {
    // Use dynamic import to avoid circular dependency
    import('../utils/logger').then(({ logError }) => {
      logError('Failed to initialize knowledge pack', error as Error, {
        type: 'knowledge_pack_init_error',
      }).catch(() => {
        // Ignore logging errors during initialization
      })
    })
  })
}
