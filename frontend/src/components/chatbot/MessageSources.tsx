/**
 * MessageSources — Renders the list of RAG knowledge sources cited by the assistant.
 *
 * Shows unique source file names with a 📄 document icon.
 * Only rendered when `sources` array is non-empty.
 * Sources are decorative (no external link) since knowledge files
 * are internal server assets.
 */
import React from 'react'
import { FileText } from 'lucide-react'

interface MessageSourcesProps {
  sources: string[]
}

export const MessageSources: React.FC<MessageSourcesProps> = ({ sources }) => {
  if (!sources || sources.length === 0) return null

  // Deduplicate (backend may send duplicates in rare cases)
  const unique = [...new Set(sources)]

  return (
    <div className="mt-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
        Sources
      </p>
      <div className="flex flex-wrap gap-1.5">
        {unique.map((source) => (
          <span
            key={source}
            className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
          >
            <FileText className="h-3 w-3 text-primary-500 shrink-0" />
            {source}
          </span>
        ))}
      </div>
    </div>
  )
}
