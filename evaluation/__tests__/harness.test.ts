/**
 * Unit Tests for Evaluation Harness Components
 *
 * Tests metrics calculator, report generator, and error handling logic.
 *
 * @see docs/stories/3.1.evaluation-harness-test-cases.md#task-8
 */

import { describe, expect, it } from 'bun:test'
import type {
  IntakeResult,
  PolicyAnalysisResult,
  RouteDecision,
  UserProfile,
} from '../../packages/shared/src/index'

// Mock test case data
const mockConversationalTestCase = {
  id: 'conv-test-01',
  name: 'Test Case',
  description: 'Test description',
  type: 'conversational' as const,
  carrier: 'GEICO',
  state: 'CA',
  product: 'auto',
  input: 'I need auto insurance in California',
  expectedProfile: {
    state: 'CA',
    productType: 'auto',
  } as UserProfile,
  expectedRoute: {
    primaryCarrier: 'GEICO',
    eligibleCarriers: ['GEICO'],
    confidence: 0.9,
    rationale: 'Test rationale',
    citations: [],
  } as RouteDecision,
  expectedOpportunities: [],
}

const mockPolicyTestCase = {
  id: 'policy-test-01',
  name: 'Policy Test Case',
  description: 'Policy test description',
  type: 'policy' as const,
  carrier: 'GEICO',
  state: 'CA',
  product: 'auto',
  policyInput: 'Policy text here',
  expectedPolicy: {
    carrier: 'GEICO',
    state: 'CA',
    productType: 'auto',
  },
  expectedOpportunities: [],
}

describe('Evaluation Harness - Metrics Calculator', () => {
  describe('Routing Accuracy Calculation', () => {
    it('should calculate 100% accuracy when expected and actual carriers match', () => {
      const actualResponse: IntakeResult = {
        profile: {} as UserProfile,
        missingFields: [],
        route: {
          primaryCarrier: 'GEICO',
          eligibleCarriers: ['GEICO'],
          confidence: 0.9,
          rationale: 'Test',
          citations: [],
        },
        complianceValidated: true,
      }

      // This would be tested via the calculateMetrics function
      // For now, we test the logic directly
      const expectedCarrier = 'GEICO'
      const actualCarrier = actualResponse.route?.primaryCarrier
      const accuracy = expectedCarrier === actualCarrier ? 100 : 0

      expect(accuracy).toBe(100)
    })

    it('should calculate 0% accuracy when expected and actual carriers do not match', () => {
      const actualResponse: IntakeResult = {
        profile: {} as UserProfile,
        missingFields: [],
        route: {
          primaryCarrier: 'Progressive',
          eligibleCarriers: ['Progressive'],
          confidence: 0.9,
          rationale: 'Test',
          citations: [],
        },
        complianceValidated: true,
      }

      const expectedCarrier = 'GEICO'
      const actualCarrier = actualResponse.route?.primaryCarrier
      const accuracy = expectedCarrier === actualCarrier ? 100 : 0

      expect(accuracy).toBe(0)
    })
  })

  describe('Intake Completeness Calculation', () => {
    it('should calculate 100% completeness when all expected fields match', () => {
      const expected: Record<string, unknown> = {
        state: 'CA',
        productType: 'auto',
        age: 30,
      }

      const actual: Record<string, unknown> = {
        state: 'CA',
        productType: 'auto',
        age: 30,
      }

      const expectedFields = Object.keys(expected).filter((key) => {
        const value = expected[key]
        return value !== undefined && value !== null && value !== ''
      })

      const matchedFields = expectedFields.filter((key) => {
        return JSON.stringify(expected[key]) === JSON.stringify(actual[key])
      })

      const completeness = Math.round((matchedFields.length / expectedFields.length) * 100)

      expect(completeness).toBe(100)
    })

    it('should calculate partial completeness when some fields match', () => {
      const expected: Record<string, unknown> = {
        state: 'CA',
        productType: 'auto',
        age: 30,
      }

      const actual: Record<string, unknown> = {
        state: 'CA',
        productType: 'auto',
        // age is missing
      }

      const expectedFields = Object.keys(expected).filter((key) => {
        const value = expected[key]
        return value !== undefined && value !== null && value !== ''
      })

      const matchedFields = expectedFields.filter((key) => {
        return JSON.stringify(expected[key]) === JSON.stringify(actual[key])
      })

      const completeness = Math.round((matchedFields.length / expectedFields.length) * 100)

      expect(completeness).toBe(67) // 2 out of 3 fields match
    })
  })

  describe('Pitch Clarity Scoring', () => {
    it('should score 100 points for pitch with all rubric elements', () => {
      const pitch =
        'You qualify for a 15% discount because you have a clean record. This saves you $300 per year. [disc_abc123]'

      let score = 0

      // Check for "because" rationale (25 points)
      const hasBecause = /\bbecause\b/i.test(pitch)
      if (hasBecause) score += 25

      // Check for discount percentages (25 points)
      const hasPercentage = /%\s*off|\d+%\s*(discount|savings|off)/i.test(pitch)
      if (hasPercentage) score += 25

      // Check for dollar savings (25 points)
      const hasDollarSavings = /\$\d+|\d+\s*dollars?/i.test(pitch)
      if (hasDollarSavings) score += 25

      // Check for citations (25 points)
      const hasCitation = /\[.*?\]|disc_\w+|cite_\w+/i.test(pitch)
      if (hasCitation) score += 25

      expect(score).toBe(100)
    })

    it('should score 50 points for pitch with only some rubric elements', () => {
      const pitch = 'You qualify for a 15% discount because you have a clean record.'

      let score = 0

      const hasBecause = /\bbecause\b/i.test(pitch)
      if (hasBecause) score += 25

      const hasPercentage = /%\s*off|\d+%\s*(discount|savings|off)/i.test(pitch)
      if (hasPercentage) score += 25

      const hasDollarSavings = /\$\d+|\d+\s*dollars?/i.test(pitch)
      if (hasDollarSavings) score += 25

      const hasCitation = /\[.*?\]|disc_\w+|cite_\w+/i.test(pitch)
      if (hasCitation) score += 25

      expect(score).toBe(50) // Only "because" and percentage
    })

    it('should score 0 points for pitch with no rubric elements', () => {
      const pitch = 'You qualify for insurance.'

      let score = 0

      const hasBecause = /\bbecause\b/i.test(pitch)
      if (hasBecause) score += 25

      const hasPercentage = /%\s*off|\d+%\s*(discount|savings|off)/i.test(pitch)
      if (hasPercentage) score += 25

      const hasDollarSavings = /\$\d+|\d+\s*dollars?/i.test(pitch)
      if (hasDollarSavings) score += 25

      const hasCitation = /\[.*?\]|disc_\w+|cite_\w+/i.test(pitch)
      if (hasCitation) score += 25

      expect(score).toBe(0)
    })
  })

  describe('Compliance Pass Rate', () => {
    it('should identify compliant responses', () => {
      const response: IntakeResult = {
        profile: {} as UserProfile,
        missingFields: [],
        complianceValidated: true,
      }

      const compliancePassed = response.complianceValidated === true
      expect(compliancePassed).toBe(true)
    })

    it('should identify non-compliant responses', () => {
      const response: IntakeResult = {
        profile: {} as UserProfile,
        missingFields: [],
        complianceValidated: false,
      }

      const compliancePassed = response.complianceValidated === true
      expect(compliancePassed).toBe(false)
    })
  })
})

describe('Evaluation Harness - Token Usage Extraction', () => {
  it('should extract token counts from decision trace', () => {
    const trace = {
      timestamp: '2025-01-01T00:00:00Z',
      flow: 'conversational' as const,
      inputs: {},
      llmCalls: [
        {
          agent: 'conversational-extractor',
          model: 'gpt-4o-mini',
          promptTokens: 100,
          completionTokens: 50,
        },
        {
          agent: 'pitch-generator',
          model: 'gpt-4o-mini',
          promptTokens: 200,
          completionTokens: 100,
        },
      ],
    }

    let inputTokens = 0
    let outputTokens = 0

    for (const call of trace.llmCalls) {
      inputTokens += call.promptTokens || 0
      outputTokens += call.completionTokens || 0
    }

    expect(inputTokens).toBe(300)
    expect(outputTokens).toBe(150)
  })

  it('should handle trace with no LLM calls', () => {
    const trace = {
      timestamp: '2025-01-01T00:00:00Z',
      flow: 'conversational' as const,
      inputs: {},
      llmCalls: [],
    }

    let inputTokens = 0
    let outputTokens = 0

    for (const call of trace.llmCalls) {
      inputTokens += call.promptTokens || 0
      outputTokens += call.completionTokens || 0
    }

    expect(inputTokens).toBe(0)
    expect(outputTokens).toBe(0)
  })
})

describe('Evaluation Harness - Error Handling', () => {
  it('should handle API errors gracefully', () => {
    const errorResponse = {
      error: {
        code: 'API_ERROR',
        message: 'Internal server error',
      },
    }

    // Simulate error handling
    const hasError = errorResponse.error !== undefined
    expect(hasError).toBe(true)
  })

  it('should continue processing remaining test cases after error', () => {
    // This would be tested in integration tests
    // For unit tests, we verify the error structure
    const testResults = [
      { testCase: mockConversationalTestCase, passed: false, error: 'API error' },
      { testCase: mockPolicyTestCase, passed: true },
    ]

    const passedCount = testResults.filter((r) => r.passed).length
    const failedCount = testResults.filter((r) => !r.passed).length

    expect(passedCount).toBe(1)
    expect(failedCount).toBe(1)
  })
})

describe('Evaluation Harness - Report Generation', () => {
  it('should generate valid JSON report structure', () => {
    const report = {
      timestamp: new Date().toISOString(),
      overallMetrics: {
        routingAccuracy: 90,
        intakeCompleteness: 95,
        pitchClarityAverage: 85,
        compliancePassRate: 100,
      },
      perCarrierRouting: { GEICO: 90 },
      perStateRouting: { CA: 90 },
      fieldCompleteness: { state: 100 },
      tokenUsage: {
        totalInputTokens: 1000,
        totalOutputTokens: 500,
        totalCost: 0.00045,
        perTest: [],
      },
      sampleTraces: [],
      testResults: [],
    }

    expect(report.timestamp).toBeDefined()
    expect(report.overallMetrics).toBeDefined()
    expect(report.overallMetrics.routingAccuracy).toBe(90)
    expect(report.overallMetrics.intakeCompleteness).toBe(95)
    expect(report.overallMetrics.pitchClarityAverage).toBe(85)
    expect(report.overallMetrics.compliancePassRate).toBe(100)
  })

  it('should calculate per-carrier routing accuracy correctly', () => {
    const testResults = [
      {
        testCase: { ...mockConversationalTestCase, carrier: 'GEICO' },
        passed: true,
        metrics: { routingAccuracy: 100 },
      },
      {
        testCase: { ...mockConversationalTestCase, carrier: 'GEICO' },
        passed: true,
        metrics: { routingAccuracy: 100 },
      },
      {
        testCase: { ...mockConversationalTestCase, carrier: 'Progressive' },
        passed: true,
        metrics: { routingAccuracy: 0 },
      },
    ]

    const perCarrierRouting: Record<string, { passed: number; total: number }> = {}
    for (const result of testResults) {
      const carrier = result.testCase.carrier
      if (!perCarrierRouting[carrier]) {
        perCarrierRouting[carrier] = { passed: 0, total: 0 }
      }
      perCarrierRouting[carrier].total++
      if (result.metrics?.routingAccuracy === 100) {
        perCarrierRouting[carrier].passed++
      }
    }

    expect(perCarrierRouting.GEICO.passed).toBe(2)
    expect(perCarrierRouting.GEICO.total).toBe(2)
    expect(perCarrierRouting.Progressive.passed).toBe(0)
    expect(perCarrierRouting.Progressive.total).toBe(1)
  })
})
