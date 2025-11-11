import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <ThemeToggle />
      <Outlet />
    </>
  ),
})
