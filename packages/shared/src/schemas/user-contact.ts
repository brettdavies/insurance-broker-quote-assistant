import { z } from 'zod'

/**
 * User Contact Schema
 *
 * Shared schema for user contact information used across multiple schemas.
 * Prevents duplication of name, email, phone, zip fields.
 *
 * @see docs/architecture/4-data-models.md
 */

export const userContactSchema = z.object({
  name: z.string().nullish(), // Full name or first name (nullish = accepts null, undefined, or string)
  email: z.string().nullish(), // Email address (format validation removed to prevent schema issues)
  phone: z.string().nullish(),
  zip: z.string().nullish(), // Zip code
  state: z.string().nullish(), // US state code
  address: z.string().nullish(), // Street address
})

export type UserContact = z.infer<typeof userContactSchema>
