/**
 * useIntake Hook
 *
 * TanStack Query hook for managing chat state and field extraction.
 * Handles optimistic UI updates and reconciles with backend responses.
 */

import { api } from '@/lib/api-client'
import type { IntakeResult } from '@repo/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface IntakeRequest {
  message: string
  conversationHistory?: Array<{ role: string; content: string }>
}

export function useIntake() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (request: IntakeRequest): Promise<IntakeResult> => {
      // Call the /api/intake endpoint using Hono RPC client
      // @ts-expect-error - Hono RPC type inference issue, will be fixed in future stories
      const response = await api.api.intake.$post({ json: request })

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return result as IntakeResult
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['intake'] })
    },
  })

  return mutation
}
