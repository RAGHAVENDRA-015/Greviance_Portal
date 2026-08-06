/**
 * MessageSources — Disabled per user configuration to avoid exposing internal source details.
 * Always returns null.
 */
import React from 'react'

interface MessageSourcesProps {
  sources: string[]
}

export const MessageSources: React.FC<MessageSourcesProps> = React.memo(() => null)

MessageSources.displayName = 'MessageSources'
