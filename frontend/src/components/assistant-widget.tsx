"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { assistantApi } from "@/lib/api";
import { X, Send, Sparkles, RotateCcw } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED = [
  "¿Cómo conecto WhatsApp?",
  "¿Cómo agrego una propiedad?",
  "¿Cómo programo un post?",
  "¿Qué canales soporta Petunia?",
];

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const newMessages: Message[] = [...messages, { role: "user", content }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await assistantApi.chat(newMessages);
      setMessages([...newMessages, { role: "assistant", content: res.data.reply }]);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      let msg = "Lo siento, ocurrió un error. Intenta de nuevo en un momento.";
      if (status === 503 || detail?.includes("no disponible")) {
        msg = "El asistente no está disponible en este momento. Contacta a soporte si el problema persiste.";
      } else if (status === 401) {
        msg = "Tu sesión expiró. Recarga la página e inicia sesión nuevamente.";
      }
      setMessages([...newMessages, { role: "assistant", content: msg }]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMessages([]);
    setInput("");
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, #7C3AED, #A855F7)",
          boxShadow: "0 4px 24px rgba(124,58,237,0.45)",
        }}
        aria-label="Abrir asistente Petunia"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <X size={22} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }}>
              <Sparkles size={22} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] flex flex-col rounded-2xl overflow-hidden"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(124,58,237,0.12)",
              maxHeight: "520px",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7C3AED, #A855F7)" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">Petunia IA</p>
                  <p className="text-white/70 text-[11px]">Asistente de ayuda</p>
                </div>
              </div>
              <button
                onClick={reset}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                title="Nueva conversación"
              >
                <RotateCcw size={14} className="text-white/80" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto bg-gray-50 px-3 py-3 space-y-3" style={{ minHeight: 200 }}>
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 text-center pt-2">
                    Hola 👋 Soy tu asistente. ¿En qué puedo ayudarte hoy?
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {SUGGESTED.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="text-left px-3 py-2 bg-white rounded-xl border border-gray-200 text-xs text-gray-700 hover:border-violet-300 hover:bg-violet-50 transition-colors shadow-sm"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div className="w-6 h-6 rounded-full flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center"
                        style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)" }}>
                        <Sparkles size={11} className="text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-violet-600 text-white rounded-br-sm"
                          : "bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex justify-start items-end gap-2">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)" }}>
                    <Sparkles size={11} className="text-white" />
                  </div>
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 bg-violet-400 rounded-full block"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="bg-white border-t border-gray-100 px-3 py-2.5 flex gap-2 flex-shrink-0">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Escribe tu pregunta..."
                className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-violet-400 focus:bg-white transition-colors"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#7C3AED,#A855F7)" }}
              >
                <Send size={13} className="text-white" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
