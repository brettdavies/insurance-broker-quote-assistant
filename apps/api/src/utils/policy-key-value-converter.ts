import type { PolicySummary } from '@repo/shared'

/**
 * Policy Key-Value Converter
 *
 * Converts PolicySummary to key-value text format for display in editor.
 * Example: "carrier:GEICO state:CA productType:auto premium:$1200/yr deductible:$500"
 */

/**
 * Convert PolicySummary to key-value text format for display in editor
 *
 * @param policySummary - Policy summary to convert
 * @returns Key-value formatted string with trailing space
 */
export function convertPolicySummaryToKeyValueText(policySummary: PolicySummary): string {
  const parts: string[] = []

  if (policySummary.carrier) {
    parts.push(`carrier:${policySummary.carrier}`)
  }
  if (policySummary.state) {
    parts.push(`state:${policySummary.state}`)
  }
  if (policySummary.productType) {
    parts.push(`productType:${policySummary.productType}`)
  }

  // Coverage limits
  if (policySummary.coverageLimits) {
    const limits = policySummary.coverageLimits
    if (limits.liability) parts.push(`coverageLimit:liability:${limits.liability}`)
    if (limits.propertyDamage) parts.push(`coverageLimit:propertyDamage:${limits.propertyDamage}`)
    if (limits.comprehensive) parts.push(`coverageLimit:comprehensive:${limits.comprehensive}`)
    if (limits.collision) parts.push(`coverageLimit:collision:${limits.collision}`)
    if (limits.uninsuredMotorist)
      parts.push(`coverageLimit:uninsuredMotorist:${limits.uninsuredMotorist}`)
    if (limits.personalInjuryProtection)
      parts.push(`coverageLimit:personalInjuryProtection:${limits.personalInjuryProtection}`)
    if (limits.dwelling) parts.push(`coverageLimit:dwelling:${limits.dwelling}`)
    if (limits.personalProperty)
      parts.push(`coverageLimit:personalProperty:${limits.personalProperty}`)
    if (limits.lossOfUse) parts.push(`coverageLimit:lossOfUse:${limits.lossOfUse}`)
    if (limits.medicalPayments)
      parts.push(`coverageLimit:medicalPayments:${limits.medicalPayments}`)
  }

  // Deductibles
  if (policySummary.deductibles) {
    const deductibles = policySummary.deductibles
    if (deductibles.auto !== undefined) parts.push(`deductible:auto:${deductibles.auto}`)
    if (deductibles.home !== undefined) parts.push(`deductible:home:${deductibles.home}`)
    if (deductibles.comprehensive !== undefined)
      parts.push(`deductible:comprehensive:${deductibles.comprehensive}`)
    if (deductibles.collision !== undefined)
      parts.push(`deductible:collision:${deductibles.collision}`)
  }

  // Premiums
  if (policySummary.premiums) {
    const premiums = policySummary.premiums
    if (premiums.annual) parts.push(`premium:annual:$${premiums.annual}/yr`)
    if (premiums.monthly) parts.push(`premium:monthly:$${premiums.monthly}/mo`)
    if (premiums.semiAnnual) parts.push(`premium:semiAnnual:$${premiums.semiAnnual}/6mo`)
  }

  // Effective dates
  if (policySummary.effectiveDates) {
    const dates = policySummary.effectiveDates
    if (dates.effectiveDate) parts.push(`effectiveDate:${dates.effectiveDate}`)
    if (dates.expirationDate) parts.push(`expirationDate:${dates.expirationDate}`)
  }

  // Join with spaces and add trailing space to trigger pill transformation
  return `${parts.join(' ')} `
}
