/**
 * CodeBlock — Renders fenced code blocks inside assistant messages.
 *
 * Features:
 * - Syntax highlighting via react-syntax-highlighter (oneDark theme)
 * - Language label in top-right corner
 * - Copy-to-clipboard button with 2s "Copied!" feedback
 * - Horizontal scrolling for long lines
 * - Rounded corners, dark background
 */
import React, { useState, useCallback } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'

interface CodeBlockProps {
  language?: string
  code: string
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = 'text', code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available — silent fail
    }
  }, [code])

  const displayLang = language === 'text' ? 'plaintext' : language

  return (
    <div className="relative my-2 rounded-xl overflow-hidden border border-slate-700/60 bg-[#282c34] group">
      {/* Header bar: language label + copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#21252b] border-b border-slate-700/60">
        <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
          {displayLang}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-0.5 rounded hover:bg-white/10"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax-highlighted code body */}
      <SyntaxHighlighter
        language={displayLang}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.8rem',
          lineHeight: '1.6',
          background: 'transparent',
          overflowX: 'auto',
        }}
        codeTagProps={{ style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' } }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
