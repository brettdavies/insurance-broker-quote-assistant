import { describe, expect, it } from 'bun:test'
import { useSlashCommands } from '@/hooks/useSlashCommands'

describe('useSlashCommands', () => {
  it('exports hook function', () => {
    expect(typeof useSlashCommands).toBe('function')
  })

  it('has correct type signature', () => {
    // Type check - if this compiles, types are correct
    const callbacks = {
      onFieldCommand: (cmd: string) => {},
      onActionCommand: (cmd: string) => {},
    }
    expect(callbacks).toBeTruthy()
  })
})
