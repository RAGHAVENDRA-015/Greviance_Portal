/**
 * ChatWindow — The scrollable message list area.
 *
 * Auto-scroll behavior (ChatGPT/Linear-level performance):
 * - Instant scroll to bottom on new SSE chunks during streaming (uses requestAnimationFrame
 *   + instant behavior to prevent animation frame conflicts).
 * - Pauses auto-scroll if user has manually scrolled upward (> 80px above bottom).
 * - Displays a floating "Scroll to bottom" button when user is scrolled up.
 * - Resumes auto-scroll automatically when user returns near bottom.
 *
 * OPTIMIZATIONS (Phase 12):
 * - Message list keyed on msg.id — React reconciles only changed messages.
 * - lastAssistantIdx computed with useMemo to avoid linear scan on every render.
 * - handleScroll is stable via useCallback with no deps.
 * - scrollToBottom is stable via useCallback.
 */
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { MessageSquare, ArrowDown } from 'lucide-react'
import { ChatMessage, type ChatMessageData } from './ChatMessage'

interface ChatWindowProps {
  messages: ChatMessageData[]
  onSuggestionSelect: (question: string) => void
}

export const ChatWindow: React.FC<ChatWindowProps> = React.memo(
  ({ messages, onSuggestionSelect }) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const bottomRef = useRef<HTMLDivElement>(null)
    const isUserScrollingUp = useRef(false)
    const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false)

    // OPTIMIZATION: compute lastAssistantIdx once per messages change, not per render
    const lastAssistantIdx = useMemo(
      () =>
        messages.reduce(
          (acc, msg, idx) => (msg.role === 'assistant' ? idx : acc),
          -1,
        ),
      [messages],
    )

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
      if (behavior === 'instant') {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight
        }
      } else {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
      isUserScrollingUp.current = false
      setShowScrollBottomBtn(false)
    }, [])

    // Detect manual scroll up to pause auto-scroll
    const handleScroll = useCallback(() => {
      const el = containerRef.current
      if (!el) return
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
      const scrolledUp = distanceFromBottom > 80
      isUserScrollingUp.current = scrolledUp
      setShowScrollBottomBtn(scrolledUp)
    }, [])

    // Fast non-jitter scroll during active streaming
    useEffect(() => {
      if (!isUserScrollingUp.current && containerRef.current) {
        requestAnimationFrame(() => {
          if (containerRef.current && !isUserScrollingUp.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight
          }
        })
      }
    }, [messages])

    // Force smooth scroll to bottom when a new user message is sent
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

    return (
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
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

        {/* Floating "Scroll to bottom" button */}
        {showScrollBottomBtn && (
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-3 right-4 z-10 flex items-center gap-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-md backdrop-blur-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-all animate-bounce"
            aria-label="Scroll to bottom"
          >
            <ArrowDown className="h-3.5 w-3.5 text-primary-500" />
            <span>Latest messages</span>
          </button>
        )}
      </div>
    )
  },
)

ChatWindow.displayName = 'ChatWindow'
