import { describe, expect, it } from 'bun:test'
import { UploadPanel } from '@/components/policy/UploadPanel'

describe('UploadPanel', () => {
  it('exports component', () => {
    expect(UploadPanel).toBeTruthy()
    expect(typeof UploadPanel).toBe('function')
  })
})
