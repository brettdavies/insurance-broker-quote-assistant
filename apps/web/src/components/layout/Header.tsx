/**
 * Header Component
 *
 * Fixed header with logo, mode badge, and action buttons (Help, Prefill, Theme, Reset).
 * Follows front-end spec: [IQuote Pro Logo] [Mode Badge] [/help] [Prefill] [Theme] [/reset]
 */

import { Button } from '@/components/ui/button'
import { Download, HelpCircle, RotateCcw } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

interface HeaderProps {
  mode: 'intake' | 'policy'
  isActive: boolean
  onHelpClick: () => void
  onPrefillClick: () => void
  onResetClick: () => void
}

export function Header({ mode, isActive, onHelpClick, onPrefillClick, onResetClick }: HeaderProps) {
  // Determine mode badge text and color
  const getModeBadge = () => {
    if (!isActive) {
      return { text: 'READY', color: 'bg-gray-500' }
    }
    if (mode === 'intake') {
      return { text: 'INTAKE MODE', color: 'bg-blue-500' }
    }
    return { text: 'POLICY ANALYSIS MODE', color: 'bg-purple-500' }
  }

  const badge = getModeBadge()

  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-gray-300 bg-white px-4 dark:border-gray-700 dark:bg-gray-900">
      {/* Left: Logo */}
      <div className="flex items-center">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">IQuote Pro</h1>
      </div>

      {/* Center: Mode Badge */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold text-white ${badge.color}`}>
          {badge.text}
        </span>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Help Button */}
        <Button variant="ghost" size="sm" onClick={onHelpClick} aria-label="Help">
          <HelpCircle className="h-4 w-4" />
          <span className="ml-1 text-xs">/help</span>
        </Button>

        {/* Prefill Button */}
        <Button variant="outline" size="sm" onClick={onPrefillClick} aria-label="Prefill">
          <Download className="h-4 w-4" />
          <span className="ml-1 text-xs">Prefill</span>
        </Button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Reset Button */}
        <Button variant="ghost" size="sm" onClick={onResetClick} aria-label="Reset">
          <RotateCcw className="h-4 w-4" />
          <span className="ml-1 text-xs">/reset</span>
        </Button>
      </div>
    </header>
  )
}
