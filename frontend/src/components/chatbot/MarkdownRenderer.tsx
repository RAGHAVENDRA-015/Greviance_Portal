/**
 * MarkdownRenderer — Renders assistant message content as formatted markdown.
 *
 * OPTIMIZATION (Phase 12):
 * - During streaming (`isStreaming=true`): renders plain text with whitespace preserved.
 *   This eliminates the expensive markdown AST parse + React reconciliation on every
 *   single SSE chunk (was re-parsing the entire growing string each time).
 * - After streaming completes (`isStreaming=false`): switches to full ReactMarkdown
 *   rendering exactly once, now that the content is final.
 * - Memoized on `content + isStreaming` so stable completed messages never re-render.
 *
 * Benefits:
 * - Eliminates ~N parse operations during a stream (one per chunk → one total).
 * - Smooth, flicker-free text appearance during generation.
 * - Full GFM markdown (tables, code blocks, strikethrough) available after completion.
 */
import React, { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { CodeBlock } from './CodeBlock'

interface MarkdownRendererProps {
  content: string
  /** When true, render plain text (fast path during streaming). Default: false */
  isStreaming?: boolean
}

const markdownComponents: Components = {
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const isBlock = !!(className || match)
    const codeStr = String(children).replace(/\n$/, '')

    if (isBlock) {
      return <CodeBlock language={match?.[1]} code={codeStr} />
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },

  a({ children, href, ...props }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  },

  table({ children }) {
    return (
      <div className="overflow-x-auto">
        <table>{children}</table>
      </div>
    )
  },
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = React.memo(
  ({ content, isStreaming = false }) => {
    // During streaming: skip markdown parsing entirely — render as plain text.
    // This is the critical optimization: react-markdown parses the full AST on
    // every render, which is O(n) in content length. With hundreds of chunks per
    // response, this compounds to significant frame drops.
    if (isStreaming) {
      return (
        <div className="prose-chat">
          <p className="whitespace-pre-wrap break-words">{content}</p>
        </div>
      )
    }

    // After streaming: render markdown once, fully. Wrapped in useMemo via
    // React.memo so this never re-runs for completed messages in the history.
    return (
      <div className="prose-chat">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {content}
        </ReactMarkdown>
      </div>
    )
  },
  // Custom equality: only re-render if content or streaming state changes.
  // Completed messages (isStreaming=false) with unchanged content never re-render.
  (prev, next) => prev.content === next.content && prev.isStreaming === next.isStreaming,
)

MarkdownRenderer.displayName = 'MarkdownRenderer'
