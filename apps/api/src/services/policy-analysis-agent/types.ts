/**
 * Policy Analysis Agent Types
 *
 * Shared types for the policy analysis agent and its normalizer.
 * These types define the contract between the agent, normalizer, and tests.
 */

import type { BundleOption, DeductibleOptimization, Opportunity, PolicySummary } from '@repo/shared'

/**
 * Normalizer Input Type
 *
 * This is the type that the normalizer accepts - raw LLM output before validation.
 * This type is exported so tests can use it to create properly typed test data.
 *
 * @see normalizePolicyAnalysisResult
 */
export type NormalizerInput = {
  currentPolicy: PolicySummary
  opportunities: Opportunity[]
  bundleOptions: BundleOption[]
  deductibleOptimizations: DeductibleOptimization[]
  pitch: string
  complianceValidated: boolean
  _metadata?: { tokensUsed?: number; analysisTime?: number }
}

/**
 * LLM Analysis Output Type
 *
 * Alias for NormalizerInput - this is what the LLM returns before normalization.
 * Using the same type ensures consistency between agent output and normalizer input.
 */
export type LLMAnalysisOutput = NormalizerInput
