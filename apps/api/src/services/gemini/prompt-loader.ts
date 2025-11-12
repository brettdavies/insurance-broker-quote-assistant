/**
 * Prompt Loader
 *
 * Handles loading prompt templates from files.
 * Single Responsibility: File I/O for prompt templates
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PROMPTS_DIR = join(import.meta.dir, '../prompts')
const SYSTEM_PROMPT_PATH = join(PROMPTS_DIR, 'conversational-extraction-system.txt')
const USER_PROMPT_PATH = join(PROMPTS_DIR, 'conversational-extraction-user.txt')

export class PromptLoader {
  /**
   * Load system prompt from file
   */
  async loadSystemPrompt(): Promise<string> {
    try {
      return await readFile(SYSTEM_PROMPT_PATH, 'utf-8')
    } catch (error) {
      // Fallback to default if file doesn't exist
      console.warn(`Failed to load system prompt from ${SYSTEM_PROMPT_PATH}, using default`)
      return 'You are an expert insurance data extraction assistant. Extract ONLY fields that are explicitly stated. Do NOT infer or assume values.'
    }
  }

  /**
   * Load user prompt template from file
   */
  async loadUserPromptTemplate(): Promise<string> {
    try {
      return await readFile(USER_PROMPT_PATH, 'utf-8')
    } catch (error) {
      // Fallback to default if file doesn't exist
      console.warn(`Failed to load user prompt template from ${USER_PROMPT_PATH}, using default`)
      return 'Extract insurance shopper information from broker notes: {{MESSAGE}}'
    }
  }
}
