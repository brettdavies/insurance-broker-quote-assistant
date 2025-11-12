/**
 * Test Target Configuration
 *
 * Defines test execution targets and factory functions for creating
 * appropriate LLM providers based on test target.
 *
 * Supports:
 * - 'mock': Mock LLM provider (fast, deterministic)
 * - 'real-api': Real API provider (Gemini/OpenAI, requires API keys)
 * - 'contract': Contract testing (future)
 */

/**
 * Test execution target
 */
export type TestTarget = 'mock' | 'real-api' | 'contract'

/**
 * Get test targets from environment or return defaults
 *
 * Environment variables:
 * - TEST_TARGETS: Comma-separated list of targets (e.g., "mock,real-api")
 * - TEST_GEMINI_API: Legacy support - if "true", adds 'real-api' to targets
 *
 * Default: ['mock'] (fast, no API costs)
 */
export function getTestTargets(): TestTarget[] {
  const targets: TestTarget[] = []

  // Check legacy env var for backward compatibility
  if (process.env.TEST_GEMINI_API === 'true') {
    targets.push('real-api')
  }

  // Check new env var
  if (process.env.TEST_TARGETS) {
    const envTargets = process.env.TEST_TARGETS.split(',').map((t) => t.trim() as TestTarget)
    for (const target of envTargets) {
      if (['mock', 'real-api', 'contract'].includes(target) && !targets.includes(target)) {
        targets.push(target)
      }
    }
  }

  // Default to mock if no targets specified
  if (targets.length === 0) {
    targets.push('mock')
  }

  return targets
}

/**
 * Check if a specific target is enabled
 */
export function isTargetEnabled(target: TestTarget): boolean {
  return getTestTargets().includes(target)
}
