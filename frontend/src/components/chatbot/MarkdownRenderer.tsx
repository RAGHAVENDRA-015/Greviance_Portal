/**
 * MarkdownRenderer — Renders assistant message content as formatted markdown.
 *
 * Uses react-markdown with remark-gfm for GitHub-flavored markdown support:
 * - Headings, bold, italic, strikethrough
 * - Bullet + numbered lists
 * - Tables
 * - Links (open in new tab safely)
 * - Inline code and fenced code blocks (delegated to CodeBlock)
 * - Blockquotes
 *
 * All rendering is scoped under .prose-chat CSS class (defined in index.css).
 */
import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { CodeBlock } from './CodeBlock'

interface MarkdownRendererProps {
  content: string
}

const markdownComponents: Components = {
  // Delegate fenced code blocks to CodeBlock (with syntax highlighting)
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '')
    const isBlock = !!(className || match)
    const codeStr = String(children).replace(/\n$/, '')

    if (isBlock) {
      return <CodeBlock language={match?.[1]} code={codeStr} />
    }
    // Inline code — styled via .prose-chat code CSS
    return (
      <code className={className} {...props}>
        {children}
      </code>
    )
  },

  // Links open in new tab with security attributes
  a({ children, href, ...props }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  },

  // Tables with overflow scroll on narrow containers
  table({ children }) {
    return (
      <div className="overflow-x-auto">
        <table>{children}</table>
      </div>
    )
  },
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="prose-chat">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
