import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Toaster } from '@/components/ui/toaster'
import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <ThemeToggle />
      <Outlet />
      <Toaster />
    </>
  ),
})
