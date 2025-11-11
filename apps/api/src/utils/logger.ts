/**
 * Simple structured logging utility
 *
 * Logs to both console (for Docker) and program.log file
 */

import { appendFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const LOG_DIR = join(process.cwd(), 'logs')
const PROGRAM_LOG_FILE = join(LOG_DIR, 'program.log')

/**
 * Ensure logs directory exists
 */
async function ensureLogDir(): Promise<void> {
  try {
    await mkdir(LOG_DIR, { recursive: true })
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

/**
 * Write structured log entry
 */
async function writeLog(entry: Record<string, unknown>): Promise<void> {
  await ensureLogDir()
  const logLine = `${JSON.stringify(entry)}\n`

  // Write to file (non-blocking)
  appendFile(PROGRAM_LOG_FILE, logLine).catch((error) => {
    console.error('Failed to write to program.log:', error)
  })

  // Also echo to console for Docker logs
  console.log(JSON.stringify(entry))
}

/**
 * Log info message
 */
export async function logInfo(message: string, data?: Record<string, unknown>): Promise<void> {
  await writeLog({
    level: 'info',
    timestamp: new Date().toISOString(),
    message,
    ...data,
  })
}

/**
 * Log error message
 */
export async function logError(
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

  await writeLog(errorData)
}

/**
 * Log warning message
 */
export async function logWarn(message: string, data?: Record<string, unknown>): Promise<void> {
  await writeLog({
    level: 'warn',
    timestamp: new Date().toISOString(),
    message,
    ...data,
  })
}
