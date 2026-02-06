'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommandItem = {
  id: string
  label: string
  href: string
  shortcut?: string
  section: string
  keywords?: string[]
}

// ---------------------------------------------------------------------------
// Navigation items surfaced in the palette
// ---------------------------------------------------------------------------

const COMMANDS: CommandItem[] = [
  // Core pages
  { id: 'dashboard',   label: 'Dashboard',        href: '/dashboard',                    shortcut: 'G D', section: 'Navigation', keywords: ['home', 'overview'] },
  { id: 'analytics',   label: 'Analytics',        href: '/dashboard/analytics',          shortcut: 'G A', section: 'Navigation', keywords: ['charts', 'stats', 'metrics'] },
  { id: 'jobs',        label: 'Jobs',             href: '/dashboard/jobs',               shortcut: 'G J', section: 'Navigation', keywords: ['work', 'tasks', 'schedule'] },
  { id: 'inspections', label: 'Inspections',      href: '/dashboard/jobs?view=calendar', shortcut: 'G N', section: 'Navigation', keywords: ['schedule', 'calendar', 'audit'] },
  { id: 'invoices',    label: 'Invoices',         href: '/dashboard/finances/invoices',  shortcut: 'G I', section: 'Navigation', keywords: ['billing', 'payments', 'money'] },
  { id: 'settings',    label: 'Settings',         href: '/dashboard/settings',           shortcut: 'G S', section: 'Navigation', keywords: ['profile', 'preferences', 'config'] },

  // Secondary pages
  { id: 'builders',    label: 'Builders',         href: '/dashboard/builders',           section: 'Navigation', keywords: ['clients', 'customers'] },
  { id: 'reports',     label: 'Reports',          href: '/dashboard/reports',            section: 'Navigation', keywords: ['documents', 'templates'] },
  { id: 'finances',    label: 'Finances',         href: '/dashboard/finances',           section: 'Navigation', keywords: ['money', 'billing'] },
  { id: 'tax-credits', label: '45L Tax Credits',  href: '/dashboard/finances/tax-credits', section: 'Navigation', keywords: ['tax', 'credit', '45l'] },
  { id: 'equipment',   label: 'Equipment',        href: '/dashboard/assets/equipment',   section: 'Navigation', keywords: ['tools', 'assets'] },
  { id: 'fleet',       label: 'Fleet',            href: '/dashboard/assets/fleet',       section: 'Navigation', keywords: ['vehicles', 'trucks'] },
  { id: 'team',        label: 'Team',             href: '/dashboard/team',               section: 'Navigation', keywords: ['users', 'inspectors', 'people'] },
  { id: 'logistics',   label: 'Logistics',        href: '/dashboard/logistics/mileage',  section: 'Navigation', keywords: ['mileage', 'routes'] },
  { id: 'qa',          label: 'QA Review',        href: '/dashboard/qa',                 section: 'Navigation', keywords: ['quality', 'review'] },
  { id: 'pricing',     label: 'Pricing',          href: '/dashboard/settings/pricing',   section: 'Navigation', keywords: ['rates', 'costs'] },
]

// ---------------------------------------------------------------------------
// Simple fuzzy matching
// ---------------------------------------------------------------------------

function fuzzyMatch(query: string, text: string): boolean {
  const lowerQuery = query.toLowerCase()
  const lowerText = text.toLowerCase()

  // Substring match
  if (lowerText.includes(lowerQuery)) return true

  // Character-by-character fuzzy match
  let qi = 0
  for (let ti = 0; ti < lowerText.length && qi < lowerQuery.length; ti++) {
    if (lowerText[ti] === lowerQuery[qi]) {
      qi++
    }
  }
  return qi === lowerQuery.length
}

function scoreMatch(query: string, item: CommandItem): number {
  const lowerQuery = query.toLowerCase()
  const lowerLabel = item.label.toLowerCase()

  // Exact match scores highest
  if (lowerLabel === lowerQuery) return 100

  // Starts-with is very strong
  if (lowerLabel.startsWith(lowerQuery)) return 90

  // Substring match
  if (lowerLabel.includes(lowerQuery)) return 70

  // Keyword exact match
  if (item.keywords?.some(k => k === lowerQuery)) return 65

  // Keyword substring
  if (item.keywords?.some(k => k.includes(lowerQuery))) return 50

  // Fuzzy match on label
  if (fuzzyMatch(lowerQuery, lowerLabel)) return 30

  // Fuzzy match on keywords
  if (item.keywords?.some(k => fuzzyMatch(lowerQuery, k))) return 20

  return 0
}

function filterAndSort(query: string, items: CommandItem[]): CommandItem[] {
  if (!query.trim()) return items

  return items
    .map(item => ({ item, score: scoreMatch(query, item) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const pendingGoRef = useRef(false)

  const results = useMemo(() => filterAndSort(query, COMMANDS), [query])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results.length, query])

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      // Short delay to ensure DOM is ready
      const timer = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timer)
    } else {
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  // Scroll active item into view
  useEffect(() => {
    if (!open || !listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex, open])

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  // Navigate to item and close
  const navigateTo = useCallback((href: string) => {
    setOpen(false)
    router.push(href)
  }, [router])

  // -----------------------------------------------------------------------
  // Global keyboard shortcuts
  // -----------------------------------------------------------------------
  useEffect(() => {
    let goTimeout: ReturnType<typeof setTimeout> | null = null

    function handleKeyDown(e: KeyboardEvent) {
      // Cmd/Ctrl + K  ->  toggle command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
        return
      }

      // Escape -> close palette
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        setOpen(false)
        return
      }

      // "G then <key>" navigation shortcuts (only when palette is closed
      // and not focused on an input/textarea/contenteditable)
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable

      if (!open && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toLowerCase()

        if (key === 'g') {
          pendingGoRef.current = true
          if (goTimeout) clearTimeout(goTimeout)
          goTimeout = setTimeout(() => { pendingGoRef.current = false }, 800)
          return
        }

        if (pendingGoRef.current) {
          pendingGoRef.current = false
          if (goTimeout) clearTimeout(goTimeout)

          const shortcutMap: Record<string, string> = {
            d: '/dashboard',
            a: '/dashboard/analytics',
            j: '/dashboard/jobs',
            n: '/dashboard/jobs?view=calendar',
            i: '/dashboard/finances/invoices',
            s: '/dashboard/settings',
          }

          const href = shortcutMap[key]
          if (href) {
            e.preventDefault()
            router.push(href)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (goTimeout) clearTimeout(goTimeout)
    }
  }, [open, router])

  // -----------------------------------------------------------------------
  // Palette-internal keyboard navigation
  // -----------------------------------------------------------------------
  const handlePaletteKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = results[selectedIndex]
      if (item) navigateTo(item.href)
    }
  }, [results, selectedIndex, navigateTo])

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Palette panel */}
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        onKeyDown={handlePaletteKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-gray-200 px-4">
          <svg
            className="mr-2 h-5 w-5 shrink-0 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent py-3 text-sm text-gray-900 placeholder-gray-400 outline-none"
            placeholder="Type a command or search..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search commands"
            aria-activedescendant={results[selectedIndex]?.id}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-list"
            aria-autocomplete="list"
          />
          <kbd className="ml-2 hidden rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs text-gray-400 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="max-h-72 overflow-y-auto overscroll-contain p-2"
        >
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No results found.
            </div>
          ) : (
            results.map((item, index) => (
              <button
                key={item.id}
                id={item.id}
                role="option"
                aria-selected={index === selectedIndex}
                data-active={index === selectedIndex}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => navigateTo(item.href)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500">
                    <svg
                      className="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-gray-400">{item.section}</span>
                  </div>
                </div>
                {item.shortcut && (
                  <div className="flex gap-1">
                    {item.shortcut.split(' ').map((key, ki) => (
                      <kbd
                        key={ki}
                        className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-mono text-gray-400"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer with shortcut hints */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2 text-xs text-gray-400">
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">&uarr;</kbd>
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">&darr;</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">&crarr;</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">esc</kbd>
              close
            </span>
          </div>
          <span>
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">Ctrl</kbd>
            +
            <kbd className="rounded border border-gray-200 bg-gray-50 px-1 py-0.5 font-mono text-[10px]">K</kbd>
            to open
          </span>
        </div>
      </div>
    </div>
  )
}
