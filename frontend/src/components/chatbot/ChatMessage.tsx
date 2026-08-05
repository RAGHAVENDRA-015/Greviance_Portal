/**
 * ChatMessage — Renders a single message row with avatar, bubble, and timestamp.
 *
 * Layout:
 *   User:     avatar (right) ← bubble ←
 *   Assistant: → bubble → avatar (left)
 *
 * For assistant messages, delegates bubble content to StreamingMessage
 * which handles markdown, cursor, sources, suggestions, and copy.
 */
import React from 'react'
import { Bot, User as UserIcon } from 'lucide-react'
import { StreamingMessage } from './StreamingMessage'
import { format } from 'date-fns'

export interface ChatMessageData {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources: string[]
  suggestions: string[]
  isStreaming: boolean
  timestamp: Date
}

interface ChatMessageProps {
  message: ChatMessageData
  isLatest: boolean
  onSuggestionSelect: (question: string) => void
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLatest,
  onSuggestionSelect,
}) => {
  const isUser = message.role === 'user'
  const timeStr = format(message.timestamp, 'HH:mm')

  return (
    <div
      className={`flex items-start gap-2.5 group ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      role="article"
      aria-label={`${isUser ? 'Your' : 'Assistant'} message`}
    >
      {/* Avatar */}
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-sm ${
          isUser
            ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
            : 'gradient-primary text-white'
        }`}
        aria-hidden="true"
      >
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message bubble */}
      <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[82%]`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed w-full ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-none shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/70 dark:border-slate-700/60 shadow-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <StreamingMessage
              content={message.content}
              sources={message.sources}
              suggestions={message.suggestions}
              isStreaming={message.isStreaming}
              isLatest={isLatest}
              onSuggestionSelect={onSuggestionSelect}
            />
          )}
        </div>

        {/* Timestamp — visible on group hover */}
        <span
          className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          aria-label={`Sent at ${timeStr}`}
        >
          {timeStr}
        </span>
      </div>
    </div>
  )
}
