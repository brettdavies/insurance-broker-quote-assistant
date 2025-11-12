import type { PolicySummary } from '@repo/shared'

/**
 * Policy Summary Key-Value Parser
 *
 * Parses key-value syntax from policy text box into PolicySummary object.
 * Deterministic parsing (no LLM) for fast, reliable conversion.
 *
 * Supported formats:
 * - carrier:GEICO
 * - state:CA
 * - productType:auto
 * - premium:$1200/yr or premium:annual:$1200
 * - premium:monthly:$100/mo
 * - deductible:$500 or deductible:auto:$500
 * - deductible:home:$1000
 * - coverageLimit:liability:$100000
 * - effectiveDate:2024-01-01
 */

/**
 * Parse key-value text into PolicySummary
 *
 * @param text - Key-value formatted text (e.g., "carrier:GEICO state:CA premium:$1200/yr")
 * @returns Partial PolicySummary with extracted fields
 */
export function parsePolicySummaryFromKeyValueText(text: string): Partial<PolicySummary> {
  const summary: Partial<PolicySummary> = {}

  if (!text || text.trim().length === 0) {
    return summary
  }

  // Regex pattern: matches key:value (case-insensitive)
  // Supports formats like:
  // - carrier:GEICO
  // - premium:$1200/yr
  // - premium:annual:$1200
  // - deductible:auto:$500
  // - coverageLimit:liability:$100000
  const kvPattern = /(\w+)(?::(\w+))?:([\w$\/\-:]+|\d+)/gi
  let match: RegExpExecArray | null = kvPattern.exec(text)

  while (match !== null) {
    const key = match[1]?.toLowerCase()
    const subKey = match[2]?.toLowerCase() // For nested keys like "premium:annual"
    const value = match[3]

    if (!key || !value) continue

    // Parse flat fields
    // User contact fields
    if (key === 'name') {
      summary.name = value
    } else if (key === 'email') {
      summary.email = value
    } else if (key === 'phone') {
      summary.phone = value
    } else if (key === 'zip') {
      summary.zip = value
    } else if (key === 'state') {
      summary.state = value.toUpperCase()
    } else if (key === 'address') {
      summary.address = value
    }
    // Policy-specific fields
    else if (key === 'carrier') {
      summary.carrier = value
    } else if (key === 'producttype' || key === 'product') {
      // Validate product type enum
      const productType = value.toLowerCase()
      if (['auto', 'home', 'renters', 'umbrella'].includes(productType)) {
        summary.productType = productType as 'auto' | 'home' | 'renters' | 'umbrella'
      }
    }
    // Parse premiums
    else if (key === 'premium') {
      if (!summary.premiums) {
        summary.premiums = {}
      }
      // Handle formats: premium:$1200/yr, premium:annual:$1200, premium:monthly:$100/mo
      if (subKey === 'annual' || value.includes('/yr')) {
        const amount = parseAmount(value)
        if (amount) summary.premiums.annual = amount
      } else if (subKey === 'monthly' || value.includes('/mo')) {
        const amount = parseAmount(value)
        if (amount) summary.premiums.monthly = amount
      } else if (subKey === 'semiannual' || subKey === 'semi-annual' || value.includes('/6mo')) {
        const amount = parseAmount(value)
        if (amount) summary.premiums.semiAnnual = amount
      } else {
        // Default to annual if no subkey
        const amount = parseAmount(value)
        if (amount) summary.premiums.annual = amount
      }
    }
    // Parse deductibles
    else if (key === 'deductible') {
      if (!summary.deductibles) {
        summary.deductibles = {}
      }
      // Handle formats: deductible:$500, deductible:auto:$500
      const amount = parseAmount(value)
      if (amount !== null) {
        if (subKey === 'auto' || !subKey) {
          // Default to auto if no subkey specified
          summary.deductibles.auto = amount
        } else if (subKey === 'home') {
          summary.deductibles.home = amount
        } else if (subKey === 'comprehensive') {
          summary.deductibles.comprehensive = amount
        } else if (subKey === 'collision') {
          summary.deductibles.collision = amount
        }
      }
    }
    // Parse coverage limits
    else if (key === 'coveragelimit' || key === 'limit') {
      if (!summary.coverageLimits) {
        summary.coverageLimits = {}
      }
      // Handle format: coverageLimit:liability:$100000
      const amount = parseAmount(value)
      if (amount !== null && subKey) {
        const limitKey = subKey.toLowerCase()
        if (limitKey === 'liability') {
          summary.coverageLimits.liability = amount
        } else if (limitKey === 'propertydamage' || limitKey === 'property-damage') {
          summary.coverageLimits.propertyDamage = amount
        } else if (limitKey === 'comprehensive') {
          summary.coverageLimits.comprehensive = amount
        } else if (limitKey === 'collision') {
          summary.coverageLimits.collision = amount
        } else if (limitKey === 'uninsuredmotorist' || limitKey === 'uninsured-motorist') {
          summary.coverageLimits.uninsuredMotorist = amount
        } else if (
          limitKey === 'personalinjuryprotection' ||
          limitKey === 'personal-injury-protection' ||
          limitKey === 'pip'
        ) {
          summary.coverageLimits.personalInjuryProtection = amount
        } else if (limitKey === 'dwelling') {
          summary.coverageLimits.dwelling = amount
        } else if (limitKey === 'personalproperty' || limitKey === 'personal-property') {
          summary.coverageLimits.personalProperty = amount
        } else if (limitKey === 'lossofuse' || limitKey === 'loss-of-use') {
          summary.coverageLimits.lossOfUse = amount
        } else if (limitKey === 'medicalpayments' || limitKey === 'medical-payments') {
          summary.coverageLimits.medicalPayments = amount
        }
      }
    }
    // Parse effective dates
    else if (key === 'effectivedate' || key === 'effective') {
      if (!summary.effectiveDates) {
        summary.effectiveDates = {}
      }
      summary.effectiveDates.effectiveDate = value
    } else if (key === 'expirationdate' || key === 'expiration') {
      if (!summary.effectiveDates) {
        summary.effectiveDates = {}
      }
      summary.effectiveDates.expirationDate = value
    }

    match = kvPattern.exec(text)
  }

  return summary
}

/**
 * Parse amount from string (handles $, commas, /yr, /mo suffixes)
 *
 * @param value - String like "$1,200", "$1200/yr", "1200"
 * @returns Parsed number or null if invalid
 */
function parseAmount(value: string): number | null {
  // Remove $, commas, and common suffixes
  const cleaned = value.replace(/[$,\s]/g, '').replace(/\/yr|\/mo|\/6mo/gi, '')
  const parsed = Number.parseFloat(cleaned)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Compare two PolicySummary objects to detect sync issues
 *
 * @param a - First PolicySummary
 * @param b - Second PolicySummary
 * @returns True if they match (within tolerance for numeric fields)
 */
export function policiesMatch(a: Partial<PolicySummary>, b: Partial<PolicySummary>): boolean {
  // Compare carrier
  if (a.carrier !== b.carrier) return false

  // Compare state
  if (a.state !== b.state) return false

  // Compare productType
  if (a.productType !== b.productType) return false

  // Compare premiums
  if (a.premiums?.annual !== b.premiums?.annual) return false
  if (a.premiums?.monthly !== b.premiums?.monthly) return false
  if (a.premiums?.semiAnnual !== b.premiums?.semiAnnual) return false

  // Compare deductibles
  if (a.deductibles?.auto !== b.deductibles?.auto) return false
  if (a.deductibles?.home !== b.deductibles?.home) return false
  if (a.deductibles?.comprehensive !== b.deductibles?.comprehensive) return false
  if (a.deductibles?.collision !== b.deductibles?.collision) return false

  // Compare coverage limits (basic check - could be more thorough)
  if (a.coverageLimits?.liability !== b.coverageLimits?.liability) return false
  if (a.coverageLimits?.dwelling !== b.coverageLimits?.dwelling) return false

  // Compare effective dates
  if (a.effectiveDates?.effectiveDate !== b.effectiveDates?.effectiveDate) return false
  if (a.effectiveDates?.expirationDate !== b.effectiveDates?.expirationDate) return false

  return true
}
