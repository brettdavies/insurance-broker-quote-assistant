/**
 * Shared Test Utilities
 *
 * Common helpers for React component tests to follow DRY and STAR principles.
 * Centralizes QueryClient creation, render helpers, and container query patterns.
 *
 * @see docs/architecture/16-testing-strategy.md
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type RenderOptions, render } from '@testing-library/react'
import type { ReactElement } from 'react'

/**
 * Creates a test QueryClient with disabled retries for faster tests
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

/**
 * Render helper that wraps component with QueryClientProvider
 * Use this for components that depend on TanStack Query
 */
export function renderWithQueryClient(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  const queryClient = createTestQueryClient()
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return render(ui, { wrapper: Wrapper, ...options })
}

/**
 * Container query helpers - standardized pattern for querying rendered content
 * These helpers enforce the container pattern used across all component tests
 */

/**
 * Gets text content from container, handling null/undefined safely
 */
export function getTextContent(container: HTMLElement): string {
  return container.textContent || ''
}

/**
 * Checks if container text content matches a regex pattern
 */
export function textMatches(container: HTMLElement, pattern: RegExp | string): boolean {
  const content = getTextContent(container)
  const regex = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
  return regex.test(content)
}

/**
 * Checks if container text content includes a string
 */
export function textIncludes(container: HTMLElement, text: string): boolean {
  return getTextContent(container).includes(text)
}

/**
 * Finds element by query selector, returns null if not found (safer than direct querySelector)
 */
export function findElement(container: HTMLElement, selector: string): HTMLElement | null {
  return container.querySelector(selector)
}

/**
 * Finds all elements by query selector
 */
export function findAllElements(container: HTMLElement, selector: string): NodeListOf<HTMLElement> {
  return container.querySelectorAll(selector)
}
