/**
 * Keyboard Utilities
 *
 * Shared utilities for keyboard event handling.
 */

/**
 * Check if a keyboard event has modifier keys pressed
 */
export function hasModifiers(e: KeyboardEvent): boolean {
  return e.metaKey || e.ctrlKey || e.altKey || e.shiftKey
}

/**
 * Check if the target element is a notes input
 */
export function isNotesInput(target: HTMLElement): boolean {
  return target.dataset.notesInput === 'true'
}

/**
 * Check if the target element is an input or textarea
 */
export function isOtherInput(target: HTMLElement): boolean {
  return ['INPUT', 'TEXTAREA'].includes(target.tagName)
}

/**
 * Check if the preceding text suggests we should ignore the slash
 * (e.g., dates like "12/31" or URLs)
 */
export function shouldIgnoreSlash(precedingText: string): boolean {
  return /\d$/.test(precedingText) || /:$/.test(precedingText)
}
