import { describe, expect, it } from 'bun:test'
import { HomeScreen } from '@/components/layout/HomeScreen'

describe('HomeScreen', () => {
  it('exports component', () => {
    expect(HomeScreen).toBeTruthy()
    expect(typeof HomeScreen).toBe('function')
  })
})
