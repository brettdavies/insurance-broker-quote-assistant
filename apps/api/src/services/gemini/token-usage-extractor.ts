/**
 * Token Usage Extractor
 *
 * Extracts token usage information from Gemini API responses.
 * Single Responsibility: Parsing token usage from API responses
 */

import type { TokenUsage } from '../llm-provider'

/**
 * Extract token usage from Gemini API response
 *
 * The @google/genai SDK provides usageMetadata with granular token counts.
 * This function handles different SDK versions and field name variations.
 *
 * @param response - Gemini API response object
 * @returns TokenUsage object with granular token counts, or undefined if not available
 */
export function extractTokenUsage(response: unknown): TokenUsage | undefined {
  try {
    // Try both usageMetadata and usage (for different SDK versions)
    const usageMetadata =
      (response as { usageMetadata?: unknown; usage?: unknown }).usageMetadata ||
      (response as { usage?: unknown }).usage

    if (!usageMetadata || typeof usageMetadata !== 'object') {
      return undefined
    }

    const usageObj = usageMetadata as Record<string, unknown>

    // Extract all available token counts (field names may vary by SDK version)
    const promptTokens = usageObj.promptTokenCount ?? usageObj.prompt_token_count ?? 0
    const candidatesTokens = usageObj.candidatesTokenCount ?? usageObj.candidates_token_count ?? 0
    const totalTokens = usageObj.totalTokenCount ?? usageObj.total_token_count ?? 0
    const cachedTokens = usageObj.cachedContentTokenCount ?? usageObj.cached_content_token_count
    const thinkingTokens =
      usageObj.thinkingTokenCount ??
      usageObj.thinking_token_count ??
      usageObj.reasoningTokenCount ??
      usageObj.reasoning_token_count

    // Only return if we have valid token counts
    if (typeof totalTokens === 'number' && totalTokens > 0) {
      return {
        promptTokens: typeof promptTokens === 'number' ? promptTokens : 0,
        completionTokens: typeof candidatesTokens === 'number' ? candidatesTokens : 0,
        totalTokens,
        cachedTokens: typeof cachedTokens === 'number' ? cachedTokens : undefined,
        thinkingTokens: typeof thinkingTokens === 'number' ? thinkingTokens : undefined,
      }
    }
  } catch {
    // Silently fail - token usage is optional
  }

  return undefined
}
