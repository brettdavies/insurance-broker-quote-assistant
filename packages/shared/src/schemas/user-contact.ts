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
  name: z.string().optional(), // Full name or first name
  email: z.string().email().optional(),
  phone: z.string().optional(),
  zip: z.string().optional(), // Zip code
  state: z.string().optional(), // US state code
  address: z.string().optional(), // Street address
})

export type UserContact = z.infer<typeof userContactSchema>
