/**
 * Log Loader
 *
 * Handles loading and parsing of log files.
 * Follows SRP (Single Responsibility Principle).
 */

import { readFile } from 'node:fs/promises'
import type { DecisionTrace } from '@repo/shared'
import { splitCombinedPrompt } from './prompt-parser'
import { FILE_PATHS, LOG_ENTRY_TYPES, TIME_WINDOWS } from './report-constants'
import { findClosestBeforeTime, parseTimestamp } from './report-utils'

/**
 * Prompt entry from logs
 */
export interface PromptEntry {
  timestamp: string
  prompt: string
  systemPrompt?: string
  userPrompt?: string
  response?: unknown
}

/**
 * Log entry types for parsing
 */
interface LogEntry {
  timestamp?: string
  type?: string
  prompt?: string
  systemPrompt?: string
  userPrompt?: string
  response?: unknown
}

/**
 * Load traces from compliance.log
 */
export async function loadTracesFromLogs(): Promise<Map<number, DecisionTrace>> {
  const tracesByTimestamp = new Map<number, DecisionTrace>()

  try {
    const content = await readFile(FILE_PATHS.COMPLIANCE_LOG, 'utf-8').catch(() => '')
    for (const line of content.split('\n')) {
      if (line.trim()) {
        try {
          const trace = JSON.parse(line) as DecisionTrace
          if (trace.timestamp) {
            const timestamp = parseTimestamp(trace.timestamp)
            tracesByTimestamp.set(timestamp, trace)
          }
        } catch {
          // Skip invalid JSON lines
        }
      }
    }
  } catch {
    // File doesn't exist or can't be read
  }

  return tracesByTimestamp
}

/**
 * Load prompts from program.log
 */
export async function loadPromptsFromLogs(): Promise<Map<number, PromptEntry>> {
  const promptsByTimestamp = new Map<number, PromptEntry>()

  try {
    const content = await readFile(FILE_PATHS.PROGRAM_LOG, 'utf-8').catch(() => '')
    const lines = content.split('\n')

    // First pass: collect all prompts
    await collectPrompts(lines, promptsByTimestamp)

    // Second pass: attach LLM responses to corresponding prompts
    await attachResponses(lines, promptsByTimestamp)
  } catch {
    // File doesn't exist or can't be read
  }

  return promptsByTimestamp
}

/**
 * Load both traces and prompts from logs
 */
export async function loadTracesAndPromptsFromLogs(): Promise<{
  tracesByTimestamp: Map<number, DecisionTrace>
  promptsByTimestamp: Map<number, PromptEntry>
}> {
  const [tracesByTimestamp, promptsByTimestamp] = await Promise.all([
    loadTracesFromLogs(),
    loadPromptsFromLogs(),
  ])

  return { tracesByTimestamp, promptsByTimestamp }
}

/**
 * Collect prompts from log lines (first pass)
 */
async function collectPrompts(
  lines: string[],
  promptsByTimestamp: Map<number, PromptEntry>
): Promise<void> {
  for (const line of lines) {
    if (!line.trim()) continue

    try {
      const entry = JSON.parse(line) as LogEntry

      // Look for LLM prompt entries
      if (isPromptEntry(entry)) {
        const prompt = parsePromptEntry(entry)
        if (prompt && entry.timestamp) {
          const timestamp = parseTimestamp(entry.timestamp)
          promptsByTimestamp.set(timestamp, prompt)
        }
      }
    } catch {
      // Skip invalid JSON lines
    }
  }
}

/**
 * Attach responses to prompts (second pass)
 */
async function attachResponses(
  lines: string[],
  promptsByTimestamp: Map<number, PromptEntry>
): Promise<void> {
  for (const line of lines) {
    if (!line.trim()) continue

    try {
      const entry = JSON.parse(line) as LogEntry

      // Look for LLM response entries
      if (isResponseEntry(entry)) {
        const responseTime = parseTimestamp(entry.timestamp)
        const closestPrompt = findClosestBeforeTime(
          responseTime,
          promptsByTimestamp,
          TIME_WINDOWS.PROMPT_MATCH_MS
        )

        if (closestPrompt) {
          promptsByTimestamp.set(closestPrompt.time, {
            ...closestPrompt.value,
            response: entry.response,
          })
        }
      }
    } catch {
      // Skip invalid JSON lines
    }
  }
}

/**
 * Check if log entry is a prompt entry
 */
function isPromptEntry(entry: LogEntry): boolean {
  return (
    entry.type === LOG_ENTRY_TYPES.LLM_PROMPT ||
    entry.type === LOG_ENTRY_TYPES.LLM_PROMPT_DEBUG ||
    (!!entry.prompt && !!entry.timestamp)
  )
}

/**
 * Check if log entry is a response entry
 */
function isResponseEntry(
  entry: LogEntry
): entry is LogEntry & { timestamp: string; response: string } {
  return entry.type === LOG_ENTRY_TYPES.LLM_RESPONSE && !!entry.timestamp && !!entry.response
}

/**
 * Parse prompt entry into PromptEntry
 */
function parsePromptEntry(entry: LogEntry): PromptEntry | null {
  if (!entry.timestamp) return null

  // Prefer separate system/user prompts if available (new format)
  if (entry.systemPrompt && entry.userPrompt) {
    return {
      timestamp: entry.timestamp,
      prompt: `${entry.systemPrompt}\n\n${entry.userPrompt}`, // Reconstruct combined for compatibility
      systemPrompt: entry.systemPrompt,
      userPrompt: entry.userPrompt,
    }
  }

  // Old format: try to split combined prompt
  if (entry.prompt) {
    const split = splitCombinedPrompt(entry.prompt)
    return {
      timestamp: entry.timestamp,
      prompt: entry.prompt,
      systemPrompt: split.systemPrompt || undefined,
      userPrompt: split.userPrompt,
    }
  }

  return null
}
