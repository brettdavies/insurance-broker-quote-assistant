/**
 * Toast Helpers
 *
 * Utility functions for common toast notification patterns.
 * Implements DRY principle - single source for toast messages.
 */

import type { toast as ToastFn } from '@/components/ui/use-toast'

export const TOAST_DURATION = {
  SHORT: 3000,
  LONG: 5000,
} as const

export function showFieldCapturedToast(toast: typeof ToastFn, key: string, value: unknown) {
  toast({
    title: 'Field captured',
    description: `${key}: ${value}`,
    duration: TOAST_DURATION.SHORT,
  })
}

export function showFieldRemovedToast(toast: typeof ToastFn, fieldName: string) {
  toast({
    title: 'Field removed',
    description: `${fieldName} has been removed`,
    duration: TOAST_DURATION.SHORT,
  })
}

export function showErrorToast(toast: typeof ToastFn, title: string, description: string) {
  toast({
    title,
    description,
    variant: 'destructive',
    duration: TOAST_DURATION.LONG,
  })
}

export function showSuccessToast(toast: typeof ToastFn, title: string, description: string) {
  toast({
    title,
    description,
    duration: TOAST_DURATION.SHORT,
  })
}
