import { describe, expect, it } from 'bun:test'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

describe('ThemeToggle', () => {
  it('exports component', () => {
    expect(ThemeToggle).toBeTruthy()
    expect(typeof ThemeToggle).toBe('function')
  })
})
