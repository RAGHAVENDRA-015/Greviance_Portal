/**
 * ChatWindow — The scrollable message list area.
 *
 * Auto-scroll behavior:
 * - Scrolls to latest message on every new chunk (during streaming) and on user send.
 * - Pauses auto-scroll if the user has manually scrolled upward more than 120px
 *   above the bottom (they are reading history). Auto-scroll resumes when
 *   they scroll back to the bottom themselves.
 *
 * Also renders empty-state when there are no messages.
 */
import React, { useEffect, useRef, useCallback } from 'react'
import { MessageSquare } from 'lucide-react'
import { ChatMessage, type ChatMessageData } from './ChatMessage'

interface ChatWindowProps {
  messages: ChatMessageData[]
  onSuggestionSelect: (question: string) => void
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  onSuggestionSelect,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  // Track whether the user is manually reading history above
  const isUserScrollingUp = useRef(false)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior })
  }, [])

  // Detect manual scroll up to pause auto-scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isUserScrollingUp.current = distanceFromBottom > 120
  }, [])

  // Auto-scroll on streaming chunks — only if user hasn't scrolled up
  useEffect(() => {
    if (!isUserScrollingUp.current) {
      scrollToBottom('smooth')
    }
  }, [messages, scrollToBottom])

  // Force scroll to bottom immediately when a new user message is sent
  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (lastMsg?.role === 'user') {
      isUserScrollingUp.current = false
      scrollToBottom('smooth')
    }
  }, [messages.length, messages, scrollToBottom])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6 text-slate-400 dark:text-slate-500">
        <MessageSquare className="h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">Ask me anything about the portal</p>
        <p className="text-xs opacity-70">How to file complaints, track status, departments…</p>
      </div>
    )
  }

  const lastAssistantIdx = messages.reduce((acc, msg, idx) => (msg.role === 'assistant' ? idx : acc), -1)

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto p-4 space-y-4"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      {messages.map((msg, idx) => (
        <ChatMessage
          key={msg.id}
          message={msg}
          isLatest={idx === lastAssistantIdx}
          onSuggestionSelect={onSuggestionSelect}
        />
      ))}
      <div ref={bottomRef} aria-hidden="true" />
    </div>
  )
}
