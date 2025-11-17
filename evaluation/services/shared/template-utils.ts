/**
 * Shared template utilities
 *
 * Centralized template replacement functions used across report generation.
 * Follows STAR principle (Single Truth, Authoritative Record).
 */

/**
 * Replace template placeholders with actual values
 *
 * Replaces all occurrences of {{key}} with the corresponding value from replacements.
 * Standardized name for template replacement across all report generators.
 */
export function replaceTemplatePlaceholders(
  template: string,
  replacements: Record<string, string>
): string {
  let output = template
  for (const [key, value] of Object.entries(replacements)) {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }
  return output
}
