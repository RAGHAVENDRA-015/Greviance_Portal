/**
 * ChatbotWidget — Floating chatbot button + panel.
 *
 * OPTIMIZATIONS (Phase 12):
 * - Draft persistence debounced (300ms) to avoid a localStorage write on every keystroke.
 * - useCallback deps tightened to prevent stale closure re-creation.
 * - Input handler uses functional setState to avoid stale closure on inputMessage.
 * - isStreaming exposed via ref (isStreamingRef) so callbacks stay stable forever.
 */
import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, X, Send, Square, Sparkles } from 'lucide-react'
import { streamChat } from '@/api/chatbot'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ChatWindow } from './ChatWindow'
import type { ChatMessageData } from './ChatMessage'

const DRAFT_KEY = 'grievance-portal-chat-draft'

const WELCOME_MESSAGE: ChatMessageData = {
  id: 'welcome-1',
  role: 'assistant',
  content:
    'Hello! I am your **AI Assistant** for the Citizen Grievance Portal.\n\nAsk me anything about portal procedures, how to file complaints, track your grievances, or use any portal feature!',
  sources: [],
  suggestions: [
    'How do I file a new complaint?',
    'How do I track my complaint?',
    'Which departments handle road issues?',
  ],
  isStreaming: false,
  timestamp: new Date(),
}

export const ChatbotWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [inputMessage, setInputMessage] = useState(() => localStorage.getItem(DRAFT_KEY) || '')
  const [isStreaming, setIsStreaming] = useState(false)
  const [messages, setMessages] = useState<ChatMessageData[]>([WELCOME_MESSAGE])

  const isStreamingRef = useRef(false)
  isStreamingRef.current = isStreaming

  const abortControllerRef = useRef<AbortController | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Debounce timer ref for localStorage draft save
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Save input draft to localStorage — debounced 300ms to avoid writing on every keystroke
  useEffect(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
    draftSaveTimerRef.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, inputMessage)
    }, 300)
    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current)
    }
  }, [inputMessage])

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [isOpen])

  /** Cancel any in-flight stream */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const handleClose = useCallback(() => {
    cancelStream()
    setIsOpen(false)
    setMessages((prev) =>
      prev.map((msg) => (msg.isStreaming ? { ...msg, isStreaming: false } : msg)),
    )
  }, [cancelStream])

  // Global Escape key listener to close panel or stop generation
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isStreamingRef.current) {
          cancelStream()
        } else if (isOpen) {
          handleClose()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isOpen, cancelStream, handleClose])

  // Permanently stable sendMessage callback using isStreamingRef
  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || isStreamingRef.current) return

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }

      const userMsgId = `user-${Date.now()}`
      const assistantMsgId = `asst-${Date.now() + 1}`

      const userMessage: ChatMessageData = {
        id: userMsgId,
        role: 'user',
        content: trimmed,
        sources: [],
        suggestions: [],
        isStreaming: false,
        timestamp: new Date(),
      }

      const assistantPlaceholder: ChatMessageData = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        sources: [],
        suggestions: [],
        isStreaming: true,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage, assistantPlaceholder])
      setInputMessage('')
      localStorage.removeItem(DRAFT_KEY)
      setIsStreaming(true)

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        await streamChat(trimmed, {
          signal: controller.signal,

          onChunk(chunkText) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, content: msg.content + chunkText }
                  : msg,
              ),
            )
          },

          onDone({ sources, suggestions }) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? { ...msg, sources, suggestions, isStreaming: false }
                  : msg,
              ),
            )
          },
        })
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return
        const errorMsg = err instanceof Error ? err.message : 'An error occurred.'
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: msg.content || `⚠️ ${errorMsg}`,
                  isStreaming: false,
                }
              : msg,
          ),
        )
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [],
  )

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      sendMessage(inputMessage)
    },
    [inputMessage, sendMessage],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        sendMessage(inputMessage)
      }
    },
    [inputMessage, sendMessage],
  )

  return (
    <>
      {/* ── Floating Toggle Button ── */}
      <motion.button
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className="fixed bottom-20 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-white shadow-xl hover:shadow-2xl transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2"
        aria-label={isOpen ? 'Close AI Chatbot' : 'Open AI Chatbot'}
        id="chatbot-toggle"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <Bot className="h-7 w-7" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-36 right-6 z-50 flex flex-col rounded-3xl border border-slate-200/70 bg-slate-50/95 dark:bg-slate-950/95 dark:border-slate-800/80 shadow-2xl backdrop-blur-xl overflow-hidden"
            style={{ width: 400, height: 540, maxWidth: 'calc(100vw - 1.5rem)', maxHeight: 'calc(100dvh - 11rem)' }}
            role="dialog"
            aria-label="AI Chatbot"
            id="chatbot-panel"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-800/80 px-5 py-3.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl gradient-primary text-white shadow-md">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-slate-900 dark:text-white text-sm leading-tight">
                    Grievance AI Assistant
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {isStreaming ? 'Generating response…' : 'Online & Ready'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Message List ── */}
            <ChatWindow
              messages={messages}
              onSuggestionSelect={sendMessage}
            />

            {/* ── Clean & Simple Input Bar ── */}
            <form
              onSubmit={handleFormSubmit}
              className="border-t border-slate-200/70 dark:border-slate-800/80 p-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shrink-0"
            >
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  id="chatbot-input"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question…"
                  disabled={isStreaming}
                  autoComplete="off"
                  className="rounded-2xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 text-sm focus-visible:ring-primary-500"
                  aria-label="Chat input"
                />
                {isStreaming ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={cancelStream}
                    className="rounded-2xl h-10 w-10 p-0 shrink-0 bg-red-500 hover:bg-red-600 text-white shadow-md"
                    aria-label="Stop generating"
                    title="Stop generating"
                  >
                    <Square className="h-4 w-4 fill-white" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!inputMessage.trim()}
                    className="rounded-2xl h-10 w-10 p-0 shrink-0 gradient-primary text-white shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Send message"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
