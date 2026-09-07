import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Sparkles, Trash2, TrainFront } from 'lucide-react'
import api from '../services/api.js'

const GREETING =
  "Hello! I'm Namma Metro AI.\n\nI can help with Metro routes, stations, lines, interchanges, current service information, and the latest metro news.\n\nWhat would you like to know?"

const QUICK_SUGGESTIONS = [
  'Whitefield to Jalahalli',
  'Jayanagar to Ragi Gudda',
  'Latest metro news',
  'Tell me about Majestic',
  'Any disruptions today?',
]

const MAX_HISTORY_SENT = 16

function makeMessage(role, content) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
  }
}

/** Format plain-text answers with newlines and bullet lists */
function FormattedMessage({ text }) {
  const blocks = (text || '').split(/\n{1,}/).filter((b) => b.trim().length > 0)
  return (
    <div className="space-y-1.5">
      {blocks.map((block, i) => {
        const trimmed = block.trim()
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const items = trimmed
            .split(/\n/)
            .map((l) => l.replace(/^[-•]\s*/, '').trim())
            .filter(Boolean)
          return (
            <ul key={i} className="list-disc pl-4 space-y-0.5">
              {items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="whitespace-pre-line leading-relaxed">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1 py-1" aria-label="Namma Metro AI is thinking">
      <span className="w-1.5 h-1.5 rounded-full bg-muted/70 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted/70 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted/70 animate-bounce" />
    </div>
  )
}

export default function MetroChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasGreeted, setHasGreeted] = useState(false)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && !hasGreeted) {
      setMessages([makeMessage('assistant', GREETING)])
      setHasGreeted(true)
    }
  }, [open, hasGreeted])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading, open])

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  async function sendMessage(rawText) {
    const text = (rawText ?? input).trim()
    if (!text || loading) return

    setError(null)
    setInput('')
    const userMsg = makeMessage('user', text)
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    const conversation = [...messages, userMsg]
      .slice(-MAX_HISTORY_SENT)
      .map((m) => ({ role: m.role, content: m.content }))

    const { data, error: apiError } = await api.chat(text, conversation)

    setLoading(false)

    if (apiError || !data || typeof data.answer !== 'string') {
      const errText =
        "I'm unable to connect to the Metro information service right now. Please try again."
      setError(errText)
      setMessages((prev) => [...prev, makeMessage('assistant', errText)])
      return
    }

    setMessages((prev) => [...prev, makeMessage('assistant', data.answer)])
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function handleClearChat() {
    setMessages([makeMessage('assistant', GREETING)])
    setError(null)
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Namma Metro AI chat"
          className="fixed z-50 bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] max-w-[400px] h-[min(620px,calc(100vh-140px))] bg-white rounded-xl2 border border-border shadow-soft flex flex-col overflow-hidden animate-[fadeIn_0.15s_ease-out]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border bg-ink text-white shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <TrainFront size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="font-display font-semibold text-sm leading-tight truncate">
                  Namma Metro AI
                </h2>
                <p className="text-[11px] text-white/70 leading-tight truncate">
                  Routes · Stations · Live Metro Information
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-lg hover:bg-white/10 focus-ring text-white/80 hover:text-white transition-colors"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 focus-ring text-white/80 hover:text-white transition-colors"
                aria-label="Close chat"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-surface">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-xl2 px-3.5 py-2.5 text-sm shadow-sm ${
                    m.role === 'user'
                      ? 'bg-accent text-white rounded-br-md'
                      : 'bg-white border border-border text-ink rounded-bl-md'
                  }`}
                >
                  <FormattedMessage text={m.content} />
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-border rounded-xl2 rounded-bl-md px-3.5 py-2.5 shadow-sm">
                  <TypingDots />
                </div>
              </div>
            )}
          </div>

          {/* Quick suggestions */}
          {messages.length <= 1 && !loading && (
            <div className="px-4 py-2.5 border-t border-border bg-white shrink-0">
              <p className="text-[11px] uppercase tracking-wide text-muted mb-1.5">
                Try asking
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-full border border-border text-ink/80 hover:bg-surface hover:border-accent/40 focus-ring transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100 shrink-0">
              {error}
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 border-t border-border bg-white shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Ask about Namma Metro..."
              aria-label="Ask about Namma Metro"
              className="flex-1 min-w-0 text-sm px-3.5 py-2.5 rounded-full border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="w-10 h-10 shrink-0 rounded-full bg-ink text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ink/90 focus-ring transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Namma Metro AI chat' : 'Open Namma Metro AI chat'}
        aria-expanded={open}
        className="fixed z-50 bottom-5 right-4 sm:right-6 w-14 h-14 rounded-full bg-ink text-white shadow-soft flex items-center justify-center hover:bg-ink/90 active:scale-95 transition-all focus-ring"
      >
        {open ? (
          <X size={22} />
        ) : (
          <span className="relative flex items-center justify-center">
            <MessageCircle size={24} />
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-accent flex items-center justify-center">
              <Sparkles size={8} className="text-white" />
            </span>
          </span>
        )}
      </button>
    </>
  )
}
