/**
 * Environment Configuration
 *
 * Typed environment variable access with defaults.
 * Never access process.env directly - use this config object instead.
 *
 * @see docs/architecture/17-coding-standards.md#171-critical-architectural-rules
 */

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key]
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Required environment variable ${key} is not set`)
    }
    return defaultValue
  }
  return value
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key]
  if (value === undefined) {
    return defaultValue
  }
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid number`)
  }
  return parsed
}

export const config = {
  // Server configuration
  nodeEnv: getEnv('NODE_ENV', 'development'),
  apiPort: getEnvNumber('API_PORT', 7070),
  frontendPort: getEnvNumber('FRONTEND_PORT', 3000),

  // Logging configuration
  logLevel: getEnv('LOG_LEVEL', 'info'),
  programLogFile: getEnv('PROGRAM_LOG_FILE', './logs/program.log'),
  complianceLogFile: getEnv('COMPLIANCE_LOG_FILE', './logs/compliance.log'),

  // LLM configuration
  llmProvider: getEnv('LLM_PROVIDER', 'gemini'), // 'gemini' or future 'openai'
  llmTimeoutMs: getEnvNumber('LLM_TIMEOUT_MS', 10000), // 10 seconds default

  // Gemini configuration
  geminiApiKey: getEnv('GEMINI_API_KEY', ''), // Optional for free tier
  geminiModel: getEnv('GEMINI_MODEL', 'gemini-2.5-flash-lite'),

  // OpenAI configuration (for future use)
  openaiApiKey: getEnv('OPENAI_API_KEY', ''),
} as const

// Validate required environment variables at startup
if (config.llmProvider === 'openai' && !config.openaiApiKey) {
  throw new Error('OPENAI_API_KEY is required when LLM_PROVIDER=openai')
}
