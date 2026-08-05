/**
 * SuggestionChips — Shows 3 clickable follow-up question chips after an assistant response.
 *
 * Clicking a chip triggers `onSelect(question)` which sends it as the next message.
 * Only rendered after streaming is fully complete (isStreaming === false) and
 * the message is the last assistant message in the thread.
 */
import React from 'react'
import { ChevronRight } from 'lucide-react'

interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (question: string) => void
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ suggestions, onSelect }) => {
  if (!suggestions || suggestions.length === 0) return null

  return (
    <div className="mt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
        Suggested follow-ups
      </p>
      <div className="flex flex-col gap-1.5">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSelect(suggestion)}
            className="group flex items-center gap-2 text-left text-xs px-3 py-2 rounded-xl border border-primary-200/60 dark:border-primary-800/50 bg-primary-50/60 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 hover:border-primary-300 dark:hover:border-primary-700 transition-all"
          >
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
