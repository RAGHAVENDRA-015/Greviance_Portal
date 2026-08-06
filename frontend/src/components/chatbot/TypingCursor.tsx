/**
 * TypingCursor — Blinking vertical bar cursor shown while the AI is streaming.
 * Rendered inline at the end of streaming message content.
 * Disappears automatically when `isVisible` is false (streaming complete).
 */
import React from 'react'

interface TypingCursorProps {
  isVisible: boolean
}

export const TypingCursor: React.FC<TypingCursorProps> = React.memo(({ isVisible }) => {
  if (!isVisible) return null
  return <span className="cursor-blink" aria-hidden="true" />
})

TypingCursor.displayName = 'TypingCursor'
