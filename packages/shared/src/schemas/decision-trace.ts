import { z } from 'zod'

/**
 * Decision Trace Schema
 *
 * Complete audit trail of decision-making process for compliance logging.
 *
 * @see docs/architecture/4-data-models.md#48-decisiontrace
 */

/**
 * LLM Call Schema
 * Tracks individual LLM API calls with token usage
 */
export const llmCallSchema = z.object({
  agent: z.string(), // Agent name (e.g., 'conversational-extractor', 'pitch-generator')
  model: z.string(), // Model identifier (e.g., 'gemini-2.5-flash-lite', 'gpt-4o')
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
})

export type LLMCall = z.infer<typeof llmCallSchema>

/**
 * Decision Trace Schema
 * Complete traceability for regulatory audit
 */
export const decisionTraceSchema = z.object({
  timestamp: z.string().datetime(), // ISO 8601 timestamp
  flow: z.enum(['conversational', 'policy', 'prefill_generation']),
  inputs: z.record(z.unknown()), // Raw inputs (message, conversationHistory, etc.)
  extraction: z
    .object({
      method: z.enum(['key-value', 'llm', 'prefill_generator']),
      fields: z.record(z.unknown()),
      confidence: z.record(z.number().min(0).max(1)).optional(),
      reasoning: z.string().optional(),
    })
    .optional(),
  routingDecision: z.record(z.unknown()).optional(), // Will be defined in future story
  discountCalculations: z.record(z.unknown()).optional(), // Will be defined in future story
  discountValidation: z
    .object({
      rulesEvaluated: z.array(
        z.object({
          rule: z.string(),
          citation: z.object({
            id: z.string(),
            type: z.string(),
            carrier: z.string(),
            file: z.string(),
          }),
          result: z.enum(['pass', 'fail', 'partial']),
        })
      ),
      opportunitiesValidated: z.number().int().nonnegative(),
      confidenceScores: z.record(z.number().min(0).max(100)),
      stackingResults: z
        .object({
          validCombinations: z.array(z.array(z.string())),
          conflicts: z.array(
            z.object({
              opportunity1: z.string(),
              opportunity2: z.string(),
              reason: z.string(),
            })
          ),
          maxStackable: z.number().int().nonnegative().optional(),
        })
        .optional(),
    })
    .optional(),
  complianceCheck: z
    .object({
      passed: z.boolean(),
      violations: z.array(z.string()).optional(),
      disclaimersAdded: z.number().int().nonnegative().optional(),
      state: z.string().optional(),
      productType: z.string().optional(),
    })
    .optional(),
  llmCalls: z.array(llmCallSchema).optional(),
  rulesConsulted: z.array(z.string()).optional(), // Knowledge pack file paths or cuid2 IDs
  bundleAnalysis: z
    .object({
      currentProduct: z.string(),
      bundleOpportunities: z.array(
        z.object({
          product: z.string(),
          estimatedSavings: z.number().nonnegative(),
          requiredActions: z.array(z.string()),
        })
      ),
      carrierAvailabilityChecks: z.array(
        z.object({
          carrier: z.string(),
          state: z.string(),
          operatesInState: z.boolean(),
          availableProducts: z.array(z.string()),
        })
      ),
      citations: z.array(
        z.object({
          id: z.string(),
          type: z.string(),
          carrier: z.string(),
          file: z.string(),
        })
      ),
    })
    .optional(),
  outputs: z.record(z.unknown()).optional(), // Final outputs sent to user
})

export type DecisionTrace = z.infer<typeof decisionTraceSchema>
