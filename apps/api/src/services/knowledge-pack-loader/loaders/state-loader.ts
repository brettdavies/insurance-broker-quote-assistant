/**
 * State Loader
 *
 * Handles loading state files from the knowledge pack.
 */

import type { State, StateFile } from '@repo/shared'
import { readFile } from 'node:fs/promises'
import { logWarn } from '../../../utils/logger'

/**
 * Load a single state file
 */
export async function loadStateFile(
  filePath: string,
  statesMap: Map<string, State>,
  loadingStatus: {
    statesCount: number
    errors: Array<{ file: string; error: string }>
  }
): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8')
    const data: StateFile = JSON.parse(content)

    // Validate required fields
    if (!data.state || !data.state.code) {
      throw new Error('Invalid state file: missing state.code')
    }

    // Store in map keyed by state code
    statesMap.set(data.state.code, data.state)

    loadingStatus.statesCount++
  } catch (error) {
    const fileName = filePath.split('/').pop() || filePath
    const errorMessage = error instanceof Error ? error.message : String(error)
    loadingStatus.errors.push({ file: fileName, error: errorMessage })
    await logWarn('Failed to load state file', { file: fileName, error: errorMessage })
  }
}
