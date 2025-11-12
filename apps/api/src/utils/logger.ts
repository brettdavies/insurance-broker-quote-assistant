/**
 * Central Logging Utility
 *
 * Supports multiple log targets/configurations.
 * Logs to both console (for Docker) and configurable log files.
 */

import { appendFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DecisionTrace } from '@repo/shared'
import { config } from '../config/env'

// Get workspace root (go up from apps/api/src/utils to workspace root)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const WORKSPACE_ROOT = join(__dirname, '../../../../')
const LOG_DIR = join(WORKSPACE_ROOT, 'logs')

export interface LoggerConfig {
  /** Target log file path (relative to workspace root or absolute) */
  filePath: string
  /** Whether to echo logs to console (default: true) */
  consoleOutput?: boolean
  /** Custom format function for log entries (optional) */
  logFormat?: (entry: Record<string, unknown>) => string
}

/**
 * Logger class supporting multiple log targets
 */
export class Logger {
  private readonly filePath: string
  private readonly consoleOutput: boolean
  private readonly logFormat: (entry: Record<string, unknown>) => string

  constructor(config: LoggerConfig) {
    // Resolve file path (if relative, resolve from workspace root)
    this.filePath = config.filePath.startsWith('/')
      ? config.filePath
      : join(WORKSPACE_ROOT, config.filePath)
    this.consoleOutput = config.consoleOutput ?? true
    this.logFormat = config.logFormat ?? ((entry) => `${JSON.stringify(entry)}\n`)
  }

  /**
   * Ensure log directory exists
   */
  private async ensureLogDir(): Promise<void> {
    try {
      const logDir = dirname(this.filePath)
      await mkdir(logDir, { recursive: true })
    } catch (error) {
      // Directory might already exist, ignore error
    }
  }

  /**
   * Write structured log entry
   */
  private async writeLog(entry: Record<string, unknown>): Promise<void> {
    await this.ensureLogDir()
    const logLine = this.logFormat(entry)

    // Write to file (non-blocking)
    appendFile(this.filePath, logLine).catch((error) => {
      console.error(`Failed to write to ${this.filePath}:`, error)
    })

    // Also echo to console for Docker logs (if enabled)
    if (this.consoleOutput) {
      console.log(JSON.stringify(entry))
    }
  }

  /**
   * Log info message
   */
  async logInfo(message: string, data?: Record<string, unknown>): Promise<void> {
    await this.writeLog({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...data,
    })
  }

  /**
   * Log error message
   */
  async logError(
    message: string,
    error?: Error | unknown,
    data?: Record<string, unknown>
  ): Promise<void> {
    const errorData: Record<string, unknown> = {
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      ...data,
    }

    if (error instanceof Error) {
      errorData.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      }
    } else if (error) {
      errorData.error = String(error)
    }

    await this.writeLog(errorData)
  }

  /**
   * Log warning message
   */
  async logWarn(message: string, data?: Record<string, unknown>): Promise<void> {
    await this.writeLog({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...data,
    })
  }

  /**
   * Log decision trace (for compliance logging)
   */
  async logDecisionTrace(trace: DecisionTrace): Promise<void> {
    // Format as JSON line (one trace per line for easy parsing)
    const logLine = `${JSON.stringify(trace)}\n`
    await this.ensureLogDir()

    // Write trace as JSON line
    appendFile(this.filePath, logLine).catch((error) => {
      // Log error to console but don't throw (compliance logging shouldn't break request)
      console.error(`Failed to write decision trace to ${this.filePath}:`, error)
    })
  }
}

/**
 * Default logger instances
 */

// Production logger (for operational logs)
// Use environment variable if set, otherwise use config, otherwise default
const programLogPath =
  process.env.PROGRAM_LOG_FILE ||
  (config.programLogFile.startsWith('/')
    ? config.programLogFile
    : join(WORKSPACE_ROOT, config.programLogFile))

export const productionLogger = new Logger({
  filePath: programLogPath,
  consoleOutput: true,
})

// Compliance logger (for audit trail)
// Use environment variable if set, otherwise use config, otherwise default
const complianceLogPath =
  process.env.COMPLIANCE_LOG_FILE ||
  (config.complianceLogFile.startsWith('/')
    ? config.complianceLogFile
    : join(WORKSPACE_ROOT, config.complianceLogFile))

export const complianceLogger = new Logger({
  filePath: complianceLogPath,
  consoleOutput: false, // Compliance logs don't go to console
})

/**
 * Convenience functions using default production logger
 * (for backward compatibility)
 */
export async function logInfo(message: string, data?: Record<string, unknown>): Promise<void> {
  return productionLogger.logInfo(message, data)
}

export async function logError(
  message: string,
  error?: Error | unknown,
  data?: Record<string, unknown>
): Promise<void> {
  return productionLogger.logError(message, error, data)
}

export async function logWarn(message: string, data?: Record<string, unknown>): Promise<void> {
  return productionLogger.logWarn(message, data)
}
