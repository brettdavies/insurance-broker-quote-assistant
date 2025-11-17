import type { PolicySummary } from '@repo/shared'
import { policySummarySchema } from '@repo/shared'

/**
 * Policy Validator
 *
 * Validates PolicySummary data against schema, returning only valid fields.
 */

/**
 * Validate policy summary against PolicySummary schema
 * Returns partial policy summary with only valid fields
 *
 * @param policy - Partial policy summary to validate
 * @returns Validated partial policy summary with only valid fields
 */
export function validatePolicySummary(policy: Partial<PolicySummary>): Partial<PolicySummary> {
  try {
    // Use Zod schema to validate and sanitize
    const result = policySummarySchema.safeParse(policy)
    if (result.success) {
      return result.data
    }

    // If validation fails, return only valid fields
    const validPolicy: Partial<PolicySummary> = {}
    for (const [key, value] of Object.entries(policy)) {
      try {
        // Check if field exists in schema
        if (key in policySummarySchema.shape) {
          const fieldSchema = (policySummarySchema.shape as Record<string, unknown>)[key]
          if (fieldSchema && typeof fieldSchema === 'object' && 'safeParse' in fieldSchema) {
            const fieldResult = (
              fieldSchema as { safeParse: (val: unknown) => { success: boolean; data?: unknown } }
            ).safeParse(value)
            if (fieldResult?.success && fieldResult.data !== undefined && value !== null) {
              // Type-safe assignment using keyof
              const typedKey = key as keyof PolicySummary
              // Use fieldResult.data which has been validated by Zod
              // biome-ignore lint/suspicious/noExplicitAny: Type-safe assignment after Zod validation
              ;(validPolicy as any)[typedKey] = fieldResult.data
            }
          }
        }
      } catch {
        // Skip invalid fields
      }
    }
    return validPolicy
  } catch {
    // If validation completely fails, return empty policy
    return {}
  }
}
