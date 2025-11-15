/**
 * Route Registration
 *
 * Centralizes all route registrations for the API.
 * Single Responsibility: Route registration only
 */

import type { Hono } from 'hono'
import type { ConversationalExtractor } from '../services/conversational-extractor'
import type { LLMProvider } from '../services/llm-provider'
import { createDisclaimersRoute } from './disclaimers'
import { createIntakeRoute } from './intake'
import { createKnowledgePackRoute } from './knowledge-pack'
import { createLogRoute } from './log'
import { createPolicyRoute } from './policy'
import { createPrefillRoute } from './prefill'

/**
 * Register all routes on the Hono app
 *
 * @param app - Hono app instance
 * @param conversationalExtractor - Conversational extractor service
 * @param llmProvider - LLM provider service
 */
export function registerRoutes(
  app: Hono,
  conversationalExtractor: ConversationalExtractor,
  llmProvider: LLMProvider
): void {
  // Intake endpoint - conversational field extraction
  const intakeRoute = createIntakeRoute(conversationalExtractor)
  app.route('/', intakeRoute)

  // Policy upload endpoint - policy document parsing
  const policyRoute = createPolicyRoute(conversationalExtractor, llmProvider)
  app.route('/', policyRoute)

  // Log endpoint - receive logs from frontend
  const logRoute = createLogRoute()
  app.route('/', logRoute)

  // Disclaimers endpoint - get disclaimers from knowledge pack
  const disclaimersRoute = createDisclaimersRoute()
  app.route('/', disclaimersRoute)

  // Prefill generation endpoint
  const prefillRoute = createPrefillRoute()
  app.route('/', prefillRoute)

  // Knowledge pack query endpoints
  const knowledgePackRoute = createKnowledgePackRoute()
  app.route('/', knowledgePackRoute)
}
