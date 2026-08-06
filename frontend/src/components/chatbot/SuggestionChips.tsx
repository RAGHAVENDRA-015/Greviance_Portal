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

export const SuggestionChips: React.FC<SuggestionChipsProps> = React.memo(
  ({ suggestions, onSelect }) => {
    if (!suggestions || suggestions.length === 0) return null

    return (
      <div className="mt-3.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
          Suggested follow-ups
        </p>
        <div className="flex flex-col gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSelect(suggestion)}
              className="group flex items-center gap-2 text-left text-xs px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 hover:bg-primary-50/80 dark:hover:bg-slate-700/80 hover:border-primary-400 dark:hover:border-primary-500 hover:text-primary-700 dark:hover:text-sky-300 shadow-xs transition-all cursor-pointer"
            >
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary-500 dark:text-primary-400 opacity-75 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              <span className="font-medium leading-snug">{suggestion}</span>
            </button>
          ))}
        </div>
      </div>
    )
  },
)

SuggestionChips.displayName = 'SuggestionChips'
