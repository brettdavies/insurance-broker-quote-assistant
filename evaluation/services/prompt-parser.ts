/**
 * Prompt Parser
 *
 * Handles parsing and splitting of LLM prompts from logs.
 * Follows SRP (Single Responsibility Principle).
 */

import { PROMPT_MARKERS } from './report-constants'

/**
 * Split result for combined prompt
 */
export interface SplitPrompt {
  systemPrompt: string
  userPrompt: string
  warning?: string
}

/**
 * Split combined prompt into system and user prompts
 *
 * Format: systemPrompt + "\n\n" + userPrompt
 *
 * The system prompt starts with "You are a data extraction specialist" or similar
 * The user prompt starts with "Extract insurance shopper information"
 *
 * Returns a warning flag if system prompt appears to be missing
 */
export function splitCombinedPrompt(combinedPrompt: string): SplitPrompt {
  // Check if prompt starts with user prompt (system prompt missing)
  if (startsWithUserPrompt(combinedPrompt)) {
    console.warn(
      '[Prompt Parser] System prompt missing from log entry. ' +
        'Prompt starts with user prompt instead of system prompt. ' +
        'This may indicate the server is running old code or prompt files were not loaded correctly.'
    )
    return {
      systemPrompt: '',
      userPrompt: combinedPrompt.trim(),
      warning: 'System prompt missing from log entry',
    }
  }

  // Try to split at user prompt marker
  const userPromptIndex = combinedPrompt.indexOf(PROMPT_MARKERS.USER_PROMPT_START)
  if (userPromptIndex > 0) {
    const split = splitAtIndex(combinedPrompt, userPromptIndex)
    const validation = validateSystemPrompt(split.systemPrompt)

    if (validation.warning) {
      console.warn(`[Prompt Parser] ${validation.warning}`)
      return { ...split, warning: validation.warning }
    }

    return split
  }

  // Fallback: try alternative patterns
  if (containsSystemPromptMarkers(combinedPrompt)) {
    const split = trySplitByAlternativePatterns(combinedPrompt)
    if (split) return split
  }

  // Final fallback: return empty system prompt
  console.warn(
    '[Prompt Parser] Unable to split combined prompt. ' +
      'System prompt may be missing or prompt format is unrecognized.'
  )
  return {
    systemPrompt: '',
    userPrompt: combinedPrompt,
    warning: 'Unable to split combined prompt - system prompt may be missing',
  }
}

/**
 * Check if prompt starts with user prompt marker
 */
function startsWithUserPrompt(prompt: string): boolean {
  return prompt.trim().startsWith(PROMPT_MARKERS.USER_PROMPT_START)
}

/**
 * Check if prompt contains system prompt indicators
 */
function containsSystemPromptMarkers(prompt: string): boolean {
  return PROMPT_MARKERS.SYSTEM_PROMPT_INDICATORS.some((marker) => prompt.includes(marker))
}

/**
 * Split prompt at given index
 */
function splitAtIndex(prompt: string, index: number): SplitPrompt {
  const systemPrompt = prompt.substring(0, index).trim().replace(/\n+$/, '')
  const userPrompt = prompt.substring(index).trim()
  return { systemPrompt, userPrompt }
}

/**
 * Validate system prompt and return any warnings
 */
function validateSystemPrompt(
  systemPrompt: string
): { valid: boolean; warning?: string } {
  // Check if system prompt is too short
  if (!systemPrompt || systemPrompt.length < PROMPT_MARKERS.MIN_SYSTEM_PROMPT_LENGTH) {
    return {
      valid: false,
      warning: 'System prompt appears to be missing or incomplete',
    }
  }

  // Check if system prompt contains expected markers
  const hasMarkers = PROMPT_MARKERS.SYSTEM_PROMPT_INDICATORS.some((marker) =>
    systemPrompt.includes(marker)
  )

  if (!hasMarkers) {
    return {
      valid: false,
      warning: 'System prompt does not contain expected markers',
    }
  }

  return { valid: true }
}

/**
 * Try to split prompt using alternative user prompt patterns
 */
function trySplitByAlternativePatterns(prompt: string): SplitPrompt | null {
  for (const pattern of PROMPT_MARKERS.ALTERNATIVE_USER_PATTERNS) {
    const idx = prompt.indexOf(pattern)
    if (idx > PROMPT_MARKERS.MIN_SYSTEM_PROMPT_SPLIT_INDEX) {
      return splitAtIndex(prompt, idx)
    }
  }
  return null
}
