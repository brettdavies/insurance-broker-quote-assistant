import { SuppressionManager } from '@/lib/suppression-manager'
import { useReducer, useState } from 'react'

/**
 * React hook for managing session-scoped suppression list.
 *
 * Provides methods to add/remove/check suppressed fields and integrates
 * with React's state management to trigger re-renders when suppression
 * list changes.
 *
 * Lifecycle:
 * - Initialized with empty suppression list on component mount
 * - Updated when user dismisses inferred fields ([✕] or [Delete])
 * - Cleared when converting inferred → known or on /reset command
 * - Reset on page refresh (session-scoped, no persistence)
 *
 * @returns Methods to manage suppression list
 */
export function useSuppressionManager() {
  // Initialize SuppressionManager instance (session-scoped)
  const [manager] = useState(() => new SuppressionManager())

  // Force re-render mechanism when suppression list changes
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  return {
    /**
     * Add field to suppression list (prevents re-inference).
     * Typically called when user clicks [✕] or [Delete] on inferred field.
     *
     * @param fieldName - Name of field to suppress
     */
    addSuppression: (fieldName: string) => {
      manager.addSuppression(fieldName)
      forceUpdate() // Trigger re-render
    },

    /**
     * Remove field from suppression list (allows re-inference).
     * Typically called when user converts inferred field to known field.
     *
     * @param fieldName - Name of field to unsuppress
     */
    removeSuppression: (fieldName: string) => {
      manager.removeSuppression(fieldName)
      forceUpdate() // Trigger re-render
    },

    /**
     * Check if field is currently suppressed.
     *
     * @param fieldName - Name of field to check
     * @returns true if field is suppressed, false otherwise
     */
    isSuppressed: (fieldName: string) => manager.isSuppressed(fieldName),

    /**
     * Get all suppressed fields.
     *
     * @returns Array of suppressed field names
     */
    getSuppressed: () => manager.getAll(),

    /**
     * Clear all suppressed fields.
     * Typically called on /reset command.
     */
    clearSuppressed: () => {
      manager.clear()
      forceUpdate() // Trigger re-render
    },
  }
}
