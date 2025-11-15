/**
 * State Queries
 *
 * Query functions for state-related data from the knowledge pack.
 */

import type { State } from '@repo/shared'
import { getState, getAllStates } from '../knowledge-pack-loader'

/**
 * Get a state by code (case-insensitive, normalized to uppercase)
 *
 * @param code - Two-letter state code (e.g., "CA", "ca", "Tx", "fl")
 * @returns State object or undefined if not found
 */
export function getStateByCode(code: string): State | undefined {
  // Normalize to uppercase for lookup (state codes should be uppercase)
  return getState(code.toUpperCase())
}

/**
 * Get all states
 *
 * @returns Array of all loaded states
 */
export function getAllStatesList(): State[] {
  return getAllStates()
}
