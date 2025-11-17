/**
 * Prompt Builder
 *
 * Handles building prompts from templates and context.
 * Single Responsibility: Prompt construction and template variable substitution
 */

import type { UserProfile } from '@repo/shared'

export interface PromptContext {
  message: string
  partialFields?: Partial<UserProfile>
}

export interface BuiltPrompts {
  systemPrompt: string
  userPrompt: string
  fullPrompt: string
}

export class PromptBuilder {
  constructor(
    private systemPrompt: string,
    private userPromptTemplate: string
  ) {}

  /**
   * Build prompts from message and partial fields
   */
  build(context: PromptContext): BuiltPrompts {
    const systemPrompt = this.systemPrompt || ''
    let userPrompt = this.userPromptTemplate || ''

    // Replace template variables
    const alreadyExtractedFields = this.buildAlreadyExtractedFields(context.partialFields)
    userPrompt = userPrompt.replace('{{ALREADY_EXTRACTED_FIELDS}}', alreadyExtractedFields)
    userPrompt = userPrompt.replace('{{MESSAGE}}', context.message)

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`

    return {
      systemPrompt,
      userPrompt,
      fullPrompt,
    }
  }

  /**
   * Build the "already extracted fields" section for the prompt
   */
  private buildAlreadyExtractedFields(partialFields?: Partial<UserProfile>): string {
    if (!partialFields || Object.keys(partialFields).length === 0) {
      return ''
    }

    let result = 'Already extracted fields (from pills):\n'
    for (const [key, value] of Object.entries(partialFields)) {
      if (value !== undefined && value !== null) {
        result += `- ${key}: ${JSON.stringify(value)}\n`
      }
    }
    result +=
      '\nUse these as context, but still extract any additional fields mentioned in the notes below.\n\n'
    return result
  }
}
