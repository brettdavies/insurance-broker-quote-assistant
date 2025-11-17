import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { Toaster } from './components/ui/toaster'
import { queryClient } from './lib/query-client'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

// CRITICAL: Do NOT wrap App in <StrictMode>
// Reason: StrictMode double-renders components to catch side effects,
// but this increases LLM API costs during development (2x API calls).
// For a 5-day demo with limited budget, disable to reduce costs.
createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <App />
    <Toaster />
    <TanStackDevtools
      plugins={[
        {
          name: 'TanStack Query',
          render: <ReactQueryDevtoolsPanel />,
        },
      ]}
    />
  </QueryClientProvider>
)
