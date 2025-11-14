/**
 * Manages session-scoped suppression list for dismissed inferred fields.
 *
 * The suppression list tracks which inferred fields the broker has explicitly dismissed
 * via [✕] button or [Delete] action. Suppressed fields are excluded from future
 * inference attempts within the same session.
 *
 * Lifecycle:
 * - Created: Empty array on session start
 * - Updated: When user clicks [✕] or [Delete]
 * - Cleared: On `/reset` command or page refresh
 * - Override: Converting inferred → known removes field from suppression list
 *
 * Storage: Session-scoped only (no localStorage, no database persistence)
 */
export class SuppressionManager {
  private suppressedFields: string[] = []

  /**
   * Add a field to the suppression list.
   * Prevents the field from being re-inferred in subsequent API calls.
   *
   * @param fieldName - Name of the field to suppress (e.g., "ownsHome")
   */
  addSuppression(fieldName: string): void {
    if (!this.suppressedFields.includes(fieldName)) {
      this.suppressedFields.push(fieldName)
    }
  }

  /**
   * Remove a field from the suppression list.
   * Allows the field to be inferred again in subsequent API calls.
   *
   * Typically called when broker converts inferred field to known field.
   *
   * @param fieldName - Name of the field to unsuppress (e.g., "ownsHome")
   */
  removeSuppression(fieldName: string): void {
    this.suppressedFields = this.suppressedFields.filter((f) => f !== fieldName)
  }

  /**
   * Check if a field is currently suppressed.
   *
   * @param fieldName - Name of the field to check
   * @returns true if field is in suppression list, false otherwise
   */
  isSuppressed(fieldName: string): boolean {
    return this.suppressedFields.includes(fieldName)
  }

  /**
   * Get all suppressed fields.
   *
   * @returns Copy of suppressedFields array (prevents external mutation)
   */
  getAll(): string[] {
    return [...this.suppressedFields]
  }

  /**
   * Clear all suppressed fields.
   * Resets suppression list to empty array.
   *
   * Typically called on `/reset` command or session reset.
   */
  clear(): void {
    this.suppressedFields = []
  }
}
