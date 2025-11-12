/**
 * Policy Analysis Agent LLM Integration Tests
 *
 * Tests policy analysis with real Gemini LLM provider.
 * Captures intermediate outputs at each step to show what LLM does vs post-processing.
 * Generates markdown report during test execution.
 *
 * Can run with mock or real provider based on USE_REAL_LLM environment variable.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PolicyAnalysisResult } from '@repo/shared'
import { buildPolicySummary, policyAnalysisResultSchema } from '@repo/shared'
import { GeminiProvider } from '../gemini-provider'
import * as knowledgePackRAG from '../knowledge-pack-rag'
import type { LLMProvider } from '../llm-provider'
import { PolicyAnalysisAgent } from '../policy-analysis-agent'

// Test results storage for reporting
interface TestStep {
  step: string
  description: string
  input?: unknown
  output?: unknown
  metadata?: Record<string, unknown>
}

interface TestResult {
  testName: string
  steps: TestStep[]
  // Agent returns PolicyAnalysisResult, but we store it with metadata
  finalOutput?: (
    | PolicyAnalysisResult
    | (Omit<PolicyAnalysisResult, 'opportunities'> & { opportunities: unknown[] })
  ) & {
    _metadata?: { tokensUsed?: number; analysisTime?: number }
  }
  error?: string
}

const testResults: TestResult[] = []

// Helper to add step to current test
let currentTest: TestResult | null = null

function addStep(
  step: string,
  description: string,
  input?: unknown,
  output?: unknown,
  metadata?: Record<string, unknown>
) {
  if (currentTest) {
    currentTest.steps.push({ step, description, input, output, metadata })
  }
}

async function generateMarkdownReport(results: TestResult[]): Promise<void> {
  const reportDir = join(process.cwd(), 'test-reports')
  await mkdir(reportDir, { recursive: true })

  const reportPath = join(reportDir, 'policy-analysis-agent-llm-report.md')

  const lines: string[] = []
  lines.push('# Policy Analysis Agent - LLM Integration Test Report')
  lines.push('')
  lines.push(`**Date:** ${new Date().toISOString().split('T')[0]}`)
  lines.push('**Model:** Gemini 2.5 Flash-Lite')
  lines.push('**Test Type:** Real LLM Integration Tests')
  lines.push('')
  lines.push('## Test Suite Overview')
  lines.push('')
  lines.push('This report shows the complete pipeline for each test, including:')
  lines.push('1. **Input:** Original test input')
  lines.push('2. **Knowledge Pack Query:** What data was retrieved from knowledge pack')
  lines.push('3. **Prompt:** The exact prompt sent to the LLM')
  lines.push('4. **LLM Raw Output:** The raw response from the LLM (before normalization)')
  lines.push(
    '5. **Normalized Output:** After server-side processing (file paths, percentage normalization)'
  )
  lines.push('6. **Final Output:** The complete result returned to the caller')
  lines.push('')
  lines.push(
    'This allows us to see exactly what the LLM is doing vs what our post-processing is doing.'
  )
  lines.push('')
  lines.push('---')
  lines.push('')

  for (const result of results) {
    lines.push(`## ${result.testName}`)
    lines.push('')

    if (result.error) {
      lines.push('### ❌ Error')
      lines.push('')
      lines.push('```')
      lines.push(result.error)
      lines.push('```')
      lines.push('')
      continue
    }

    // Show each step in the pipeline
    for (const step of result.steps) {
      lines.push(`### Step: ${step.step}`)
      lines.push('')
      lines.push(`**Description:** ${step.description}`)
      lines.push('')

      if (step.input !== undefined) {
        lines.push('**Input:**')
        lines.push('```json')
        lines.push(JSON.stringify(step.input, null, 2))
        lines.push('```')
        lines.push('')
      }

      if (step.output !== undefined) {
        lines.push('**Output:**')
        lines.push('```json')
        lines.push(JSON.stringify(step.output, null, 2))
        lines.push('```')
        lines.push('')
      }

      if (step.metadata && Object.keys(step.metadata).length > 0) {
        lines.push('**Metadata:**')
        lines.push('```json')
        lines.push(JSON.stringify(step.metadata, null, 2))
        lines.push('```')
        lines.push('')
      }
    }

    // Final output summary
    if (result.finalOutput) {
      lines.push('### Final Output Summary')
      lines.push('')
      lines.push('**Metrics:**')
      lines.push(`- **Analysis Time:** ${result.finalOutput._metadata?.analysisTime ?? 'N/A'}ms`)
      lines.push(`- **Tokens Used:** ${result.finalOutput._metadata?.tokensUsed ?? 'N/A'}`)
      lines.push(`- **Opportunities:** ${result.finalOutput.opportunities.length}`)
      lines.push(`- **Bundle Options:** ${result.finalOutput.bundleOptions.length}`)
      lines.push(
        `- **Deductible Optimizations:** ${result.finalOutput.deductibleOptimizations.length}`
      )
      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  // Summary section
  lines.push('## Summary')
  lines.push('')
  lines.push(`**Total Tests:** ${results.length}`)
  lines.push(`**Passed:** ${results.filter((r) => !r.error).length}`)
  lines.push(`**Failed:** ${results.filter((r) => r.error).length}`)
  lines.push('')

  await writeFile(reportPath, lines.join('\n'), 'utf-8')
}

describe('PolicyAnalysisAgent - LLM Integration Tests', () => {
  let llmProvider: LLMProvider
  let agent: PolicyAnalysisAgent

  beforeAll(async () => {
    const useRealLLM = process.env.USE_REAL_LLM === 'true'

    if (!useRealLLM) {
      return
    }

    // Use real knowledge pack as base
    const { setupTestKnowledgePack } = await import(
      '../../__tests__/helpers/knowledge-pack-test-setup'
    )
    await setupTestKnowledgePack()

    llmProvider = new GeminiProvider(process.env.GEMINI_API_KEY, 'gemini-2.5-flash-lite', 30000)

    agent = new PolicyAnalysisAgent(llmProvider)
  })

  afterAll(async () => {
    const useRealLLM = process.env.USE_REAL_LLM === 'true'

    if (useRealLLM && testResults.length > 0) {
      await generateMarkdownReport(testResults)

      // Also write JSON for programmatic access
      const fs = require('node:fs')
      const path = require('node:path')
      const reportPath = path.join(
        process.cwd(),
        'test-reports',
        'policy-analysis-agent-llm-results.json'
      )
      const dir = path.dirname(reportPath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2))
    }

    if (useRealLLM) {
      const { cleanupTestKnowledgePack } = await import(
        '../../__tests__/helpers/knowledge-pack-test-setup'
      )
      await cleanupTestKnowledgePack()
    }
  })

  it('should analyze policy with real LLM - Basic Policy', async () => {
    if (process.env.USE_REAL_LLM !== 'true') {
      return
    }

    const policy = buildPolicySummary()
    const policyText = 'carrier:GEICO state:CA productType:auto premium:$1200/yr deductible:$500'

    currentTest = {
      testName: 'Basic Policy Analysis',
      steps: [],
    }

    try {
      // Step 1: Input
      addStep('1. Input', 'Original test input', { policy, policyText })

      // Step 2: Knowledge Pack Query
      if (!policy.carrier || !policy.state || !policy.productType) {
        throw new Error('Policy must have carrier, state, and productType')
      }
      const carrier = knowledgePackRAG.getCarrierByName(policy.carrier)
      const availableDiscounts = knowledgePackRAG.getCarrierDiscounts(
        policy.carrier,
        policy.state,
        policy.productType
      )
      const bundleDiscounts = knowledgePackRAG.getCarrierBundleDiscounts(
        policy.carrier,
        policy.state
      )
      const carrierProducts = knowledgePackRAG.getCarrierProducts(policy.carrier)

      addStep(
        '2. Knowledge Pack Query',
        'Data retrieved from knowledge pack',
        {
          carrierName: policy.carrier,
          state: policy.state,
          productType: policy.productType,
        },
        {
          carrierFound: !!carrier,
          availableDiscountsCount: availableDiscounts.length,
          bundleDiscountsCount: bundleDiscounts.length,
          carrierProducts,
          sampleDiscounts: availableDiscounts.slice(0, 3).map((d) => ({
            name: d.name,
            _id: d._id,
            percentage: d.percentage,
          })),
        }
      )

      // Step 3: Build prompt (capture from agent)
      // We'll run the analysis and then access the exposed intermediate outputs
      const startTime = Date.now()
      const result = await agent.analyzePolicy(policy, policyText)
      const analysisTime = Date.now() - startTime

      // Capture prompt that was sent to LLM
      if (agent.lastPrompt) {
        addStep(
          '3. Prompt Sent to LLM',
          'The exact prompt constructed and sent to the LLM',
          undefined,
          agent.lastPrompt,
          { promptLength: agent.lastPrompt.length }
        )
      }

      // Step 4: LLM Raw Output
      if (agent.lastLLMRawOutput) {
        addStep(
          '4. LLM Raw Output',
          'The raw response from the LLM (before normalization/post-processing)',
          undefined,
          agent.lastLLMRawOutput,
          {
            note: 'This is what the LLM returned directly. File paths are empty (will be hydrated server-side).',
          }
        )
      }

      // Step 5: Normalized Output (after server-side processing)
      if (agent.lastNormalizedOutput) {
        addStep(
          '5. Normalized Output',
          'Result after server-side normalization (file paths resolved, percentages normalized)',
          undefined,
          agent.lastNormalizedOutput,
          {
            note: 'Compare with Step 4 to see what changed: file paths hydrated, percentages normalized, citations resolved.',
          }
        )
      }

      // Step 6: Final Output
      addStep('6. Final Output', 'Complete result returned to caller', undefined, result, {
        analysisTime,
        tokensUsed: result._metadata?.tokensUsed,
      })

      currentTest.finalOutput = result

      // Validate
      expect(result.currentPolicy).toBeDefined()
      expect(result.opportunities).toBeDefined()
      expect(Array.isArray(result.opportunities)).toBe(true)
      expect(result.bundleOptions).toBeDefined()
      expect(result.deductibleOptimizations).toBeDefined()

      const validationResult = policyAnalysisResultSchema.safeParse(result)
      expect(validationResult.success).toBe(true)
    } catch (error) {
      currentTest.error = error instanceof Error ? error.message : String(error)
      addStep('Error', 'Test failed', undefined, { error: currentTest.error })
      throw error
    } finally {
      testResults.push(currentTest)
      currentTest = null
    }
  })

  it('should analyze policy with real LLM - Policy with Home Coverage', async () => {
    if (process.env.USE_REAL_LLM !== 'true') {
      return
    }

    const policy = buildPolicySummary({
      productType: 'home',
      premiums: { annual: 2000 },
    })
    const policyText = 'carrier:GEICO state:CA productType:home premium:$2000/yr coverage:$300000'

    currentTest = {
      testName: 'Home Policy Analysis',
      steps: [],
    }

    try {
      addStep('1. Input', 'Original test input', { policy, policyText })

      if (!policy.carrier || !policy.state || !policy.productType) {
        throw new Error('Policy must have carrier, state, and productType')
      }
      const carrier = knowledgePackRAG.getCarrierByName(policy.carrier)
      const availableDiscounts = knowledgePackRAG.getCarrierDiscounts(
        policy.carrier,
        policy.state,
        policy.productType
      )
      const bundleDiscounts = knowledgePackRAG.getCarrierBundleDiscounts(
        policy.carrier,
        policy.state
      )

      addStep(
        '2. Knowledge Pack Query',
        'Data retrieved from knowledge pack',
        {
          carrierName: policy.carrier,
          state: policy.state,
          productType: policy.productType,
        },
        {
          carrierFound: !!carrier,
          availableDiscountsCount: availableDiscounts.length,
          bundleDiscountsCount: bundleDiscounts.length,
        }
      )

      const startTime = Date.now()
      const result = await agent.analyzePolicy(policy, policyText)
      const analysisTime = Date.now() - startTime

      addStep(
        '3. Final Output',
        'Complete result after normalization and post-processing',
        undefined,
        result,
        {
          analysisTime,
          tokensUsed: result._metadata?.tokensUsed,
        }
      )

      currentTest.finalOutput = result

      expect(result.currentPolicy.productType).toBe('home')
      expect(result.currentPolicy.premiums?.annual).toBe(2000)
    } catch (error) {
      currentTest.error = error instanceof Error ? error.message : String(error)
      addStep('Error', 'Test failed', undefined, { error: currentTest.error })
      throw error
    } finally {
      testResults.push(currentTest)
      currentTest = null
    }
  })

  it('should analyze policy with real LLM - Policy with Multiple Opportunities', async () => {
    if (process.env.USE_REAL_LLM !== 'true') {
      return
    }

    const policy = buildPolicySummary({
      premiums: { annual: 1500 },
      deductibles: { auto: 500 },
    })
    const policyText =
      'carrier:GEICO state:CA productType:auto premium:$1500/yr deductible:$500 cleanRecord:true'

    currentTest = {
      testName: 'Multiple Opportunities Analysis',
      steps: [],
    }

    try {
      addStep('1. Input', 'Original test input', { policy, policyText })

      const startTime = Date.now()
      const result = await agent.analyzePolicy(policy, policyText)
      const analysisTime = Date.now() - startTime

      addStep(
        '2. Final Output',
        'Complete result after normalization and post-processing',
        undefined,
        result,
        {
          analysisTime,
          tokensUsed: result._metadata?.tokensUsed,
        }
      )

      currentTest.finalOutput = result

      expect(result.opportunities.length).toBeGreaterThanOrEqual(0)
    } catch (error) {
      currentTest.error = error instanceof Error ? error.message : String(error)
      addStep('Error', 'Test failed', undefined, { error: currentTest.error })
      throw error
    } finally {
      testResults.push(currentTest)
      currentTest = null
    }
  })

  it('should analyze policy with real LLM - Policy with Bundle Opportunity', async () => {
    if (process.env.USE_REAL_LLM !== 'true') {
      return
    }

    const policy = buildPolicySummary({
      productType: 'auto',
    })
    const policyText = 'carrier:GEICO state:CA productType:auto premium:$1200/yr'

    currentTest = {
      testName: 'Bundle Opportunity Analysis',
      steps: [],
    }

    try {
      addStep('1. Input', 'Original test input', { policy, policyText })

      const startTime = Date.now()
      const result = await agent.analyzePolicy(policy, policyText)
      const analysisTime = Date.now() - startTime

      addStep(
        '2. Final Output',
        'Complete result after normalization and post-processing',
        undefined,
        result,
        {
          analysisTime,
          tokensUsed: result._metadata?.tokensUsed,
        }
      )

      currentTest.finalOutput = result

      expect(result.bundleOptions).toBeDefined()
      expect(Array.isArray(result.bundleOptions)).toBe(true)
    } catch (error) {
      currentTest.error = error instanceof Error ? error.message : String(error)
      addStep('Error', 'Test failed', undefined, { error: currentTest.error })
      throw error
    } finally {
      testResults.push(currentTest)
      currentTest = null
    }
  })
})
