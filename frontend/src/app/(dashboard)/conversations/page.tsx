"use client";

import { useState, useEffect, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { conversationsApi } from "@/lib/api";
import { timeAgo, cn } from "@/lib/utils";
import { AgentBadge, ChannelBadge } from "@/components/ui/badge";
import { ConversationItemSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { MessageSquare, Plus, Search, Filter, CircleDot } from "lucide-react";
import {
  ChatCircle, Camera, GlobeHemisphereWest, EnvelopeSimple,
  FacebookLogo, LinkedinLogo, MusicNote,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import Link from "next/link";

function ConversationsInner() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [filterChannel, setFilterChannel] = useState(searchParams.get("channel") ?? "");
  const [filterStatus, setFilterStatus] = useState("");

  // Sync when navigating from sidebar channel links
  useEffect(() => {
    const ch = searchParams.get("channel") ?? "";
    setFilterChannel(ch);
  }, [searchParams]);

  const { data: convs = [], isLoading } = useQuery({
    queryKey: ["conversations", filterChannel, filterStatus],
    queryFn: () =>
      conversationsApi.list({
        channel: filterChannel || undefined,
        status: filterStatus || undefined,
        limit: 100,
      }).then((r) => r.data),
    refetchInterval: 10_000,
  });

  const startMutation = useMutation({
    mutationFn: () => conversationsApi.start("webchat"),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      const id = res.data?.conversation_id ?? res.data?.id;
      if (id) {
        toast.success("Conversación iniciada");
        router.push(`/conversations/${id}`);
      } else {
        toast.error("No se pudo obtener el ID de la conversación");
      }
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } } };
      toast.error(e?.response?.data?.detail || "Error al crear la conversación");
    },
  });

  const filtered = convs.filter((c: Record<string, unknown>) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (c.id as string).includes(s) ||
      (c.channel as string).includes(s) ||
      (c.current_agent as string).includes(s)
    );
  });

  const activeCount = convs.filter((c: Record<string, unknown>) => c.status === "active").length;

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <PageHeader
        title="Conversaciones"
        subtitle={`${convs.length} totales · ${activeCount} activas`}
        icon={<MessageSquare size={28} />}
        badge={
          <div className="flex items-center gap-1.5">
            <CircleDot size={10} className="text-emerald-300 animate-pulse" />
            <span className="text-white/60 text-xs font-medium">En vivo</span>
          </div>
        }
      >
        <button
          onClick={() => startMutation.mutate()}
          disabled={startMutation.isPending}
          className="btn-primary"
        >
          <Plus size={15} />
          Nueva conversación
        </button>
      </PageHeader>

      {/* ── Filters bar ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por ID, canal, agente..."
            className="input-stripe pl-9 w-72"
          />
        </div>

        <select
          value={filterChannel}
          onChange={(e) => setFilterChannel(e.target.value)}
          className="input-stripe w-auto pr-8"
        >
          <option value="">Todos los canales</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="webchat">Webchat</option>
          <option value="instagram">Instagram</option>
          <option value="messenger">Messenger</option>
          <option value="linkedin">LinkedIn</option>
          <option value="tiktok">TikTok</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-stripe w-auto pr-8"
        >
          <option value="">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="waiting">En espera</option>
          <option value="resolved">Resueltas</option>
          <option value="escalated">Escaladas</option>
        </select>

        {(filterChannel || filterStatus || search) && (
          <button
            onClick={() => { setSearch(""); setFilterChannel(""); setFilterStatus(""); }}
            className="btn-ghost text-xs"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* ── List ── */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <ConversationItemSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={24} className="text-muted-foreground/40" />
          </div>
          <p className="font-medium text-foreground">Sin conversaciones</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || filterChannel ? "Prueba con otros filtros" : "Inicia una nueva o espera mensajes entrantes"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((conv: Record<string, unknown>, i: number) => (
            <motion.div
              key={conv.id as string}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                href={`/conversations/${conv.id}`}
                className="flex items-center gap-4 p-4 bg-white border border-border rounded-2xl hover:border-primary/30 hover:shadow-sm transition-all group"
                style={{ boxShadow: "var(--shadow-xs)" }}
              >
                {/* Channel icon */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                  style={{
                    background: ({
                      whatsapp: "linear-gradient(135deg,#10B981,#059669)",
                      instagram: "linear-gradient(135deg,#EC4899,#BE185D)",
                      webchat:   "linear-gradient(135deg,#6366F1,#4F46E5)",
                      email:     "linear-gradient(135deg,#0EA5E9,#0284C7)",
                      messenger: "linear-gradient(135deg,#3B82F6,#2563EB)",
                      linkedin:  "linear-gradient(135deg,#0A66C2,#004182)",
                      tiktok:    "linear-gradient(135deg,#111827,#374151)",
                    } as Record<string,string>)[conv.channel as string] ?? "linear-gradient(135deg,#7C3AED,#6D28D9)"
                  }}>
                  {({
                    whatsapp: <ChatCircle size={20} weight="duotone" />,
                    instagram: <Camera size={20} weight="duotone" />,
                    webchat:   <GlobeHemisphereWest size={20} weight="duotone" />,
                    email:     <EnvelopeSimple size={20} weight="duotone" />,
                    messenger: <FacebookLogo size={20} weight="duotone" />,
                    linkedin:  <LinkedinLogo size={20} weight="duotone" />,
                    tiktok:    <MusicNote size={20} weight="duotone" />,
                  } as Record<string, React.ReactNode>)[conv.channel as string] ?? <ChatCircle size={20} weight="duotone" />}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-foreground">
                      {(() => {
                        const n = conv.lead_name as string
                        if (n && !/^\d+$/.test(n)) return n
                        return `#${(conv.id as string).slice(0, 8)}`
                      })()}
                    </span>
                    {!!conv.is_human_takeover && (
                      <span className="badge badge-orange text-[10px]">
                        👤 Humano activo
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <AgentBadge agent={conv.current_agent as string} />
                    <span className="text-xs text-muted-foreground">·</span>
                    <ChannelBadge channel={conv.channel as string} />
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {conv.message_count as number} mensajes
                    </span>
                  </div>
                </div>

                {/* Status + time */}
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="flex items-center gap-1.5 justify-end mb-1">
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      conv.status === "active"   && "bg-green-500",
                      conv.status === "waiting"  && "bg-yellow-500",
                      conv.status === "resolved" && "bg-gray-300",
                      conv.status === "escalated"&& "bg-red-500",
                    )} />
                    <span className="text-xs text-muted-foreground capitalize font-medium">
                      {conv.status as string}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {conv.last_message_at ? timeAgo(conv.last_message_at as string) : "Nuevo"}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense>
      <ConversationsInner />
    </Suspense>
  );
}
