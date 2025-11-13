/**
 * Report Generator Constants
 *
 * Central location for all constants used in report generation.
 * Follows STAR principle (Single Truth, Authoritative Record).
 */

import { join } from 'node:path'

/**
 * Metric target thresholds
 */
export const METRIC_THRESHOLDS = {
  ROUTING_ACCURACY: 90,
  INTAKE_COMPLETENESS: 95,
  DISCOUNT_ACCURACY: 90,
  PITCH_CLARITY: 85,
  COMPLIANCE_PASS_RATE: 100,
} as const

/**
 * Status indicators
 */
export const STATUS = {
  PASS: '✅',
  FAIL: '❌',
  WARNING: '⚠️',
} as const

/**
 * Time windows for log matching
 */
export const TIME_WINDOWS = {
  PROMPT_MATCH_MS: 5000,
} as const

/**
 * Prompt markers and patterns
 */
export const PROMPT_MARKERS = {
  USER_PROMPT_START: 'Extract insurance shopper information',
  SYSTEM_PROMPT_INDICATORS: [
    'You are a data extraction specialist',
    'EXTRACTION RULE',
    'CRITICAL:',
  ],
  MIN_SYSTEM_PROMPT_LENGTH: 50,
  MIN_SYSTEM_PROMPT_SPLIT_INDEX: 100,
  ALTERNATIVE_USER_PATTERNS: [
    'Extract insurance shopper information',
    'Current notes:',
    'Already extracted fields',
  ],
} as const

/**
 * File paths
 */
export const FILE_PATHS = {
  COMPLIANCE_LOG: join(import.meta.dir, '../../logs/compliance.log'),
  PROGRAM_LOG: join(import.meta.dir, '../../logs/program.log'),
  REPORT_TEMPLATE: join(import.meta.dir, '../result/report-template.md'),
} as const

/**
 * Log entry types
 */
export const LOG_ENTRY_TYPES = {
  LLM_PROMPT: 'llm_prompt',
  LLM_PROMPT_DEBUG: 'llm_prompt_debug',
  LLM_RESPONSE: 'llm_response',
} as const

/**
 * Trace field categories
 */
export const TRACE_FIELDS = {
  KNOWN: [
    'timestamp',
    'flow',
    'inputs',
    'extraction',
    'routingDecision',
    'complianceCheck',
    'llmCalls',
    'rulesConsulted',
  ],
} as const

/**
 * Sample trace limits
 */
export const SAMPLE_LIMITS = {
  MAX_TRACES: 5,
} as const
