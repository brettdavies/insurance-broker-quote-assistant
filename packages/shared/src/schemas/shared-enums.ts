import { z } from 'zod'

/**
 * Shared Enum Schemas
 *
 * Common enum definitions used across multiple schemas.
 * Prevents duplication and ensures consistency.
 *
 * @see packages/shared/src/schemas/user-profile.ts
 * @see packages/shared/src/schemas/policy-summary.ts
 * @see packages/shared/src/schemas/prefill-packet.ts
 */

/**
 * Product Type Enum
 * Insurance product types supported by the system
 */
export const productTypeEnum = z.enum(['auto', 'home', 'renters', 'umbrella'])

export type ProductType = z.infer<typeof productTypeEnum>

/**
 * Property Type Enum
 * Property types for home/renters insurance
 */
export const propertyTypeEnum = z.enum([
  'single-family',
  'condo',
  'townhouse',
  'mobile-home',
  'duplex',
  'apartment',
])

export type PropertyType = z.infer<typeof propertyTypeEnum>
