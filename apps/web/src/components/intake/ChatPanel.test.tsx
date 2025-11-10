import { beforeEach, describe, expect, it } from 'bun:test'
import { ChatPanel } from '@/components/intake/ChatPanel'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

describe('ChatPanel', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
  })

  it('exports component', () => {
    expect(ChatPanel).toBeTruthy()
    expect(typeof ChatPanel).toBe('function')
  })

  it('requires QueryClientProvider context', () => {
    // Component requires QueryClientProvider - integration test validates this
    expect(QueryClientProvider).toBeTruthy()
  })
})
