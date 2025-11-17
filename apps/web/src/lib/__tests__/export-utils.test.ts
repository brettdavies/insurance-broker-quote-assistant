import '../../test-setup'
import { describe, expect, it } from 'bun:test'
import type { PolicyAnalysisResult } from '@repo/shared'
import { exportSavingsPitch } from '../export-utils'

describe('export-utils', () => {
  const createMockPolicyAnalysisResult = (
    overrides?: Partial<PolicyAnalysisResult>
  ): PolicyAnalysisResult => ({
    currentPolicy: {
      carrier: 'GEICO',
      state: 'CA',
      productType: 'auto',
      ...overrides?.currentPolicy,
    },
    opportunities: [],
    bundleOptions: [],
    deductibleOptimizations: [],
    pitch: 'Test pitch',
    complianceValidated: true,
    ...overrides,
  })

  describe('exportSavingsPitch', () => {
    it('should validate data using Zod schema before export', () => {
      const invalidResult = {
        currentPolicy: {},
        opportunities: 'invalid',
      } as unknown as PolicyAnalysisResult

      expect(() => exportSavingsPitch(invalidResult)).toThrow('Export failed')
    })

    it('should export valid PolicyAnalysisResult without errors', () => {
      const result = createMockPolicyAnalysisResult()

      // In test environment, this may not actually download but should not throw
      expect(() => exportSavingsPitch(result)).not.toThrow()
    })

    it('should handle results with all opportunity types', () => {
      const result = createMockPolicyAnalysisResult({
        opportunities: [
          {
            discount: 'Test Discount',
            percentage: 15,
            annualSavings: 180,
            requires: ['Requirement 1'],
            citation: {
              id: 'disc_123',
              type: 'discount',
              carrier: 'GEICO',
              file: 'knowledge_pack/carriers/geico.json',
            },
            confidenceScore: 85,
            validationDetails: {
              rulesEvaluated: [],
              missingData: [],
              eligibilityChecks: {
                discountFound: true,
                eligibilityValidated: true,
                savingsCalculated: true,
                stackingValidated: false,
              },
            },
            requiresDocumentation: false,
            validatedAt: new Date().toISOString(),
          },
        ],
        bundleOptions: [
          {
            product: 'home',
            estimatedSavings: 200,
            requiredActions: ['Add home insurance'],
            citation: {
              id: 'bundle_123',
              type: 'bundle',
              carrier: 'GEICO',
              file: 'knowledge_pack/carriers/geico.json',
            },
          },
        ],
        deductibleOptimizations: [
          {
            currentDeductible: 500,
            suggestedDeductible: 1000,
            estimatedSavings: 150,
            premiumImpact: -150,
            citation: {
              id: 'ded_123',
              type: 'deductible',
              carrier: 'GEICO',
              file: 'knowledge_pack/carriers/geico.json',
            },
          },
        ],
      })

      expect(() => exportSavingsPitch(result)).not.toThrow()
    })
  })
})
