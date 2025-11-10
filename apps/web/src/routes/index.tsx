import { HomeScreen } from '@/components/layout/HomeScreen'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomeScreen,
})
