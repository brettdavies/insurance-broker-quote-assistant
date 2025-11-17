import { describe, expect, it } from 'bun:test'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from '../routeTree.gen'

// Integration test for TanStack Router
describe('Router Integration', () => {
  it('creates router with route tree', () => {
    const router = createRouter({ routeTree })
    expect(router).toBeTruthy()
  })

  it('has route tree defined', () => {
    expect(routeTree).toBeTruthy()
  })
})
