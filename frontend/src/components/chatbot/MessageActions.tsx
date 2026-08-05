/**
 * MessageActions — Copy-to-clipboard action bar shown beneath assistant messages.
 *
 * Shows a 📋 Copy button that:
 * 1. Copies the raw text content to clipboard
 * 2. Shows "Copied!" for 2 seconds with a checkmark
 * 3. Uses the native Clipboard API (no fallback needed for modern browsers)
 *
 * Only rendered for assistant (non-user) messages after streaming completes.
 */
import React, { useState, useCallback } from 'react'
import { Copy, Check } from 'lucide-react'

interface MessageActionsProps {
  content: string
}

export const MessageActions: React.FC<MessageActionsProps> = ({ content }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API unavailable — silent fail
    }
  }, [content])

  return (
    <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
        aria-label="Copy response"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-emerald-500 font-medium">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            <span>Copy</span>
          </>
        )}
      </button>
    </div>
  )
}
