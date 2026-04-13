"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

// El widget usa su propio API_URL apuntando al backend directamente.
// NEXT_PUBLIC_BACKEND_API_URL se puede sobreescribir; si no existe, usa el proxy del frontend.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function WidgetChat() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get("business_id") ?? "";
  const primaryColor = searchParams.get("color") ?? "#635bff";
  const agentName = searchParams.get("name") ?? "Asistente";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: "", email: "" });
  const [step, setStep] = useState<"form" | "chat">("form");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startConversation = async () => {
    if (!userInfo.name.trim()) return;
    try {
      const res = await fetch(`${API_URL}/widget/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          lead_name: userInfo.name.trim(),
          lead_email: userInfo.email.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConversationId(data.conversation_id);
      setStep("chat");
      setMessages([{
        id: "welcome",
        role: "assistant",
        content: `¡Hola ${userInfo.name}! 👋 Soy ${agentName}. ¿En qué puedo ayudarte hoy?`,
        createdAt: new Date(),
      }]);
    } catch (err) {
      console.error("Error iniciando conversación:", err);
    }
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || loading || !conversationId) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    try {
      const res = await fetch(`${API_URL}/widget/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, business_id: businessId, content }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, {
        id: Date.now().toString() + "-ai",
        role: "assistant",
        content: data.response,
        createdAt: new Date(),
      }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: "err",
        role: "assistant",
        content: "Lo siento, hubo un error. Intenta de nuevo.",
        createdAt: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 96) + "px";
  };

  const timeStr = (d: Date) => d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex flex-col h-screen w-full bg-white font-sans text-[14px]">

      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3.5 text-white flex-shrink-0"
        style={{ background: primaryColor }}
      >
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg flex-shrink-0">
          🤖
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm leading-tight">{agentName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            <p className="text-xs text-white/80">En línea · Responde al instante</p>
          </div>
        </div>
      </div>

      {/* Form step */}
      {step === "form" && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-5 shadow-lg"
            style={{ background: primaryColor + "20", border: `2px solid ${primaryColor}30` }}
          >
            👋
          </div>
          <h2 className="text-lg font-bold text-gray-900 text-center mb-1">¡Bienvenido!</h2>
          <p className="text-sm text-gray-500 text-center mb-6 leading-relaxed">
            Dinos tu nombre para comenzar la conversación
          </p>

          <div className="w-full space-y-3">
            <input
              type="text"
              value={userInfo.name}
              onChange={(e) => setUserInfo({ ...userInfo, name: e.target.value })}
              placeholder="Tu nombre"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
              onKeyDown={(e) => e.key === "Enter" && startConversation()}
            />
            <input
              type="email"
              value={userInfo.email}
              onChange={(e) => setUserInfo({ ...userInfo, email: e.target.value })}
              placeholder="Tu email (opcional)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition"
            />
            <button
              onClick={startConversation}
              disabled={!userInfo.name.trim()}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-40"
              style={{ background: primaryColor }}
            >
              Comenzar chat
            </button>
          </div>
        </div>
      )}

      {/* Chat step */}
      {step === "chat" && (
        <>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 text-white"
                    style={{ background: primaryColor }}
                  >
                    🤖
                  </div>
                )}
                <div className={`max-w-[80%] flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                    style={msg.role === "user" ? { background: primaryColor } : {}}
                  >
                    {msg.content}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 mx-1">
                    {timeStr(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-end gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm text-white flex-shrink-0"
                  style={{ background: primaryColor }}
                >
                  🤖
                </div>
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 0.2, 0.4].map((delay, i) => (
                      <span
                        key={i}
                        className="w-2 h-2 rounded-full bg-gray-400"
                        style={{ animation: `bounce-typing 1.4s ${delay}s ease-in-out infinite` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-gray-100 flex items-end gap-2 flex-shrink-0">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKey}
              placeholder="Escribe un mensaje..."
              rows={1}
              className="flex-1 resize-none px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition overflow-hidden"
              style={{ minHeight: "42px", maxHeight: "96px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition disabled:opacity-30 flex-shrink-0"
              style={{ background: primaryColor }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          <p className="text-center text-[10px] text-gray-400 py-1.5 flex-shrink-0">
            Powered by Agente Ventas AI · Claude claude-sonnet-4-6
          </p>
        </>
      )}

      <style>{`
        @keyframes bounce-typing {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

export default function WidgetPage() {
  return (
    <Suspense fallback={<div className="h-screen w-full bg-white flex items-center justify-center text-sm text-gray-400">Cargando...</div>}>
      <WidgetChat />
    </Suspense>
  );
}
