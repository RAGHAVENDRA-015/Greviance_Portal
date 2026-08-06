/**
 * StreamingMessage — Composes the full assistant message area:
 *
 * ┌─────────────────────────────────────────┐
 * │ [MarkdownRenderer: content]             │
 * │                          [TypingCursor] │
 * │ [MessageSources]                        │
 * │ [SuggestionChips]                       │
 * │ [MessageActions: copy button]           │
 * └─────────────────────────────────────────┘
 *
 * Wrapped in React.memo so non-streaming assistant messages stay completely stable during active SSE streams.
 */
import React from 'react'
import { Loader2 } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { TypingCursor } from './TypingCursor'
import { SuggestionChips } from './SuggestionChips'
import { MessageActions } from './MessageActions'

export interface AssistantMessageData {
  content: string
  sources: string[]
  suggestions: string[]
  isStreaming: boolean
  isLatest: boolean
}

interface StreamingMessageProps extends AssistantMessageData {
  onSuggestionSelect: (question: string) => void
}

export const StreamingMessage: React.FC<StreamingMessageProps> = React.memo(({
  content,
  suggestions,
  isStreaming,
  isLatest,
  onSuggestionSelect,
}) => {

  // Empty placeholder while Gemini hasn't sent the first token yet
  if (!content && isStreaming) {
    return (
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs py-1">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>AI is thinking…</span>
      </div>
    )
  }

  const showMetadata = !isStreaming && content.length > 0
  const showSuggestions = showMetadata && isLatest && suggestions.length > 0

  return (
    <div>
      {/* Main response content with inline blinking cursor */}
      <div className="relative">
        <MarkdownRenderer content={content} />
        <TypingCursor isVisible={isStreaming} />
      </div>

      {/* Suggestions + copy — only after full response */}
      {showMetadata && (
        <>
          {showSuggestions && (
            <SuggestionChips suggestions={suggestions} onSelect={onSuggestionSelect} />
          )}
          <MessageActions content={content} />
        </>
      )}

    </div>
  )
})

StreamingMessage.displayName = 'StreamingMessage'
