"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { conversationsApi } from "@/lib/api";
import { timeAgo } from "@/lib/utils";
import { AgentBadge } from "@/components/ui/badge";
import { Send, Bot, User, ArrowLeft, UserCheck, BotOff, Loader2, Info } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3 animate-fade-in">
      <div className="w-7 h-7 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center flex-shrink-0">
        <Bot size={13} className="text-violet-600" />
      </div>
      <div className="bubble-ai px-4 py-3">
        <div className="flex gap-1 items-center h-4">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conv, isLoading } = useQuery({
    queryKey: ["conversation", params.id],
    queryFn: () => conversationsApi.get(params.id).then((r) => r.data),
    refetchInterval: 8_000,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      conversationsApi.sendMessage(params.id, content),
    onMutate: () => setIsAiTyping(true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation", params.id] });
      setInput("");
      setIsAiTyping(false);
      // Resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    onError: () => {
      setIsAiTyping(false);
      toast.error("Error al enviar mensaje");
    },
  });

  const takeoverMutation = useMutation({
    mutationFn: () => conversationsApi.takeover(params.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation", params.id] });
      toast.success("Ahora estás respondiendo manualmente");
    },
  });

  const releaseMutation = useMutation({
    mutationFn: () => conversationsApi.release(params.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversation", params.id] });
      toast.success("Control devuelto a los agentes de IA");
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conv?.messages, isAiTyping]);

  useEffect(() => {
    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000"}/api/conversations/ws/${params.id}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = () => qc.invalidateQueries({ queryKey: ["conversation", params.id] });
    return () => ws.close();
  }, [params.id, qc]);

  const handleSend = () => {
    const content = input.trim();
    if (!content || sendMutation.isPending) return;
    sendMutation.mutate(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  const messages = conv?.messages ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 size={28} className="animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">Cargando conversación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[hsl(0,0%,98%)]">

      {/* ── Top bar ── */}
      <div className="flex items-center gap-4 px-6 py-4 bg-white border-b border-border"
        style={{ boxShadow: "var(--shadow-xs)" }}
      >
        <Link
          href="/conversations"
          className="btn-ghost p-2 -ml-2"
        >
          <ArrowLeft size={17} />
        </Link>

        <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center text-base flex-shrink-0">
          {{ whatsapp: "💬", instagram: "📸", webchat: "🌐" }[conv?.channel] ?? "💬"}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground font-mono">
              #{params.id.slice(0, 8)}
            </span>
            <AgentBadge agent={conv?.current_agent ?? "qualifier"} />
            {conv?.is_human_takeover && (
              <span className="badge badge-orange text-[10px]">
                👤 {conv.human_agent_name}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {messages.length} mensajes · {conv?.channel ?? "webchat"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {conv?.is_human_takeover ? (
            <button
              onClick={() => releaseMutation.mutate()}
              disabled={releaseMutation.isPending}
              className="btn-secondary text-xs py-1.5 px-3 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <BotOff size={13} />
              Volver a IA
            </button>
          ) : (
            <button
              onClick={() => takeoverMutation.mutate()}
              disabled={takeoverMutation.isPending}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              <UserCheck size={13} />
              Tomar control
            </button>
          )}
        </div>
      </div>

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-2xl mx-auto space-y-1">

          {messages.length === 0 && !isAiTyping && (
            <div className="text-center py-20">
              <div className="w-14 h-14 bg-violet-50 border border-violet-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bot size={24} className="text-violet-400" />
              </div>
              <p className="font-medium text-foreground">Conversación lista</p>
              <p className="text-sm text-muted-foreground mt-1">
                Escribe un mensaje para simular un cliente y ver al agente responder
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg: Record<string, unknown>) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id as string}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                  className={`flex items-end gap-2.5 mb-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <div className={`
                    w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold
                    ${isUser
                      ? "bg-slate-200 text-slate-500"
                      : "bg-violet-100 border border-violet-200 text-violet-600"
                    }
                  `}>
                    {isUser ? <User size={13} /> : <Bot size={13} />}
                  </div>

                  <div className={`max-w-[72%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                    {!isUser && msg.agent_type && (
                      <p className="text-[10px] text-muted-foreground mb-1 ml-1 font-medium">
                        Agente · <span className="capitalize">{msg.agent_type as string}</span>
                      </p>
                    )}
                    <div className={isUser ? "bubble-user" : "bubble-ai"}>
                      {msg.content as string}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 mx-1">
                      {timeAgo(msg.created_at as string)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isAiTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input bar ── */}
      <div className="bg-white border-t border-border px-6 py-4"
        style={{ boxShadow: "0 -1px 3px 0 rgb(0 0 0 / 0.04)" }}
      >
        {conv?.is_human_takeover && (
          <div className="flex items-center gap-2 mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg max-w-2xl mx-auto">
            <Info size={12} />
            Modo humano activo — tú respondes, los agentes de IA están pausados
          </div>
        )}

        <div className="max-w-2xl mx-auto flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleTextareaInput}
            onKeyDown={handleKeyDown}
            placeholder={
              conv?.is_human_takeover
                ? "Escribe tu respuesta..."
                : "Simula un mensaje del cliente... (Enter para enviar)"
            }
            rows={1}
            className="input-stripe flex-1 resize-none overflow-hidden"
            style={{ minHeight: "44px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="btn-primary flex-shrink-0 w-11 h-11 p-0 rounded-xl disabled:opacity-40"
          >
            {sendMutation.isPending
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
      </div>
    </div>
  );
}
