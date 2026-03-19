"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  X,
  Send,
  Loader2,
  Minimize2,
  Sparkles,
  MessageSquare,
  ChevronRight,
  UserPlus,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

const QUICK_ACTIONS = [
  { label: "¿Qué es Petunia AI?", message: "¿Qué es Petunia AI y para qué sirve?" },
  { label: "Ver planes y precios", message: "¿Cuáles son los planes y precios disponibles?" },
  { label: "¿Cómo funciona el CRM?", message: "¿Cómo funciona el CRM Pipeline?" },
  { label: "Video IA con Avatar", message: "¿Cómo funciona el Video IA con Avatar?" },
];

// Renders message text and turns /register mentions into clickable buttons
function renderContent(text: string, onRegister: () => void) {
  const parts = text.split(/(\/?register)/gi);
  return parts.map((part, i) =>
    /^\/?register$/i.test(part) ? (
      <button
        key={i}
        onClick={onRegister}
        className="underline font-bold cursor-pointer"
        style={{ color: "#c084fc" }}
      >
        /register
      </button>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function TypingDots() {
  return (
    <div className="flex items-start gap-2.5 mb-3">
      <div
        className="flex items-center justify-center size-7 rounded-full shrink-0"
        style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
      >
        <Image src="/logo-petunia.svg" alt="Petunia" width={16} height={16} style={{ filter: "brightness(2)" }} />
      </div>
      <div
        className="rounded-xl rounded-tl-sm px-4 py-3"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="flex items-center gap-1.5">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="size-1.5 rounded-full animate-bounce"
              style={{ background: "#a855f7", animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg, onRegister }: { msg: Message; onRegister: () => void }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex mb-3 ${isUser ? "justify-end" : "items-start gap-2.5"}`}>
      {!isUser && (
        <div
          className="flex items-center justify-center size-7 rounded-full shrink-0 mt-0.5"
          style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
        >
          <Image src="/logo-petunia.svg" alt="Petunia" width={16} height={16} style={{ filter: "brightness(2)" }} />
        </div>
      )}
      <div
        className="rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words max-w-[85%]"
        style={
          isUser
            ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", borderRadius: "12px 12px 4px 12px" }
            : { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.9)", borderRadius: "4px 12px 12px 12px" }
        }
      >
        {isUser ? msg.content : renderContent(msg.content, onRegister)}
        {msg.isStreaming && (
          <span
            className="inline-block w-0.5 h-3.5 ml-0.5 -mb-0.5 animate-pulse"
            style={{ background: "rgba(255,255,255,0.6)" }}
          />
        )}
      </div>
    </div>
  );
}

export function SalesChat() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const goToRegister = useCallback(() => {
    setIsOpen(false);
    router.push("/register");
  }, [router]);

  // Show proactive bubble after 4 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(true), 4000);
    return () => clearTimeout(t);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Build history for API (exclude streaming flags)
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", isStreaming: true },
    ]);

    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!res.ok || !res.body) throw new Error("Error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: accumulated } : m
                  )
                );
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }

      // Mark as done streaming
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Lo siento, hubo un error. Por favor intenta de nuevo.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const handleSend = useCallback(() => {
    const val = inputRef.current?.value.trim();
    if (!val) return;
    inputRef.current!.value = "";
    sendMessage(val);
  }, [sendMessage]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    },
    [handleSend]
  );

  const open = () => { setIsOpen(true); setShowBubble(false); };
  const showQuickActions = messages.length === 0 && !isLoading;

  return (
    <>
      {/* ── Floating button ─────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
        {/* Proactive bubble */}
        {!isOpen && showBubble && (
          <div
            className="max-w-[220px] rounded-2xl px-4 py-3 shadow-2xl cursor-pointer"
            style={{
              background: "rgba(15,5,30,0.95)",
              border: "1px solid rgba(168,85,247,0.3)",
              boxShadow: "0 8px 32px rgba(124,58,237,0.25)",
            }}
            onClick={open}
          >
            <p className="text-xs leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>
              <Sparkles className="size-3 inline mr-1 -mt-0.5" style={{ color: "#a855f7" }} />
              ¡Hola! ¿Te ayudo a encontrar el plan ideal para ti?
            </p>
          </div>
        )}

        {/* Button */}
        <button
          onClick={() => (isOpen ? setIsOpen(false) : open())}
          className="relative flex items-center justify-center size-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#a855f7)",
            boxShadow: "0 8px 32px rgba(124,58,237,0.5)",
          }}
          aria-label={isOpen ? "Cerrar chat" : "Abrir chat de ventas"}
        >
          {isOpen ? (
            <X className="size-6 text-white" />
          ) : (
            <Image src="/logo-petunia.svg" alt="Petunia" width={28} height={28} style={{ filter: "brightness(2)" }} />
          )}
          {/* Pulse ring */}
          {!isOpen && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-25 pointer-events-none"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
            />
          )}
        </button>
      </div>

      {/* ── Chat panel ──────────────────────────────────────── */}
      <div
        className="fixed bottom-24 right-6 z-[9998] flex flex-col overflow-hidden rounded-2xl"
        style={{
          width: 380,
          height: 560,
          background: "rgba(8,2,26,0.97)",
          border: "1px solid rgba(168,85,247,0.2)",
          boxShadow: "0 24px 80px rgba(124,58,237,0.3)",
          backdropFilter: "blur(20px)",
          transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          transformOrigin: "bottom right",
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? "scale(1) translateY(0)" : "scale(0.9) translateY(16px)",
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex items-center justify-center size-8 rounded-lg p-1"
              style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}
            >
              <Image src="/logo-petunia.svg" alt="Petunia" width={20} height={20} style={{ filter: "brightness(2)" }} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white leading-none">Petunia</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Agente de ventas · En línea</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center size-7 rounded-lg transition-colors cursor-pointer"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Minimize2 className="size-3.5" />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(168,85,247,0.3) transparent" }}
        >
          {/* Welcome / quick actions */}
          {showQuickActions && (
            <div className="flex flex-col items-center text-center px-2 py-4">
              <div
                className="flex items-center justify-center size-16 rounded-2xl mb-4 p-2"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", boxShadow: "0 12px 32px rgba(124,58,237,0.4)" }}
              >
                <Image src="/logo-petunia.svg" alt="Petunia" width={40} height={40} style={{ filter: "brightness(2)" }} />
              </div>
              <h4 className="text-base font-bold text-white mb-1">¡Hola! Soy Petunia 👋</h4>
              <p className="text-xs mb-6 leading-relaxed max-w-[260px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                Tu asistente de ventas. Estoy aquí para ayudarte a conocer la plataforma y encontrar el plan perfecto para ti.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[280px]">
                {QUICK_ACTIONS.map((qa) => (
                  <button
                    key={qa.label}
                    onClick={() => sendMessage(qa.message)}
                    disabled={isLoading}
                    className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl text-left text-sm transition-all duration-200 cursor-pointer"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(168,85,247,0.2)",
                      color: "rgba(255,255,255,0.75)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(168,85,247,0.12)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(168,85,247,0.4)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(168,85,247,0.2)";
                    }}
                  >
                    <span>{qa.label}</span>
                    <ChevronRight className="size-3.5 shrink-0" style={{ color: "rgba(168,85,247,0.6)" }} />
                  </button>
                ))}
              </div>
              <button
                onClick={goToRegister}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 cursor-pointer"
                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", boxShadow: "0 4px 16px rgba(124,58,237,0.4)" }}
              >
                <Sparkles className="size-3" />
                Comenzar gratis
              </button>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} onRegister={goToRegister} />
          ))}

          {/* Typing indicator */}
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && <TypingDots />}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-3 pb-3 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-1.5 transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(168,85,247,0.2)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.5)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(168,85,247,0.2)")}
          >
            <MessageSquare className="size-4 shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Pregúntame lo que quieras..."
              className="flex-1 bg-transparent text-sm outline-none py-1.5"
              style={{ color: "rgba(255,255,255,0.85)", caretColor: "#a855f7" }}
              onKeyDown={handleKey}
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="flex items-center justify-center size-8 rounded-lg transition-all duration-200 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "rgba(168,85,247,0.2)", color: "#a855f7" }}
              onMouseEnter={(e) => !isLoading && ((e.currentTarget.style.background = "linear-gradient(135deg,#7c3aed,#a855f7)"), (e.currentTarget.style.color = "#fff"))}
              onMouseLeave={(e) => ((e.currentTarget.style.background = "rgba(168,85,247,0.2)"), (e.currentTarget.style.color = "#a855f7"))}
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          {/* Persistent CTA */}
          <button
            onClick={goToRegister}
            className="mt-2 w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(124,58,237,0.35)",
            }}
          >
            <UserPlus className="size-3.5" />
            Crear mi cuenta gratis
          </button>
        </div>
      </div>
    </>
  );
}
