/**
 * Prompt Loader
 *
 * Handles loading prompt templates from files.
 * Single Responsibility: File I/O for prompt templates
 */

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const PROMPTS_DIR = join(import.meta.dir, '../../prompts')
const SYSTEM_PROMPT_PATH = join(PROMPTS_DIR, 'conversational-extraction-system.txt')
const USER_PROMPT_PATH = join(PROMPTS_DIR, 'conversational-extraction-user.txt')

export class PromptLoader {
  /**
   * Load system prompt from file
   * @throws Error if prompt file cannot be loaded
   */
  async loadSystemPrompt(): Promise<string> {
    try {
      const content = await readFile(SYSTEM_PROMPT_PATH, 'utf-8')
      console.log(`✓ Loaded system prompt from ${SYSTEM_PROMPT_PATH} (${content.length} chars)`)
      return content
    } catch (error) {
      // Fail fast - do not use fallback prompts in production
      console.error(`✗ Failed to load system prompt from ${SYSTEM_PROMPT_PATH}`)
      console.error(`  Resolved prompts directory: ${PROMPTS_DIR}`)
      console.error(`  import.meta.dir: ${import.meta.dir}`)
      throw new Error(
        `Critical: Cannot load system prompt from ${SYSTEM_PROMPT_PATH}. Ensure prompt files exist at the correct location.`,
        { cause: error }
      )
    }
  }

  /**
   * Load user prompt template from file
   * @throws Error if prompt file cannot be loaded
   */
  async loadUserPromptTemplate(): Promise<string> {
    try {
      const content = await readFile(USER_PROMPT_PATH, 'utf-8')
      console.log(
        `✓ Loaded user prompt template from ${USER_PROMPT_PATH} (${content.length} chars)`
      )
      return content
    } catch (error) {
      // Fail fast - do not use fallback prompts in production
      console.error(`✗ Failed to load user prompt template from ${USER_PROMPT_PATH}`)
      console.error(`  Resolved prompts directory: ${PROMPTS_DIR}`)
      console.error(`  import.meta.dir: ${import.meta.dir}`)
      throw new Error(
        `Critical: Cannot load user prompt template from ${USER_PROMPT_PATH}. Ensure prompt files exist at the correct location.`,
        { cause: error }
      )
    }
  }
}
