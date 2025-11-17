/**
 * Policy Route
 *
 * POST /api/policy/upload endpoint for policy document upload and parsing.
 *
 * @see docs/stories/2.1.policy-upload-pdf-parsing.md#task-2
 */

import { Hono } from 'hono'
import type { ConversationalExtractor } from '../services/conversational-extractor'
import type { LLMProvider } from '../services/llm-provider'
import { handlePolicyAnalyze } from './policy/handlers/analyze-handler'
import { handlePolicyUpload } from './policy/handlers/upload-handler'

/**
 * Create policy route handler
 *
 * @param extractor - ConversationalExtractor service instance
 * @param llmProvider - LLM provider for policy analysis
 * @returns Hono route handler
 */
export function createPolicyRoute(extractor: ConversationalExtractor, llmProvider: LLMProvider) {
  const app = new Hono()

  app.post('/api/policy/upload', (c) => handlePolicyUpload(c, extractor))
  app.post('/api/policy/analyze', (c) => handlePolicyAnalyze(c, llmProvider))

  return app
}
