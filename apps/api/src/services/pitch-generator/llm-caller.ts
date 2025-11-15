/**
 * LLM Caller for Pitch Generation
 *
 * Handles LLM calls for pitch generation using structured outputs.
 */

import { z } from 'zod'
import { logError } from '../../utils/logger'
import type { LLMProvider } from '../llm-provider'

/**
 * Pitch generation result schema
 */
const pitchResultSchema = z.object({
  pitch: z.string(), // Agent-ready talking points with "because" rationales
})

type PitchResult = z.infer<typeof pitchResultSchema>

/**
 * Call LLM for pitch generation
 */
export async function callLLMForPitch(
  llmProvider: LLMProvider,
  prompt: string
): Promise<PitchResult & { _metadata?: { tokensUsed?: number } }> {
  try {
    // Use extractWithStructuredOutput but adapt for pitch generation
    // The LLMProvider interface returns ExtractionResult, but we'll extract the pitch
    // Use temperature 0.3 for pitch generation (more creative)
    const result = await llmProvider.extractWithStructuredOutput(
      prompt,
      pitchResultSchema,
      undefined, // No partial fields for pitch generation
      0.3 // Temperature for pitch generation (more creative)
    )

    // Extract pitch from profile field (workaround for LLMProvider interface)
    const pitchData = result.profile as unknown as PitchResult

    // Validate
    const validated = pitchResultSchema.parse(pitchData)

    return {
      ...validated,
      _metadata: {
        tokensUsed: result.tokensUsed,
      },
    }
  } catch (error) {
    await logError('LLM pitch generation failed', error as Error, {
      type: 'pitch_llm_error',
    })
    throw error
  }
}
