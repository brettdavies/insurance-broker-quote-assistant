/**
 * Generate Pitch Step
 *
 * Generates pitch using Pitch Generator Agent.
 */

import type {
  BundleOption,
  DeductibleOptimization,
  PolicySummary,
  ValidatedOpportunity,
} from '@repo/shared'
import { logError } from '../../../utils/logger'
import type { LLMProvider } from '../../llm-provider'
import { PitchGenerator } from '../../pitch-generator'

/**
 * Generate pitch
 */
export async function generatePitch(
  opportunities: ValidatedOpportunity[],
  bundleOptions: BundleOption[],
  deductibleOptimizations: DeductibleOptimization[],
  policySummary: PolicySummary,
  llmProvider: LLMProvider
): Promise<{ pitch: string; tokens: number }> {
  const pitchGenerator = new PitchGenerator(llmProvider)

  try {
    const pitchResult = await pitchGenerator.generatePitch(
      opportunities,
      bundleOptions,
      deductibleOptimizations,
      policySummary
    )
    const pitch = pitchResult as string
    const tokens =
      (pitchResult as { _metadata?: { tokensUsed?: number } })._metadata?.tokensUsed || 0

    return { pitch, tokens }
  } catch (error) {
    await logError('Pitch generation failed in policy analyze', error as Error, {
      type: 'pitch_generation_error',
      carrier: policySummary.carrier,
    })
    // Use fallback pitch
    return {
      pitch:
        "Based on our analysis, we've identified several savings opportunities. Please review the detailed recommendations below.",
      tokens: 0,
    }
  }
}
