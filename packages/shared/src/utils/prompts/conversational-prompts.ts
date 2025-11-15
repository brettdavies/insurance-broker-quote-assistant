/**
 * Conversational Prompts Utilities
 *
 * Shared utilities for building conversational extraction prompts.
 * These are pure functions that take template content and inject variables.
 * File I/O for loading templates should be handled by the backend.
 */

import type { UserProfile } from '../../schemas/user-profile'

/**
 * Build system prompt with known/inferred/suppressed fields injected
 *
 * @param template - System prompt template content
 * @param knownFields - Known fields explicitly set by broker (read-only for LLM)
 * @param inferredFields - Inferred fields from InferenceEngine (modifiable by LLM)
 * @param suppressedFields - Array of field names to skip during inference
 * @returns Built system prompt with variables replaced
 */
export function buildSystemPrompt(
  template: string,
  knownFields: Partial<UserProfile>,
  inferredFields: Partial<UserProfile>,
  suppressedFields: string[]
): string {
  return template
    .replace('{{knownFields}}', JSON.stringify(knownFields))
    .replace('{{inferredFields}}', JSON.stringify(inferredFields))
    .replace('{{suppressedFields}}', suppressedFields.join(', '))
}

/**
 * Build user prompt with known/inferred/suppressed fields injected
 *
 * @param template - User prompt template content
 * @param message - Current broker message (cleaned text without pills)
 * @param knownFields - Known fields explicitly set by broker (read-only for LLM)
 * @param inferredFields - Inferred fields from InferenceEngine (modifiable by LLM)
 * @param suppressedFields - Array of field names to skip during inference
 * @returns Built user prompt with variables replaced
 */
export function buildUserPrompt(
  template: string,
  message: string,
  knownFields: Partial<UserProfile>,
  inferredFields: Partial<UserProfile>,
  suppressedFields: string[]
): string {
  return template
    .replace('{{knownFields}}', JSON.stringify(knownFields, null, 2))
    .replace('{{inferredFields}}', JSON.stringify(inferredFields, null, 2))
    .replace('{{suppressedFields}}', suppressedFields.join(', '))
    .replace('{{message}}', message)
}
