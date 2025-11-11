import { z } from 'zod'

/**
 * Missing Field Schema
 *
 * Represents a missing required field with priority indicator.
 * Used in both frontend and backend for consistent type safety.
 *
 * @see docs/stories/1.9.real-time-missing-fields-detection.md
 */

export const missingFieldSchema = z.object({
  field: z.string(), // Field key (e.g., "state", "vehicles", "drivers")
  priority: z.enum(['critical', 'important', 'optional']), // Priority level
})

export type MissingField = z.infer<typeof missingFieldSchema>

/**
 * Missing Field Info (Frontend variant with display name)
 *
 * Frontend may add display name for UI purposes, but core schema remains the same.
 */
export interface MissingFieldInfo extends MissingField {
  name?: string // Display name for UI (optional, can be derived from field key)
  fieldKey?: string // Alias for field (for backward compatibility)
}
