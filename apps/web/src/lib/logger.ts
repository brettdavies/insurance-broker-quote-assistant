/**
 * Frontend Logger
 *
 * Sends all logs to backend API for product/compliance logging.
 * Matches backend logger interface for consistency.
 */

const LOG_API_ENDPOINT = '/api/log'

interface LogData {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  data?: Record<string, unknown>
  timestamp?: string
  type?: 'product' | 'compliance'
}

// Queue for logs when offline or API fails
let logQueue: LogData[] = []
let isProcessingQueue = false

/**
 * Send log to backend API
 */
async function sendLog(log: LogData): Promise<void> {
  try {
    const response = await fetch(LOG_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs: log }),
    })

    if (!response.ok) {
      throw new Error(`Log API returned ${response.status}`)
    }
  } catch (error) {
    // Queue log for retry if network fails
    logQueue.push(log)

    // Echo to console in development for local debugging
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod =
        log.level === 'error'
          ? console.error
          : log.level === 'warn'
            ? console.warn
            : log.level === 'debug'
              ? console.debug
              : console.log
      consoleMethod(`[${log.level.toUpperCase()}] ${log.message}`, log.data || '')
    }
  }
}

/**
 * Process queued logs (retry failed logs)
 */
async function processLogQueue(): Promise<void> {
  if (isProcessingQueue || logQueue.length === 0) {
    return
  }

  isProcessingQueue = true

  let logsToSend: LogData[] = []
  try {
    logsToSend = [...logQueue]
    logQueue = []

    const response = await fetch(LOG_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs: logsToSend }),
    })

    if (!response.ok) {
      // Re-queue logs if still failing
      logQueue.push(...logsToSend)
    }
  } catch (error) {
    // Re-queue logs if network still failing
    // (logs will be lost if queue gets too large, but that's acceptable for logging)
    if (logsToSend.length < 100) {
      // Only re-queue if queue isn't too large
      logQueue.push(...logsToSend)
    }
  } finally {
    isProcessingQueue = false
  }
}

// Process queue periodically (every 5 seconds)
if (typeof window !== 'undefined') {
  setInterval(processLogQueue, 5000)

  // Also process queue when coming back online
  window.addEventListener('online', () => {
    processLogQueue()
  })
}

/**
 * Log debug message
 */
export async function logDebug(
  message: string,
  data?: Record<string, unknown>,
  type: 'product' | 'compliance' = 'product'
): Promise<void> {
  await sendLog({
    level: 'debug',
    message,
    data,
    timestamp: new Date().toISOString(),
    type,
  })
}

/**
 * Log info message
 */
export async function logInfo(
  message: string,
  data?: Record<string, unknown>,
  type: 'product' | 'compliance' = 'product'
): Promise<void> {
  await sendLog({
    level: 'info',
    message,
    data,
    timestamp: new Date().toISOString(),
    type,
  })
}

/**
 * Log warning message
 */
export async function logWarn(
  message: string,
  data?: Record<string, unknown>,
  type: 'product' | 'compliance' = 'product'
): Promise<void> {
  await sendLog({
    level: 'warn',
    message,
    data,
    timestamp: new Date().toISOString(),
    type,
  })
}

/**
 * Log error message
 */
export async function logError(
  message: string,
  error?: Error | unknown,
  data?: Record<string, unknown>,
  type: 'product' | 'compliance' = 'product'
): Promise<void> {
  const errorData = {
    ...data,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  }

  await sendLog({
    level: 'error',
    message,
    data: errorData,
    timestamp: new Date().toISOString(),
    type,
  })
}
