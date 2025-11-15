import { Button } from '@/components/ui/button'
import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      // Check localStorage first
      const stored = localStorage.getItem('theme') as 'dark' | 'light' | null
      if (stored) {
        return stored
      }
      // Then check HTML element (initial state from index.html)
      const htmlHasDark = document.documentElement.classList.contains('dark')
      return htmlHasDark ? 'dark' : 'dark' // Default to dark
    }
    return 'dark'
  })

  useEffect(() => {
    const root = document.documentElement
    // Apply theme immediately on mount
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
