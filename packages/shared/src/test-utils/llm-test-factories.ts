/**
 * LLM Test Factories
 *
 * Factory functions for creating LLM providers for testing.
 * Supports both mock and real API providers.
 */

import type { UserProfile } from '../schemas/user-profile'

/**
 * Extraction result from LLM provider
 */
export interface ExtractionResult {
  profile: Partial<UserProfile>
  confidence: Record<string, number> // Field-level confidence scores (0.0-1.0)
  reasoning?: string // Optional reasoning for extraction
}

/**
 * LLM Provider interface for testing
 */
export interface LLMProvider {
  extractWithStructuredOutput(
    message: string,
    conversationHistory?: string[],
    schema?: unknown // Zod schema type
  ): Promise<ExtractionResult>
}

/**
 * Create a mock LLM provider for testing
 *
 * Returns deterministic mock responses based on input patterns.
 * Useful for fast, predictable unit tests.
 */
export function createMockLLMProvider(
  overrides?: Partial<{
    extractWithStructuredOutput: LLMProvider['extractWithStructuredOutput']
  }>
): LLMProvider {
  return {
    extractWithStructuredOutput: overrides?.extractWithStructuredOutput ?? (async (message) => {
      // Simple pattern matching for common test cases
      const profile: Partial<UserProfile> = {}
      const confidence: Record<string, number> = {}
      let reasoning = 'Mock LLM extraction'

      // Extract state (CA, TX, FL, NY, etc.)
      if (message.includes('California') || message.includes('CA') || message.match(/\bs:CA\b/)) {
        profile.state = 'CA'
        confidence.state = 0.9
      } else if (message.includes('Texas') || message.includes('TX') || message.match(/\bs:TX\b/)) {
        profile.state = 'TX'
        confidence.state = 0.9
      } else if (message.includes('Florida') || message.includes('FL') || message.match(/\bs:FL\b/)) {
        profile.state = 'FL'
        confidence.state = 0.9
      } else if (message.includes('New York') || message.includes('NY') || message.match(/\bs:NY\b/)) {
        profile.state = 'NY'
        confidence.state = 0.9
      }

      // Extract product line
      if (message.includes('auto') || message.match(/\bl:auto\b/)) {
        profile.productLine = 'auto'
        confidence.productLine = 0.8
      } else if (message.includes('home') || message.match(/\bl:home\b/)) {
        profile.productLine = 'home'
        confidence.productLine = 0.8
      } else if (message.includes('renters') || message.match(/\bl:renters\b/)) {
        profile.productLine = 'renters'
        confidence.productLine = 0.8
      }

      // Extract age
      const ageMatch = message.match(/\ba:(\d+)\b|(\d+)\s*years?\s*old|age[:\s]+(\d+)/i)
      if (ageMatch) {
        profile.age = parseInt(ageMatch[1] || ageMatch[2] || ageMatch[3] || '30', 10)
        confidence.age = 0.85
      }

      // Extract vehicles
      const vehiclesMatch = message.match(/\bv:(\d+)\b|(\d+)\s*vehicles?/i)
      if (vehiclesMatch) {
        profile.vehicles = parseInt(vehiclesMatch[1] || vehiclesMatch[2] || '1', 10)
        confidence.vehicles = 0.8
      }

      // Extract household size / kids
      const kidsMatch = message.match(/\bk:(\d+)\b|(\d+)\s*kids?/i)
      if (kidsMatch) {
        profile.householdSize = parseInt(kidsMatch[1] || kidsMatch[2] || '1', 10)
        confidence.householdSize = 0.75
      }

      // Extract owns home
      if (message.includes('own') && message.includes('home')) {
        profile.ownsHome = true
        confidence.ownsHome = 0.8
      }

      return {
        profile,
        confidence,
        reasoning,
      }
    }),
  }
}

/**
 * Create a real LLM provider (Gemini or OpenAI)
 *
 * Requires API keys in environment:
 * - GEMINI_API_KEY for Gemini
 * - OPENAI_API_KEY for OpenAI (future)
 *
 * Note: Since shared package cannot import from apps/api, this function
 * accepts a provider class constructor. Test files should import the
 * provider class and pass it here.
 *
 * @param ProviderClass - Provider class constructor (e.g., GeminiProvider)
 * @param options - Provider configuration
 */
export function createRealLLMProvider(
  ProviderClass: new (
    apiKey?: string,
    model?: string,
    timeout?: number
  ) => LLMProvider,
  options?: {
    apiKey?: string
    model?: string
    timeout?: number
  }
): LLMProvider {
  return new ProviderClass(
    options?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || undefined,
    options?.model,
    options?.timeout
  )
}

/**
 * Create LLM provider for a specific test target
 *
 * @param target - Test target ('mock' | 'real-api' | 'contract')
 * @param options - Optional provider configuration
 * @param ProviderClass - Optional provider class for real-api target (required for real-api)
 */
export function createLLMProviderForTarget(
  target: 'mock' | 'real-api' | 'contract',
  options?: {
    provider?: 'gemini' | 'openai'
    model?: string
    timeout?: number
    mockOverrides?: Parameters<typeof createMockLLMProvider>[0]
    apiKey?: string
  },
  ProviderClass?: new (
    apiKey?: string,
    model?: string,
    timeout?: number
  ) => LLMProvider
): LLMProvider {
  switch (target) {
    case 'mock':
      return createMockLLMProvider(options?.mockOverrides)
    case 'real-api':
      if (!ProviderClass) {
        throw new Error(
          'ProviderClass is required for real-api target. Import GeminiProvider or OpenAIProvider and pass it here.'
        )
      }
      return createRealLLMProvider(ProviderClass, {
        apiKey: options?.apiKey,
        model: options?.model,
        timeout: options?.timeout,
      })
    case 'contract':
      // Contract testing uses mock with specific contract validation
      return createMockLLMProvider(options?.mockOverrides)
    default:
      throw new Error(`Unknown test target: ${target}`)
  }
}
