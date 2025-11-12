import type { UserProfile } from '@repo/shared'
import { unifiedFieldMetadata } from '@repo/shared'

/**
 * Key-Value Syntax Parser
 *
 * Parses key-value syntax from broker input (e.g., "kids:3", "k:3", "deps:4", "car:garage")
 * and extracts structured data matching UserProfile schema.
 *
 * Field aliases are sourced from unified field metadata to ensure consistency.
 */

export interface KeyValueExtractionResult {
  profile: Partial<UserProfile>
  extractionMethod: 'key-value'
  confidence: 1.0 // Key-value extraction is always 100% confident
}

/**
 * Field alias mapping (derived from unified field metadata)
 * Maps shortcuts and aliases to UserProfile field names
 * Built from unifiedFieldMetadata to ensure no drift
 */
const FIELD_ALIASES: Record<string, string> = (() => {
  const aliases: Record<string, string> = {}

  // Build aliases from unified metadata for intake flow
  for (const [field, metadata] of Object.entries(unifiedFieldMetadata)) {
    // Only include fields that apply to intake flow
    if (!metadata.flows.includes('intake')) {
      continue
    }

    // Add shortcut → field mapping
    if (metadata.shortcut) {
      aliases[metadata.shortcut.toLowerCase()] = field
    }

    // Add field name itself as alias
    aliases[field.toLowerCase()] = field

    // Add aliases from metadata
    if (metadata.aliases) {
      for (const alias of metadata.aliases) {
        aliases[alias.toLowerCase()] = field
      }
    }
  }

  return aliases
})()

/**
 * Numeric fields that require number conversion
 */
const NUMERIC_FIELDS = new Set([
  'age',
  'kids',
  'householdSize',
  'vehicles',
  'creditScore',
  // Note: premiums is handled separately (object with annual/monthly/semiAnnual)
])

/**
 * Boolean fields
 */
const BOOLEAN_FIELDS = new Set(['ownsHome', 'cleanRecord3Yr'])

/**
 * Product type enum values
 */
const PRODUCT_TYPE_VALUES = ['auto', 'home', 'renters', 'umbrella'] as const

/**
 * Parse key-value syntax from message
 *
 * @param message - Broker message containing key-value pairs
 * @returns Extraction result with profile and metadata
 */
export function parseKeyValueSyntax(message: string): KeyValueExtractionResult {
  const profile: Partial<UserProfile> = {}

  // Regex pattern: matches key:value (case-insensitive)
  // Stops at space, comma, period, or end of string
  // Value can contain hyphens for property types like "single-family"
  const kvPattern = /(\w+):([\w-]+|\d+)(?=\s|,|\.|$)/gi
  let match: RegExpExecArray | null = kvPattern.exec(message)

  while (match !== null) {
    const key = match[1]
    const value = match[2]
    if (!key || !value) {
      match = kvPattern.exec(message)
      continue
    }

    const lowerKey = key.toLowerCase()
    // Get field name from alias mapping (built from unified metadata)
    const fieldName = FIELD_ALIASES[lowerKey]

    if (fieldName) {
      // Convert value based on field type
      if (NUMERIC_FIELDS.has(fieldName)) {
        const numValue = Number.parseInt(value, 10)
        if (!Number.isNaN(numValue)) {
          // @ts-expect-error - Dynamic field assignment
          profile[fieldName] = numValue
        }
      } else if (BOOLEAN_FIELDS.has(fieldName)) {
        // Boolean fields: "true", "1", "yes" → true, else false
        const boolValue =
          value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes'
        // @ts-expect-error - Dynamic field assignment
        profile[fieldName] = boolValue
      } else if (fieldName === 'productType') {
        // Validate product type enum
        const productValue = value.toLowerCase()
        if (PRODUCT_TYPE_VALUES.includes(productValue as (typeof PRODUCT_TYPE_VALUES)[number])) {
          profile.productType = productValue as (typeof PRODUCT_TYPE_VALUES)[number]
        }
      } else if (fieldName === 'propertyType') {
        // Validate property type enum
        const propertyTypes = [
          'single-family',
          'condo',
          'townhouse',
          'mobile-home',
          'duplex',
          'apartment',
        ] as const
        const propertyValue = value.toLowerCase().replace(/_/g, '-')
        if (propertyTypes.includes(propertyValue as (typeof propertyTypes)[number])) {
          profile.propertyType = propertyValue as (typeof propertyTypes)[number]
        }
      } else if (fieldName === 'premium' || fieldName === 'premiums') {
        // Handle premium parsing - supports formats like:
        // premium:1200, premium:annual:1200, premium:monthly:100, premium:$1200/yr, premium:1200/yr
        // Check if value contains period indicator or if key has period
        const fullMatch = match[0] // Full match including key:value
        const premiumMatch = fullMatch.match(
          /premium(?::(annual|monthly|semiAnnual|semi-annual))?:[\$]?(\d+)(?:\/(yr|mo|6mo))?/i
        )
        if (premiumMatch) {
          const periodIndicator: string | undefined =
            premiumMatch[3] || (premiumMatch[1] ? premiumMatch[1].toLowerCase() : undefined) // yr/mo/6mo or annual/monthly
          const amount = Number.parseFloat(premiumMatch[2] as string)
          if (!Number.isNaN(amount) && amount > 0) {
            if (!profile.premiums) {
              profile.premiums = {}
            }
            // Normalize period indicator to standard format
            let normalizedPeriod: 'annual' | 'monthly' | 'semiAnnual' = 'annual'
            const period: string = (periodIndicator ?? 'annual') as string
            if (period === 'yr' || period === 'annual') {
              normalizedPeriod = 'annual'
            } else if (period === 'mo' || period === 'monthly') {
              normalizedPeriod = 'monthly'
            } else if (period === '6mo' || period === 'semiannual' || period === 'semi-annual') {
              normalizedPeriod = 'semiAnnual'
            }
            if (normalizedPeriod === 'annual') {
              profile.premiums.annual = amount
            } else if (normalizedPeriod === 'monthly') {
              profile.premiums.monthly = amount
            } else if (normalizedPeriod === 'semiAnnual') {
              profile.premiums.semiAnnual = amount
            } else {
              // Default to annual if period unclear
              profile.premiums.annual = amount
            }
          }
        } else {
          // Simple numeric value - treat as annual premium
          const numValue = Number.parseFloat(value.replace(/[\$,]/g, ''))
          if (!Number.isNaN(numValue) && numValue > 0) {
            if (!profile.premiums) {
              profile.premiums = {}
            }
            profile.premiums.annual = numValue
          }
        }
      } else {
        // String fields
        // @ts-expect-error - Dynamic field assignment
        profile[fieldName] = value
      }
    }

    match = kvPattern.exec(message)
  }

  return {
    profile,
    extractionMethod: 'key-value',
    confidence: 1.0,
  }
}

/**
 * Check if message contains key-value syntax
 *
 * @param message - Broker message to check
 * @returns True if key-value pattern detected
 */
export function hasKeyValueSyntax(message: string): boolean {
  const kvPattern = /(\w+):(\w+|\d+)(?=\s|,|\.|$)/gi
  return kvPattern.test(message)
}
