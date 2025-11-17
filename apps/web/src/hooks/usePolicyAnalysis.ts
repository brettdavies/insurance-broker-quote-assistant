/**
 * usePolicyAnalysis Hook
 *
 * TanStack Query hook for managing policy analysis state.
 * Handles policy analysis API calls and result state.
 */

import { api } from '@/lib/api-client'
import type { PolicyAnalysisResult, PolicySummary } from '@repo/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export interface PolicyAnalysisRequest {
  policySummary: PolicySummary
  policyText?: string
}

export function usePolicyAnalysis() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (request: PolicyAnalysisRequest): Promise<PolicyAnalysisResult> => {
      // Call the /api/policy/analyze endpoint using Hono RPC client
      // @ts-expect-error - Hono RPC type inference issue for nested routes
      const response = await api.api.policy.analyze.$post({ json: request })

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: { message: 'Analysis failed' } }))
        throw new Error(errorData.error?.message || 'Policy analysis failed')
      }

      const result = await response.json()
      return result as PolicyAnalysisResult
    },
    onSuccess: () => {
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['policy-analysis'] })
    },
  })

  return mutation
}
