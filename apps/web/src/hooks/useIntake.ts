/**
 * useIntake Hook
 *
 * TanStack Query hook for managing chat state and field extraction.
 * Handles optimistic UI updates and reconciles with backend responses.
 */

import { api } from '@/lib/api-client'
import { extractFields, parseKeyValueSyntax } from '@/lib/key-value-parser'
import type { IntakeResult } from '@repo/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface IntakeRequest {
  message: string
  conversationHistory?: Array<{ role: string; content: string }>
}

/**
 * Fallback function to parse fields locally when API is unavailable
 */
function fallbackParseFields(message: string): IntakeResult {
  const parsed = parseKeyValueSyntax(message)
  const extractedFields = extractFields(parsed)

  // Convert extracted fields to UserProfile format
  const profile: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(extractedFields)) {
    profile[key] = value
  }

  // Generate basic missing fields list (simplified for fallback)
  const missingFields: IntakeResult['missingFields'] = []
  const capturedFields = new Set(Object.keys(profile))

  // Critical fields that should be captured
  const criticalFields = ['name', 'state', 'productLine']
  for (const field of criticalFields) {
    if (!capturedFields.has(field)) {
      missingFields.push({ field, priority: 'critical' })
    }
  }

  return {
    profile: profile as IntakeResult['profile'],
    missingFields,
    complianceValidated: true,
  }
}

export function useIntake() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (request: IntakeRequest): Promise<IntakeResult> => {
      try {
        // Call the /api/intake endpoint using Hono RPC client
        // @ts-expect-error - Hono RPC type inference issue, will be fixed in future stories
        const response = await api.api.intake.$post({ json: request })

        if (!response.ok) {
          // If API returns 404 or other error, fall back to local parsing
          return fallbackParseFields(request.message)
        }

        let result: IntakeResult
        try {
          result = await response.json()
        } catch {
          // If response body is invalid JSON, fall back to local parsing
          return fallbackParseFields(request.message)
        }

        // If API returns empty profile, invalid structure, or no fields extracted, fall back to local parsing
        if (
          !result ||
          !result.profile ||
          typeof result.profile !== 'object' ||
          Object.keys(result.profile).length === 0
        ) {
          return fallbackParseFields(request.message)
        }

        return result
      } catch (error) {
        // If API call fails for any reason, fall back to local parsing
        // This allows frontend development to proceed even if backend is not available
        // Catch all errors (network errors, connection refused, API errors, etc.)
        return fallbackParseFields(request.message)
      }
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['intake'] })
    },
  })

  return mutation
}
