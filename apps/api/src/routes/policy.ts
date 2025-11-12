/**
 * Policy Route
 *
 * POST /api/policy/upload endpoint for policy document upload and parsing.
 *
 * @see docs/stories/2.1.policy-upload-pdf-parsing.md#task-2
 */

import type { PolicyAnalysisResult, PolicySummary } from '@repo/shared'
import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_SIZE,
  isAcceptedFileType,
  isFileSizeValid,
  policySummarySchema,
} from '@repo/shared'
import { Hono } from 'hono'
import { z } from 'zod'
import { validateOutput } from '../services/compliance-filter'
import type { ConversationalExtractor } from '../services/conversational-extractor'
import { analyzeBundleOptions } from '../services/discount-engine'
import { DiscountRulesValidator } from '../services/discount-rules-validator'
import * as knowledgePackRAG from '../services/knowledge-pack-rag'
import type { LLMProvider } from '../services/llm-provider'
import { PitchGenerator } from '../services/pitch-generator'
import { PolicyAnalysisAgent } from '../services/policy-analysis-agent'
import { createDecisionTrace, logDecisionTrace } from '../utils/decision-trace'
import { logError, logInfo } from '../utils/logger'

// Note: Text extraction functions removed - files are now passed directly to Gemini File API
// Gemini handles PDF/DOCX/TXT parsing natively, no need for separate text extraction step

/**
 * Convert PolicySummary to key-value text format for display in editor
 * Example: "carrier:GEICO state:CA productType:auto premium:$1200/yr deductible:$500"
 */
function convertPolicySummaryToKeyValueText(policySummary: PolicySummary): string {
  const parts: string[] = []

  if (policySummary.carrier) {
    parts.push(`carrier:${policySummary.carrier}`)
  }
  if (policySummary.state) {
    parts.push(`state:${policySummary.state}`)
  }
  if (policySummary.productType) {
    parts.push(`productType:${policySummary.productType}`)
  }

  // Coverage limits
  if (policySummary.coverageLimits) {
    const limits = policySummary.coverageLimits
    if (limits.liability) parts.push(`coverageLimit:liability:${limits.liability}`)
    if (limits.propertyDamage) parts.push(`coverageLimit:propertyDamage:${limits.propertyDamage}`)
    if (limits.comprehensive) parts.push(`coverageLimit:comprehensive:${limits.comprehensive}`)
    if (limits.collision) parts.push(`coverageLimit:collision:${limits.collision}`)
    if (limits.uninsuredMotorist)
      parts.push(`coverageLimit:uninsuredMotorist:${limits.uninsuredMotorist}`)
    if (limits.personalInjuryProtection)
      parts.push(`coverageLimit:personalInjuryProtection:${limits.personalInjuryProtection}`)
    if (limits.dwelling) parts.push(`coverageLimit:dwelling:${limits.dwelling}`)
    if (limits.personalProperty)
      parts.push(`coverageLimit:personalProperty:${limits.personalProperty}`)
    if (limits.lossOfUse) parts.push(`coverageLimit:lossOfUse:${limits.lossOfUse}`)
    if (limits.medicalPayments)
      parts.push(`coverageLimit:medicalPayments:${limits.medicalPayments}`)
  }

  // Deductibles
  if (policySummary.deductibles) {
    const deductibles = policySummary.deductibles
    if (deductibles.auto !== undefined) parts.push(`deductible:auto:${deductibles.auto}`)
    if (deductibles.home !== undefined) parts.push(`deductible:home:${deductibles.home}`)
    if (deductibles.comprehensive !== undefined)
      parts.push(`deductible:comprehensive:${deductibles.comprehensive}`)
    if (deductibles.collision !== undefined)
      parts.push(`deductible:collision:${deductibles.collision}`)
  }

  // Premiums
  if (policySummary.premiums) {
    const premiums = policySummary.premiums
    if (premiums.annual) parts.push(`premium:annual:$${premiums.annual}/yr`)
    if (premiums.monthly) parts.push(`premium:monthly:$${premiums.monthly}/mo`)
    if (premiums.semiAnnual) parts.push(`premium:semiAnnual:$${premiums.semiAnnual}/6mo`)
  }

  // Effective dates
  if (policySummary.effectiveDates) {
    const dates = policySummary.effectiveDates
    if (dates.effectiveDate) parts.push(`effectiveDate:${dates.effectiveDate}`)
    if (dates.expirationDate) parts.push(`expirationDate:${dates.expirationDate}`)
  }

  // Join with spaces and add trailing space to trigger pill transformation
  return `${parts.join(' ')} `
}

/**
 * Validate uploaded file using shared constants (single source of truth)
 */
function validateFile(file: File): { valid: boolean; error?: string } {
  // Validate file size using shared constant
  if (!isFileSizeValid(file.size)) {
    return {
      valid: false,
      error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
    }
  }

  // Validate file type using shared constant
  if (!isAcceptedFileType(file.name, file.type)) {
    return {
      valid: false,
      error: `Invalid file type. Supported: PDF, DOCX, TXT. Got: ${file.type || file.name}`,
    }
  }

  return { valid: true }
}

/**
 * Request schema for policy analyze endpoint
 *
 * Note: policyText is optional and user-facing only (for validation/debugging).
 * PolicySummary is the source of truth for system processing.
 */
const policyAnalyzeRequestSchema = z.object({
  policySummary: policySummarySchema, // Required - system SoT
  policyText: z.string().optional(), // Optional - user-facing only, not used for processing
})

type PolicyAnalyzeRequest = z.infer<typeof policyAnalyzeRequestSchema>

/**
 * Create policy route handler
 *
 * @param extractor - ConversationalExtractor service instance
 * @param llmProvider - LLM provider for policy analysis
 * @returns Hono route handler
 */
export function createPolicyRoute(extractor: ConversationalExtractor, llmProvider: LLMProvider) {
  const app = new Hono()

  app.post('/api/policy/upload', async (c) => {
    try {
      // Parse multipart/form-data
      const formData = await c.req.parseBody()
      const file = formData.file as File | undefined

      // In Hono, parseBody() returns files as File objects, but we need to check more carefully
      // File might be a File object or a File-like object depending on the environment
      if (!file) {
        await logError('No file in request', new Error('File missing'), {
          type: 'file_upload_error',
          formDataKeys: Object.keys(formData),
        })
        return c.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              message: 'No file provided',
              details: 'Request must include a file in multipart/form-data',
            },
          },
          400
        )
      }

      // Check if it's a File object (works in Node.js/Bun environments)
      // In Hono, files from parseBody() should be File objects
      const isFile =
        file instanceof File ||
        (typeof file === 'object' &&
          file !== null &&
          'name' in file &&
          'size' in file &&
          'type' in file &&
          'arrayBuffer' in file)

      if (!isFile) {
        await logError('Invalid file type', new Error('File is not a File object'), {
          type: 'file_upload_error',
          fileType: typeof file,
          fileKeys: typeof file === 'object' && file !== null ? Object.keys(file) : [],
        })
        return c.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid file format',
              details: 'File must be a valid File object',
            },
          },
          400
        )
      }

      // Validate file
      const validation = validateFile(file)
      if (!validation.valid) {
        return c.json(
          {
            error: {
              code: 'INVALID_FILE',
              message: validation.error || 'File validation failed',
              details: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
              },
            },
          },
          400
        )
      }

      // Extract policy data directly from file using Gemini (no text extraction needed)
      let policySummary: PolicySummary
      let tokensUsed = 0
      let extractionTime = 0
      try {
        const extractionResult = await extractor.extractPolicyDataFromFile(file)
        // Extract metadata before removing it
        tokensUsed = extractionResult._metadata?.tokensUsed || 0
        extractionTime = extractionResult._metadata?.extractionTime || 0
        // Remove metadata before using as PolicySummary
        const { _metadata, ...summary } = extractionResult
        policySummary = summary

        // Check if extraction actually returned any data
        const extractedFields = Object.keys(policySummary).filter(
          (key) => key !== 'confidence' && policySummary[key as keyof PolicySummary] !== undefined
        )

        if (extractedFields.length === 0) {
          await logError(
            'Policy extraction returned no data',
            new Error('Empty extraction result'),
            {
              fileName: file.name,
              fileType: file.type,
              reasoning: extractionResult._metadata?.reasoning,
            }
          )
          return c.json(
            {
              error: {
                code: 'EXTRACTION_ERROR',
                message: 'Failed to extract policy data from file',
                details:
                  extractionResult._metadata?.reasoning ||
                  'No data could be extracted from the file',
              },
            },
            500
          )
        }

        await logInfo('Policy data extracted from file', {
          fileName: file.name,
          fileSize: file.size,
          extractedFields,
          tokensUsed,
          extractionTime,
        })
      } catch (error) {
        await logError('Policy extraction from file failed', error as Error, {
          fileName: file.name,
          fileType: file.type,
        })
        return c.json(
          {
            error: {
              code: 'EXTRACTION_ERROR',
              message: 'Failed to extract policy data from file',
              details: error instanceof Error ? error.message : 'Unknown error',
            },
          },
          500
        )
      }

      // Convert PolicySummary to key-value text format for display in editor
      const keyValueText = convertPolicySummaryToKeyValueText(policySummary)

      // Log decision trace with actual token usage and extraction time
      const decisionTrace = createDecisionTrace(
        'policy',
        {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          extractedTextLength: keyValueText.length,
          extractedTextPreview: keyValueText.substring(0, 500),
        },
        {
          method: 'llm', // LLM extraction from file
          fields: policySummary,
          confidence: policySummary.confidence,
        },
        [
          {
            agent: 'conversational-extractor',
            model: 'gemini-2.5-flash-lite', // Using GeminiProvider per implementation notes
            totalTokens: tokensUsed, // Actual tokens used from LLM response
          },
        ]
      )

      await logDecisionTrace(decisionTrace)

      // Return key-value text format for display in editor
      // Broker can review and edit before sending for competitive shopping
      return c.json(
        {
          extractedText: keyValueText,
          fileName: file.name,
          policySummary, // Also include structured data for potential future use
        },
        200
      )
    } catch (error) {
      await logError('Policy upload endpoint error', error as Error, {
        type: 'policy_upload_error',
      })
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        500
      )
    }
  })

  // POST /api/policy/analyze endpoint
  app.post('/api/policy/analyze', async (c) => {
    try {
      // Parse and validate request body
      const body = await c.req.json()
      const validationResult = policyAnalyzeRequestSchema.safeParse(body)

      if (!validationResult.success) {
        return c.json(
          {
            error: {
              code: 'INVALID_REQUEST',
              message: 'Invalid request body',
              details: validationResult.error.errors,
            },
          },
          400
        )
      }

      const { policySummary, policyText } = validationResult.data

      // PolicySummary is the source of truth - use it directly
      // Optional: If policyText provided, validate it matches PolicySummary (for debugging)
      if (policyText) {
        const { parsePolicySummaryFromKeyValueText, policiesMatch } = await import(
          '../utils/policy-key-value-parser'
        )
        const parsedFromText = parsePolicySummaryFromKeyValueText(policyText)
        if (!policiesMatch(parsedFromText, policySummary)) {
          // Log warning but don't fail - PolicySummary is SoT
          await logError(
            'PolicySummary and policyText mismatch in analyze endpoint',
            new Error('Sync issue detected'),
            {
              type: 'policy_sync_warning',
              policyTextPreview: policyText.substring(0, 500),
            }
          )
        }
      }

      // Validate policy summary has minimum required fields
      if (!policySummary.carrier || !policySummary.state || !policySummary.productType) {
        return c.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Policy summary missing required fields',
              details: 'PolicySummary must include carrier, state, and productType',
              missingFields: {
                carrier: !policySummary.carrier,
                state: !policySummary.state,
                productType: !policySummary.productType,
              },
            },
          },
          400
        )
      }

      // Step 2: Get carrier from knowledge pack for validator
      const carrier = knowledgePackRAG.getCarrierByName(policySummary.carrier)
      if (!carrier) {
        return c.json(
          {
            error: {
              code: 'KNOWLEDGE_PACK_ERROR',
              message: 'Carrier not found in knowledge pack',
              details: `Carrier "${policySummary.carrier}" not found`,
            },
          },
          404
        )
      }

      // Step 3: Call Policy Analysis Agent
      const analysisAgent = new PolicyAnalysisAgent(llmProvider)
      let rawAnalysisResult: Awaited<ReturnType<PolicyAnalysisAgent['analyzePolicy']>>
      let analysisTokens = 0
      let analysisTime = 0

      try {
        // Pass policyText if provided (for context), but PolicySummary is the source of truth
        const result = await analysisAgent.analyzePolicy(policySummary, policyText)
        rawAnalysisResult = result
        analysisTokens = result._metadata?.tokensUsed || 0
        analysisTime = result._metadata?.analysisTime || 0
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        await logError('Policy analysis failed', error as Error, {
          type: 'policy_analysis_error',
          carrier: policySummary.carrier,
          state: policySummary.state,
          errorMessage,
        })

        // Handle specific error types
        if (errorMessage.includes('KNOWLEDGE_PACK_ERROR')) {
          return c.json(
            {
              error: {
                code: 'KNOWLEDGE_PACK_ERROR',
                message: 'Carrier not found in knowledge pack',
                details: errorMessage.replace('KNOWLEDGE_PACK_ERROR: ', ''),
              },
            },
            404
          )
        }

        if (errorMessage.includes('ANALYSIS_ERROR')) {
          return c.json(
            {
              error: {
                code: 'ANALYSIS_ERROR',
                message: 'LLM analysis failed',
                details: errorMessage.replace('ANALYSIS_ERROR: ', ''),
              },
            },
            500
          )
        }

        // Generic analysis error
        return c.json(
          {
            error: {
              code: 'ANALYSIS_ERROR',
              message: 'Failed to analyze policy',
              details: errorMessage,
            },
          },
          500
        )
      }

      // Step 3.5: Call Bundle Analyzer to detect bundle opportunities
      let bundleOptionsFromAnalyzer: import('@repo/shared').BundleOption[] = []
      try {
        bundleOptionsFromAnalyzer = analyzeBundleOptions(carrier, policySummary, undefined)
        await logInfo('Bundle analysis completed', {
          type: 'bundle_analysis_success',
          carrier: policySummary.carrier,
          state: policySummary.state,
          bundleOptionsCount: bundleOptionsFromAnalyzer.length,
        })
      } catch (error) {
        await logError('Bundle analysis failed', error as Error, {
          type: 'bundle_analysis_error',
          carrier: policySummary.carrier,
          state: policySummary.state,
        })
        // Continue with other opportunities if bundle analysis fails (don't block entire analysis)
        bundleOptionsFromAnalyzer = []
      }

      // Merge bundle options from analyzer with LLM-generated ones
      // Deduplicate by product to avoid showing the same opportunity twice
      const allBundleOptions = [...rawAnalysisResult.bundleOptions, ...bundleOptionsFromAnalyzer]
      const uniqueBundleOptions = allBundleOptions.reduce(
        (acc: import('@repo/shared').BundleOption[], option) => {
          // Check if we already have a bundle option for this product
          const existing = acc.find((opt) => opt.product === option.product)
          if (!existing) {
            acc.push(option)
          } else {
            // Keep the one with higher estimated savings
            if (option.estimatedSavings > existing.estimatedSavings) {
              const index = acc.indexOf(existing)
              acc[index] = option
            }
          }
          return acc
        },
        []
      )

      // Step 4: Validate opportunities using Discount Rules Validator
      const discountValidator = new DiscountRulesValidator(knowledgePackRAG)
      // Initialize with raw opportunities as fallback (will be replaced if validation succeeds)
      // Convert raw opportunities to ValidatedOpportunity format with minimal validation
      let validatedOpportunities: import('@repo/shared').ValidatedOpportunity[] =
        rawAnalysisResult.opportunities.map((opp) => ({
          ...opp,
          confidenceScore: 0,
          validationDetails: {
            rulesEvaluated: [],
            missingData: [],
            eligibilityChecks: {
              discountFound: false,
              eligibilityValidated: false,
              savingsCalculated: false,
              stackingValidated: false,
            },
          },
          requiresDocumentation: false,
          validatedAt: new Date().toISOString(),
        }))
      let validationResults: {
        rulesEvaluated: Array<{
          rule: string
          citation: { id: string; type: string; carrier: string; file: string }
          result: 'pass' | 'fail' | 'partial'
        }>
        confidenceScores: Record<string, number>
        stackingResults?: {
          validCombinations: string[][]
          conflicts: Array<{ opportunity1: string; opportunity2: string; reason: string }>
          maxStackable?: number
        }
      } | null = null
      try {
        // Note: customerData is not available in policy flow, pass undefined
        validatedOpportunities = await discountValidator.validateOpportunities(
          rawAnalysisResult.opportunities,
          policySummary,
          carrier,
          undefined // customerData not available in policy analysis flow
        )

        // Extract validation results for decision trace
        const allRulesEvaluated = validatedOpportunities.flatMap(
          (opp) => opp.validationDetails.rulesEvaluated
        )
        const confidenceScores: Record<string, number> = {}
        for (const opp of validatedOpportunities) {
          confidenceScores[opp.citation.id] = opp.confidenceScore
        }

        // Get stacking results (we need to call validateStacking again to get results)
        const { validateStacking } = await import(
          '../services/discount-rules-validator/stacking-validator'
        )
        const stackingResults = validateStacking(validatedOpportunities, carrier)

        validationResults = {
          rulesEvaluated: allRulesEvaluated,
          confidenceScores,
          stackingResults: {
            validCombinations: stackingResults.validCombinations,
            conflicts: stackingResults.conflicts,
            maxStackable: stackingResults.maxStackable,
          },
        }
      } catch (error) {
        await logError('Discount validation failed', error as Error, {
          type: 'discount_validation_error',
          carrier: policySummary.carrier,
        })
        // Continue with unvalidated opportunities if validation fails
      }

      // Step 5: Generate pitch using Pitch Generator Agent
      const pitchGenerator = new PitchGenerator(llmProvider)
      let pitch = ''
      let pitchTokens = 0

      try {
        const pitchResult = await pitchGenerator.generatePitch(
          validatedOpportunities,
          uniqueBundleOptions,
          rawAnalysisResult.deductibleOptimizations,
          policySummary
        )
        pitch = pitchResult as string
        pitchTokens =
          (pitchResult as { _metadata?: { tokensUsed?: number } })._metadata?.tokensUsed || 0
      } catch (error) {
        await logError('Pitch generation failed in policy analyze', error as Error, {
          type: 'pitch_generation_error',
          carrier: policySummary.carrier,
        })
        // Use fallback pitch (PitchGenerator handles this internally, but we'll set a default here too)
        pitch =
          "Based on our analysis, we've identified several savings opportunities. Please review the detailed recommendations below."
      }

      // Step 6: Run compliance filter on pitch
      let complianceResult: ReturnType<typeof validateOutput>
      try {
        complianceResult = validateOutput(pitch, policySummary.state, policySummary.productType)
      } catch (error) {
        await logError('Compliance filter error in policy analyze', error as Error, {
          type: 'compliance_error',
        })
        complianceResult = {
          passed: false,
          disclaimers: [],
        }
      }

      // If compliance check failed, replace pitch with replacement message
      if (!complianceResult.passed && complianceResult.replacementMessage) {
        pitch = complianceResult.replacementMessage
      }

      // Add disclaimers to pitch if available
      if (complianceResult.disclaimers && complianceResult.disclaimers.length > 0) {
        pitch += `\n\n${complianceResult.disclaimers.join('\n')}`
      }

      // Step 7: Create decision trace
      const decisionTrace = createDecisionTrace(
        'policy',
        {
          policyText: policyText?.substring(0, 1000) || '', // Limit text length (optional)
          policySummaryProvided: true, // Always provided now
        },
        {
          method: 'key-value', // PolicySummary always provided as structured data
          fields: policySummary,
          confidence: policySummary.confidence,
        },
        [
          // No extraction step - PolicySummary always provided
          {
            agent: 'policy-analysis-agent',
            model: 'gemini-2.5-flash-lite',
            totalTokens: analysisTokens,
          },
          {
            agent: 'pitch-generator',
            model: 'gemini-2.5-flash-lite',
            totalTokens: pitchTokens,
          },
        ],
        undefined, // routingDecision
        {
          passed: complianceResult.passed,
          violations: complianceResult.violations,
          disclaimersAdded: complianceResult.disclaimers?.length || 0,
          state: policySummary.state,
          productType: policySummary.productType,
        }
      )

      // Add discount validation results to trace
      if (validationResults) {
        decisionTrace.discountValidation = {
          rulesEvaluated: validationResults.rulesEvaluated,
          opportunitiesValidated: validatedOpportunities.length,
          confidenceScores: validationResults.confidenceScores,
          stackingResults: validationResults.stackingResults,
        }
      }

      // Add analysis results to trace
      decisionTrace.outputs = {
        opportunities: validatedOpportunities,
        bundleOptions: uniqueBundleOptions,
        deductibleOptimizations: rawAnalysisResult.deductibleOptimizations,
        pitch,
        complianceValidated: complianceResult.passed,
      }

      // Add bundle analysis results to decision trace
      if (bundleOptionsFromAnalyzer.length > 0) {
        decisionTrace.bundleAnalysis = {
          currentProduct: policySummary.productType || '',
          bundleOpportunities: bundleOptionsFromAnalyzer.map((opt) => ({
            product: opt.product,
            estimatedSavings: opt.estimatedSavings,
            requiredActions: opt.requiredActions,
          })),
          carrierAvailabilityChecks: [
            {
              carrier: carrier.name,
              state: policySummary.state || '',
              operatesInState: knowledgePackRAG.getCarrierStateAvailability(
                carrier.name,
                policySummary.state || ''
              ),
              availableProducts: knowledgePackRAG.getCarrierProductsForState(
                carrier.name,
                policySummary.state || ''
              ),
            },
          ],
          citations: bundleOptionsFromAnalyzer.map((opt) => opt.citation),
        }
      }

      await logDecisionTrace(decisionTrace)

      // Step 8: Return PolicyAnalysisResult
      const finalResult: PolicyAnalysisResult = {
        currentPolicy: policySummary,
        opportunities: validatedOpportunities,
        bundleOptions: uniqueBundleOptions,
        deductibleOptimizations: rawAnalysisResult.deductibleOptimizations,
        pitch,
        complianceValidated: complianceResult.passed,
        trace: decisionTrace,
      }

      return c.json(finalResult, 200)
    } catch (error) {
      await logError('Policy analyze endpoint error', error as Error, {
        type: 'policy_analyze_error',
      })
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        },
        500
      )
    }
  })

  return app
}
