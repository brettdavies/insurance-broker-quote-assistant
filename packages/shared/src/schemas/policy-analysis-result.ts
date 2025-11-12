import { z } from 'zod'
import { type DecisionTrace, decisionTraceSchema } from './decision-trace'
import { citationSchema } from './intake-result'
import { opportunitySchema } from './opportunity'
import { type PolicySummary, policySummarySchema } from './policy-summary'
import { validatedOpportunitySchema } from './validated-opportunity'

/**
 * Policy Analysis Result Schema
 *
 * Complete output from policy analysis flow, including savings opportunities,
 * bundle options, deductible optimizations, and compliance-validated pitch.
 *
 * @see docs/architecture/4-data-models.md#46-policyanalysisresult
 */

/**
 * Citation Schema for LLM Response
 * LLM should only return cuid2 ID, not file path (file is hydrated server-side)
 */
const citationLLMSchema = z.object({
  id: z.string(), // cuid2 ID
  type: z.string(), // Entity type (e.g., "discount", "carrier")
  carrier: z.string(), // Carrier name (not ID for LLM)
})

/**
 * Bundle Option Schema
 * Represents opportunity to add additional products for bundle discount
 */
export const bundleOptionSchema = z.object({
  product: z.string(), // Product to add (e.g., "home", "auto")
  estimatedSavings: z.number().nonnegative(), // Estimated annual savings in dollars
  requiredActions: z.array(z.string()), // Actions needed (e.g., "Add home insurance policy")
  citation: citationSchema, // Citation with cuid2 ID for bundle discount rule
})

export type BundleOption = z.infer<typeof bundleOptionSchema>

/**
 * Bundle Option Schema for LLM Response (without file path)
 */
const bundleOptionLLMSchema = z.object({
  product: z.string(),
  estimatedSavings: z.number().nonnegative(),
  requiredActions: z.array(z.string()),
  citation: citationLLMSchema,
})

/**
 * Deductible Optimization Schema
 * Represents opportunity to adjust deductibles for savings
 */
export const deductibleOptimizationSchema = z.object({
  currentDeductible: z.number().nonnegative(), // Current deductible amount
  suggestedDeductible: z.number().nonnegative(), // Suggested deductible amount
  estimatedSavings: z.number().nonnegative(), // Estimated annual savings in dollars
  premiumImpact: z.number(), // Change in premium (negative = savings, positive = cost increase)
  citation: citationSchema, // Citation with cuid2 ID for pricing data used
})

export type DeductibleOptimization = z.infer<typeof deductibleOptimizationSchema>

/**
 * Deductible Optimization Schema for LLM Response (without file path)
 */
const deductibleOptimizationLLMSchema = z.object({
  currentDeductible: z.number().nonnegative(),
  suggestedDeductible: z.number().nonnegative(),
  estimatedSavings: z.number().nonnegative(),
  premiumImpact: z.number(),
  citation: citationLLMSchema,
})

/**
 * Opportunity Schema for LLM Response (without file path)
 */
const opportunityLLMSchema = z.object({
  discount: z.string(),
  percentage: z.number().min(0).max(100), // Can be decimal (0.1) or integer (10)
  annualSavings: z.number().nonnegative(),
  requires: z.array(z.string()),
  citation: citationLLMSchema,
})

/**
 * Policy Analysis Result Schema for LLM Response
 * LLM returns this structure, then we normalize and hydrate file paths
 */
export const policyAnalysisResultLLMSchema = z.object({
  currentPolicy: policySummarySchema,
  opportunities: z.array(opportunityLLMSchema),
  bundleOptions: z.array(bundleOptionLLMSchema),
  deductibleOptimizations: z.array(deductibleOptimizationLLMSchema),
  pitch: z.string(),
  complianceValidated: z.boolean(),
})

/**
 * Policy Analysis Result Schema
 * Main schema for policy analysis output (with hydrated file paths and validated opportunities)
 */
export const policyAnalysisResultSchema = z.object({
  currentPolicy: policySummarySchema, // Current policy being analyzed
  opportunities: z.array(validatedOpportunitySchema), // Validated opportunities with confidence scores
  bundleOptions: z.array(bundleOptionSchema), // Bundle opportunities
  deductibleOptimizations: z.array(deductibleOptimizationSchema), // Deductible trade-offs
  pitch: z.string(), // Agent-ready savings pitch with "because" rationales
  complianceValidated: z.boolean(), // Compliance filter result
  trace: decisionTraceSchema.optional(), // Decision trace for audit logging
})

export type PolicyAnalysisResult = z.infer<typeof policyAnalysisResultSchema>
