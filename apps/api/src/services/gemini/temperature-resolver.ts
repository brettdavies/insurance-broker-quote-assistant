/**
 * Temperature Resolver
 *
 * Resolves temperature value from various sources with proper precedence.
 * Single Responsibility: Temperature configuration resolution
 */

/**
 * Resolve temperature value with proper precedence:
 * 1. Explicit parameter
 * 2. GEMINI_TEMPERATURE_EXTRACTION env var
 * 3. GEMINI_TEMPERATURE env var
 * 4. Default value (0.1 for extraction tasks)
 */
export function resolveTemperature(explicitTemperature?: number, defaultTemperature = 0.1): number {
  if (explicitTemperature !== undefined) {
    return explicitTemperature
  }

  const extractionTemp = process.env.GEMINI_TEMPERATURE_EXTRACTION
    ? Number.parseFloat(process.env.GEMINI_TEMPERATURE_EXTRACTION)
    : undefined

  if (extractionTemp !== undefined && !Number.isNaN(extractionTemp)) {
    return extractionTemp
  }

  const defaultTemp = process.env.GEMINI_TEMPERATURE
    ? Number.parseFloat(process.env.GEMINI_TEMPERATURE)
    : undefined

  if (defaultTemp !== undefined && !Number.isNaN(defaultTemp)) {
    return defaultTemp
  }

  return defaultTemperature
}
