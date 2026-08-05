/**
 * chatbot.ts — API client for the ChatGPT-like streaming chatbot.
 *
 * Protocol: Server-Sent Events (SSE) over POST /chat/stream
 *
 * Each SSE event from the backend is a JSON payload on the `data:` field:
 *   data: {"type":"chunk","text":"partial response text"}
 *   data: {"type":"done","sources":["citizen.md","faq.md"],"suggestions":["..."]}
 *
 * The function reads the SSE stream line-by-line, parses JSON, and invokes
 * the appropriate callbacks so the UI can update incrementally.
 *
 * Supports:
 * - True token streaming (no polling, no setTimeout)
 * - AbortController-based cancellation (widget close mid-stream)
 * - Graceful error handling with descriptive messages
 */
import { getIdToken } from '@/services/firebase'

const baseURL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')

export interface StreamDonePayload {
  sources: string[]
  suggestions: string[]
}

export interface StreamChatOptions {
  /** Called for each streamed text chunk from the AI */
  onChunk: (text: string) => void
  /** Called once when streaming is complete, with metadata */
  onDone: (payload: StreamDonePayload) => void
  /** AbortSignal from an AbortController so callers can cancel mid-stream */
  signal?: AbortSignal
}

/**
 * Stream a chat response from POST /chat/stream (SSE endpoint).
 * Parses Server-Sent Events and dispatches to `onChunk` and `onDone`.
 */
export async function streamChat(
  message: string,
  options: StreamChatOptions,
): Promise<void> {
  const { onChunk, onDone, signal } = options

  const token = await getIdToken(false)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  let response: Response
  try {
    response = await fetch(`${baseURL}/chat/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ message }),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    throw new Error('Network error: could not connect to the AI service.')
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `Server responded with ${response.status}`)
  }

  if (!response.body) {
    throw new Error('ReadableStream not supported in this browser.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // SSE events are separated by double newlines (\n\n)
      const parts = buffer.split('\n\n')
      // Keep the last incomplete part in the buffer
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const line = part.trim()
        if (!line.startsWith('data:')) continue

        const jsonStr = line.slice('data:'.length).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue

        try {
          const event = JSON.parse(jsonStr) as { type: string; text?: string; sources?: string[]; suggestions?: string[] }

          if (event.type === 'chunk' && event.text) {
            onChunk(event.text)
          } else if (event.type === 'done') {
            onDone({
              sources: event.sources ?? [],
              suggestions: event.suggestions ?? [],
            })
          }
        } catch {
          // Malformed JSON — skip this event and continue
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return
    throw err
  } finally {
    reader.releaseLock()
  }
}
