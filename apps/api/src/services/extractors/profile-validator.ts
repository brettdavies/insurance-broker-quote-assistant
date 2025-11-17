import type { UserProfile } from '@repo/shared'
import { userProfileSchema } from '@repo/shared'

/**
 * Profile Validator
 *
 * Validates UserProfile data against schema, returning only valid fields.
 */

/**
 * Validate profile against UserProfile schema
 * Returns partial profile with only valid fields
 *
 * @param profile - Partial user profile to validate
 * @returns Validated partial profile with only valid fields
 */
export function validateProfile(profile: Partial<UserProfile>): Partial<UserProfile> {
  try {
    // Use Zod schema to validate and sanitize
    const result = userProfileSchema.safeParse(profile)
    if (result.success) {
      return result.data
    }

    // If validation fails, return only valid fields
    const validProfile: Partial<UserProfile> = {}
    for (const [key, value] of Object.entries(profile)) {
      try {
        const fieldSchema = userProfileSchema.shape[key as keyof typeof userProfileSchema.shape]
        if (fieldSchema) {
          const fieldResult = fieldSchema.safeParse(value)
          if (fieldResult?.success && fieldResult.data !== undefined && value !== null) {
            // Type-safe assignment using keyof
            const typedKey = key as keyof UserProfile
            // Use fieldResult.data which has been validated by Zod
            // biome-ignore lint/suspicious/noExplicitAny: Type-safe assignment after Zod validation
            ;(validProfile as any)[typedKey] = fieldResult.data
          }
        }
      } catch {
        // Skip invalid fields
      }
    }
    return validProfile
  } catch {
    // If validation completely fails, return empty profile
    return {}
  }
}
