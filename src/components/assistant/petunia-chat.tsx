'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  X,
  Send,
  Minimize2,
  Sparkles,
  Loader2,
  MessageSquare,
  Trash2,
  Zap,
  BarChart3,
  Phone,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAssistantStore, type QuickAction, getToolLabel } from '@/stores/assistant-store'

// ─── Quick action presets ──────────────────────────────────────────────
const QUICK_ACTIONS: { label: string; icon: React.ReactNode; message: string }[] = [
  {
    label: 'Crear campaña',
    icon: <Zap className="size-3.5" />,
    message: 'Quiero crear una campaña de Meta Ads para una de mis propiedades.',
  },
  {
    label: 'Ver mis leads',
    icon: <BarChart3 className="size-3.5" />,
    message: 'Muéstrame un resumen de mis leads actuales y su estado.',
  },
  {
    label: 'Rendimiento',
    icon: <Sparkles className="size-3.5" />,
    message: 'Dame un resumen del rendimiento de mis campañas activas.',
  },
]

// ─── Typing indicator ──────────────────────────────────────────────────
function TypingIndicator({ toolStatus }: { toolStatus?: string | null }) {
  return (
    <div className="flex items-start gap-2.5 mb-3">
      <div className="flex items-center justify-center size-7 rounded-full gold-gradient shrink-0">
        <Image src="/logo-petunia.svg" alt="Petunia" width={16} height={16} className="brightness-200" />
      </div>
      <div className="rounded-xl rounded-tl-sm bg-card border border-border/50 px-4 py-3">
        {toolStatus ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-primary/70 animate-ping" />
            {toolStatus}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full bg-primary/70 animate-bounce"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="size-1.5 rounded-full bg-primary/70 animate-bounce"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="size-1.5 rounded-full bg-primary/70 animate-bounce"
              style={{ animationDelay: '300ms' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Message bubble ────────────────────────────────────────────────────
function MessageBubble({
  content,
  role,
  actions,
  onAction,
  isStreaming,
}: {
  content: string
  role: 'user' | 'assistant'
  actions?: QuickAction[]
  onAction?: (action: QuickAction) => void
  isStreaming?: boolean
}) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex mb-3', isUser ? 'justify-end' : 'items-start gap-2.5')}>
      {!isUser && (
        <div className="flex items-center justify-center size-7 rounded-full gold-gradient shrink-0 mt-0.5">
          <Image src="/logo-petunia.svg" alt="Petunia" width={16} height={16} className="brightness-200" />
        </div>
      )}
      <div className="flex flex-col gap-1.5 max-w-[85%]">
        <div
          className={cn(
            'rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words',
            isUser
              ? 'rounded-br-sm bg-primary text-primary-foreground'
              : 'rounded-tl-sm bg-card border border-border/50 text-card-foreground'
          )}
        >
          {content}
          {isStreaming && (
            <span className="inline-block w-0.5 h-3.5 bg-foreground/60 ml-0.5 -mb-0.5 animate-pulse" />
          )}
        </div>
        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {actions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onAction?.(action)}
                className="text-xs px-2.5 py-1 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 transition-colors cursor-pointer"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main chat widget ──────────────────────────────────────────────────
export function PetuniaChat() {
  const pathname = usePathname()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const {
    isOpen,
    messages,
    isLoading,
    toolStatus,
    unreadCount,
    setOpen,
    toggleOpen,
    sendMessage,
    setCurrentPage,
    clearConversation,
  } = useAssistantStore()

  // Track current page
  useEffect(() => {
    setCurrentPage(pathname)
  }, [pathname, setCurrentPage])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const value = inputRef.current?.value.trim()
    if (!value || isLoading) return
    inputRef.current!.value = ''
    await sendMessage(value)
  }, [isLoading, sendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleQuickAction = useCallback(
    (message: string) => {
      sendMessage(message)
    },
    [sendMessage]
  )

  const handleActionButton = useCallback(
    (action: QuickAction) => {
      if (action.type === 'navigate') {
        // action.action can be "navigate:/path" or just "/path"
        const path = action.action.replace(/^navigate:/, '')
        setOpen(false)
        router.push(path)
      } else if (action.type === 'message') {
        sendMessage(action.action)
      } else {
        sendMessage(action.action)
      }
    },
    [sendMessage, router, setOpen]
  )

  const showQuickActions = messages.length === 0 && !isLoading

  return (
    <>
      {/* ── Floating button (minimized) ──────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Tooltip / proactive suggestion */}
        {!isOpen && (
          <div
            className={cn(
              'transition-all duration-300 ease-out',
              'opacity-100 translate-y-0'
            )}
          >
            <div className="bg-card border border-border/60 rounded-xl px-4 py-2.5 shadow-2xl shadow-primary/10 max-w-[220px]">
              <p className="text-xs text-foreground/90 leading-snug">
                <Sparkles className="size-3 text-primary inline mr-1 -mt-0.5" />
                Necesitas ayuda? Preguntame lo que sea.
              </p>
            </div>
          </div>
        )}

        {/* Open/close button */}
        <button
          onClick={toggleOpen}
          className={cn(
            'group relative flex items-center justify-center size-14 rounded-full shadow-xl cursor-pointer',
            'transition-all duration-300 ease-out hover:scale-105 active:scale-95',
            'gold-gradient',
            isOpen && 'rotate-0'
          )}
          aria-label={isOpen ? 'Cerrar asistente' : 'Abrir asistente'}
        >
          {isOpen ? (
            <X className="size-6 text-white transition-transform duration-200" />
          ) : (
            <Image src="/logo-petunia.svg" alt="Petunia" width={28} height={28} className="brightness-200 transition-transform duration-200 group-hover:scale-110" />
          )}

          {/* Unread badge */}
          {!isOpen && unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center size-5 rounded-full bg-destructive text-[10px] font-bold text-white animate-bounce">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          {/* Pulse ring */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full gold-gradient animate-ping opacity-20 pointer-events-none" />
          )}
        </button>
      </div>

      {/* ── Chat panel (expanded) ────────────────────────────────── */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-50 w-[380px] h-[540px]',
          'flex flex-col overflow-hidden',
          'bg-background border border-border/60 rounded-2xl',
          'shadow-2xl shadow-primary/10',
          'transition-all duration-300 ease-out origin-bottom-right',
          isOpen
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 scale-95 translate-y-4 pointer-events-none'
        )}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg gold-gradient shadow-sm p-1">
              <Image src="/logo-petunia.svg" alt="Petunia" width={20} height={20} className="brightness-200" />
            </div>
            <div>
              <h3 className="text-sm font-semibold leading-none tracking-tight">
                Petunia Helper
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Tu asistente de bienes raices
              </p>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="flex items-center justify-center size-7 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Limpiar conversacion"
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center size-7 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Minimizar"
            >
              <Minimize2 className="size-3.5" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex items-center justify-center size-7 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ── Messages area ──────────────────────────────────────── */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-4 scroll-smooth"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'oklch(0.30 0.04 240) transparent' }}
        >
          {/* Empty / welcome state */}
          {showQuickActions && (
            <div className="flex flex-col items-center justify-center h-full text-center px-2">
              <div className="flex items-center justify-center size-16 rounded-2xl gold-gradient shadow-lg mb-4 p-2">
                <Image src="/logo-petunia.svg" alt="Petunia" width={48} height={48} className="brightness-200" />
              </div>
              <h4 className="text-base font-semibold mb-1">Hola! Soy Petunia</h4>
              <p className="text-xs text-muted-foreground mb-6 max-w-[260px] leading-relaxed">
                Tu asistente inteligente de Petunia AI. Puedo ayudarte con tus leads, campañas, seguimientos y más.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[280px]">
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => handleQuickAction(qa.message)}
                    disabled={isLoading}
                    className={cn(
                      'flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl text-left',
                      'bg-card border border-border/40 hover:border-primary/40 hover:bg-primary/5',
                      'text-sm text-foreground/90 transition-all duration-200 cursor-pointer',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <span className="flex items-center justify-center size-7 rounded-lg bg-primary/15 text-primary shrink-0">
                      {qa.icon}
                    </span>
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              content={msg.content}
              role={msg.role}
              actions={msg.actions}
              onAction={handleActionButton}
              isStreaming={msg.isStreaming}
            />
          ))}

          {/* Typing indicator */}
          {isLoading && <TypingIndicator toolStatus={toolStatus} />}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input area ─────────────────────────────────────────── */}
        <div className="shrink-0 px-3 pb-3 pt-2 border-t border-border/30">
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-3 py-1.5',
              'focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20',
              'transition-all duration-200'
            )}
          >
            <MessageSquare className="size-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Escribe tu mensaje..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none py-1.5"
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className={cn(
                'flex items-center justify-center size-8 rounded-lg transition-all duration-200 cursor-pointer shrink-0',
                'bg-primary/15 text-primary hover:bg-primary hover:text-primary-foreground',
                'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary/15 disabled:hover:text-primary'
              )}
              aria-label="Enviar mensaje"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-1.5">
            Petunia puede cometer errores. Verifica la informacion importante.
          </p>
        </div>
      </div>
    </>
  )
}
