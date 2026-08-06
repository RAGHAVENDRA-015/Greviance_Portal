/**
 * CodeBlock — Renders fenced code blocks inside assistant messages.
 *
 * Features:
 * - Lazy-loaded Prism syntax highlighter (code-split out of main chunk)
 * - Copy-to-clipboard button with 2s "Copied!" feedback
 * - Horizontal scrolling for long lines
 * - Rounded corners, sleek dark container
 */
import React, { useState, useCallback, lazy, Suspense } from 'react'
import { Copy, Check } from 'lucide-react'

// Dynamically import SyntaxHighlighter to prevent synchronous bundle weight
const SyntaxHighlighter = lazy(() =>
  Promise.all([
    import('react-syntax-highlighter'),
    import('react-syntax-highlighter/dist/esm/styles/prism'),
  ]).then(([highlighterModule, styleModule]) => ({
    default: (props: React.ComponentProps<typeof highlighterModule.Prism>) => (
      <highlighterModule.Prism style={styleModule.oneDark} {...props} />
    ),
  })),
)

interface CodeBlockProps {
  language?: string
  code: string
}

export const CodeBlock: React.FC<CodeBlockProps> = React.memo(({ language = 'text', code }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard fallback
    }
  }, [code])

  const displayLang = language === 'text' ? 'plaintext' : language

  return (
    <div className="relative my-2.5 rounded-2xl overflow-hidden border border-slate-700/60 bg-[#21252b] shadow-md group">
      {/* Header bar: language label + copy button */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1b1d23] border-b border-slate-700/60 text-xs">
        <span className="font-mono text-slate-400 uppercase tracking-wider font-semibold">
          {displayLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Syntax-highlighted code body (lazy loaded with plaintext fallback) */}
      <Suspense
        fallback={
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre leading-relaxed">
            <code>{code}</code>
          </pre>
        }
      >
        <SyntaxHighlighter
          language={displayLang}
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
      </Suspense>
    </div>
  )
})

CodeBlock.displayName = 'CodeBlock'
