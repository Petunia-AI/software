import { create } from 'zustand'

export interface QuickAction {
  label: string
  action: string
  type: 'navigate' | 'execute' | 'message'
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  actions?: QuickAction[]
  isStreaming?: boolean
}

export interface AssistantState {
  isOpen: boolean
  messages: ChatMessage[]
  conversationId: string | null
  isLoading: boolean
  toolStatus: string | null
  currentPage: string
  unreadCount: number
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  addMessage: (message: ChatMessage) => void
  setLoading: (loading: boolean) => void
  setConversationId: (id: string) => void
  setCurrentPage: (page: string) => void
  sendMessage: (content: string) => Promise<void>
  clearConversation: () => void
  setUnreadCount: (count: number) => void
}

// Human-readable labels for tool names shown in the typing indicator
const TOOL_LABELS: Record<string, string> = {
  list_leads: 'Consultando leads...',
  create_lead: 'Registrando lead...',
  update_lead: 'Actualizando lead...',
  schedule_follow_up: 'Programando seguimiento...',
  list_follow_ups: 'Cargando seguimientos...',
  list_properties: 'Buscando propiedades...',
  get_property: 'Cargando propiedad...',
  create_campaign: 'Creando campaña...',
  list_campaigns: 'Cargando campañas...',
  get_campaign_performance: 'Obteniendo métricas...',
  publish_campaign: 'Publicando en Meta Ads...',
  pause_campaign: 'Pausando campaña...',
  generate_ad_content: 'Generando contenido...',
  search_locations: 'Buscando ubicaciones...',
  search_interests: 'Buscando audiencias...',
  check_meta_connection: 'Verificando Meta Ads...',
  create_google_campaign: 'Creando campaña Google...',
  list_google_campaigns: 'Cargando campañas Google...',
  get_google_campaign_performance: 'Obteniendo métricas Google...',
  publish_google_campaign: 'Publicando en Google Ads...',
  pause_google_campaign: 'Pausando campaña Google...',
  search_google_keywords: 'Buscando palabras clave...',
  search_google_locations: 'Buscando ubicaciones Google...',
  check_google_connection: 'Verificando Google Ads...',
  get_dashboard_summary: 'Analizando dashboard...',
}

export function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] ?? `Ejecutando ${toolName}...`
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export const useAssistantStore = create<AssistantState>((set, get) => ({
  isOpen: false,
  messages: [],
  conversationId: null,
  isLoading: false,
  toolStatus: null,
  currentPage: '/',
  unreadCount: 0,

  setOpen: (open) => {
    set({ isOpen: open })
    if (open) set({ unreadCount: 0 })
  },

  toggleOpen: () => {
    const { isOpen } = get()
    set({ isOpen: !isOpen })
    if (!isOpen) set({ unreadCount: 0 })
  },

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setLoading: (loading) => set({ isLoading: loading }),
  setConversationId: (id) => set({ conversationId: id }),
  setCurrentPage: (page) => set({ currentPage: page }),
  setUnreadCount: (count) => set({ unreadCount: count }),

  sendMessage: async (content: string) => {
    const { conversationId, currentPage, isOpen } = get()

    // Add user message immediately
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: new Date(),
    }
    set((state) => ({ messages: [...state.messages, userMessage], isLoading: true, toolStatus: null }))

    const streamingId = generateId()
    let assistantMessageAdded = false

    try {
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, conversationId, currentPage }),
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const contentType = response.headers.get('content-type') ?? ''

      // ── SSE streaming ──────────────────────────────────────────────────────
      if (contentType.includes('text/event-stream') && response.body) {
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() ?? ''

          for (const part of parts) {
            const line = part.trim()
            if (!line.startsWith('data: ')) continue

            try {
              const event = JSON.parse(line.slice(6))

              switch (event.type) {
                case 'tool_call':
                case 'tool_running':
                  set({ toolStatus: event.name, isLoading: true })
                  break

                case 'text_delta':
                  if (!assistantMessageAdded) {
                    // Create the assistant message bubble on first text
                    set((state) => ({
                      messages: [
                        ...state.messages,
                        {
                          id: streamingId,
                          role: 'assistant' as const,
                          content: event.content ?? '',
                          timestamp: new Date(),
                          isStreaming: true,
                        },
                      ],
                      isLoading: false,
                      toolStatus: null,
                    }))
                    assistantMessageAdded = true
                  } else {
                    set((state) => ({
                      messages: state.messages.map((m) =>
                        m.id === streamingId
                          ? { ...m, content: m.content + (event.content ?? '') }
                          : m,
                      ),
                    }))
                  }
                  break

                case 'done':
                  if (event.conversationId) set({ conversationId: event.conversationId })
                  // Finalize the message: clean response + actions, stop streaming cursor
                  set((state) => ({
                    messages: state.messages.map((m) =>
                      m.id === streamingId
                        ? {
                            ...m,
                            content: event.response ?? m.content,
                            actions: event.actions,
                            isStreaming: false,
                          }
                        : m,
                    ),
                    toolStatus: null,
                    isLoading: false,
                  }))
                  if (!isOpen) {
                    set((state) => ({ unreadCount: state.unreadCount + 1 }))
                  }
                  break

                case 'error':
                  if (!assistantMessageAdded) {
                    set((state) => ({
                      messages: [
                        ...state.messages,
                        {
                          id: streamingId,
                          role: 'assistant' as const,
                          content: 'Lo siento, hubo un error. Por favor intenta de nuevo.',
                          timestamp: new Date(),
                        },
                      ],
                      isLoading: false,
                      toolStatus: null,
                    }))
                    assistantMessageAdded = true
                  }
                  break
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }
      }
      // ── JSON fallback (legacy) ─────────────────────────────────────────────
      else {
        const data = await response.json()
        if (data.conversationId) set({ conversationId: data.conversationId })
        set((state) => ({
          messages: [
            ...state.messages,
            {
              id: generateId(),
              role: 'assistant' as const,
              content: data.response ?? data.message ?? data.content ?? 'Sin respuesta',
              timestamp: new Date(),
              actions: data.actions,
            },
          ],
          isLoading: false,
          toolStatus: null,
        }))
        if (!isOpen) set((state) => ({ unreadCount: state.unreadCount + 1 }))
      }
    } catch (error) {
      console.error('[assistant-store] sendMessage error:', error)
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: generateId(),
            role: 'assistant' as const,
            content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.',
            timestamp: new Date(),
          },
        ],
        isLoading: false,
        toolStatus: null,
      }))
    }
  },

  clearConversation: () =>
    set({
      messages: [],
      conversationId: null,
      isLoading: false,
      toolStatus: null,
      unreadCount: 0,
    }),
}))

