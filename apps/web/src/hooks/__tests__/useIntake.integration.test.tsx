import '../../test-setup'
import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { useIntake } from '../useIntake'
import type { IntakeRequest } from '../useIntake'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('useIntake Hook Integration', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  it('performs mutation with message', async () => {
    const { result } = renderHook(() => useIntake(), { wrapper })

    const request: IntakeRequest = {
      message: 'Client needs auto insurance, k:2 v:3 state:CA',
    }

    result.current.mutate(request)

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 }
    )

    expect(result.current.data).toBeTruthy()
    expect(result.current.data?.profile).toBeTruthy()
  })

  it('extracts fields from key-value syntax', async () => {
    const { result } = renderHook(() => useIntake(), { wrapper })

    const request: IntakeRequest = {
      message: 'k:2 v:3 state:CA',
    }

    result.current.mutate(request)

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 }
    )

    const data = result.current.data
    expect(data).toBeTruthy()
    expect(data?.profile).toBeTruthy()
    // Check that fields were extracted
    expect((data?.profile as { kids?: number }).kids).toBe(2)
    expect((data?.profile as { vehicles?: number }).vehicles).toBe(3)
    expect(data?.profile.state).toBe('CA')
  })

  it('returns missing fields', async () => {
    const { result } = renderHook(() => useIntake(), { wrapper })

    const request: IntakeRequest = {
      message: 'k:2',
    }

    result.current.mutate(request)

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 }
    )

    const data = result.current.data
    expect(data?.missingFields).toBeTruthy()
    expect(Array.isArray(data?.missingFields)).toBe(true)
    expect(data?.missingFields.length).toBeGreaterThan(0)
  })

  it('handles empty message gracefully', async () => {
    const { result } = renderHook(() => useIntake(), { wrapper })

    const request: IntakeRequest = {
      message: '',
    }

    result.current.mutate(request)

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 }
    )

    expect(result.current.data).toBeTruthy()
  })

  it('handles conversation history parameter', async () => {
    const { result } = renderHook(() => useIntake(), { wrapper })

    const request: IntakeRequest = {
      message: 'k:2',
      conversationHistory: [{ role: 'user', content: 'Previous message' }],
    }

    result.current.mutate(request)

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true)
      },
      { timeout: 2000 }
    )

    expect(result.current.data).toBeTruthy()
  })
})
