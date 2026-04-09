"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { leadsApi } from "@/lib/api";
import { timeAgo, getScoreColor, formatScore, cn } from "@/lib/utils";
import { StageBadge, ChannelBadge } from "@/components/ui/badge";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { PageHeader } from "@/components/ui/page-header";
import {
  Users, Search, TrendingUp, Phone, Mail,
  Building2, Star, Zap,
} from "lucide-react";
import { motion } from "framer-motion";

export default function LeadsPage() {
  const [filterStage, setFilterStage] = useState("");
  const [search, setSearch] = useState("");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads", filterStage],
    queryFn: () => leadsApi.list({ stage: filterStage || undefined, limit: 200 }).then((r) => r.data),
    refetchInterval: 20_000,
  });

  const filtered = (leads as Record<string, unknown>[]).filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      ((l.name as string) ?? "").toLowerCase().includes(s) ||
      ((l.email as string) ?? "").toLowerCase().includes(s) ||
      ((l.company as string) ?? "").toLowerCase().includes(s) ||
      ((l.phone as string) ?? "").toLowerCase().includes(s)
    );
  });

  const qualified = (leads as Record<string, unknown>[]).filter((l) => (l.qualification_score as number) >= 7).length;
  const nurturing  = (leads as Record<string, unknown>[]).filter((l) => l.stage === "nurturing").length;
  const won        = (leads as Record<string, unknown>[]).filter((l) => l.stage === "closed_won").length;

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <PageHeader title="Leads" subtitle="Pipeline de ventas gestionado por IA" />

      {/* ── Mini KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total leads"    value={leads.length}
          icon={Users}           iconBg="bg-violet-50" iconColor="text-violet-600" delay={0}
        />
        <StatCard
          title="Calificados"   value={qualified}
          subtitle="Score ≥ 7"
          icon={Star}            iconBg="bg-green-50"  iconColor="text-green-600"  delay={0.05}
        />
        <StatCard
          title="Nurturing"     value={nurturing}
          icon={Zap}             iconBg="bg-amber-50"  iconColor="text-amber-600"  delay={0.1}
        />
        <StatCard
          title="Ganados"       value={won}
          icon={TrendingUp}      iconBg="bg-blue-50"   iconColor="text-blue-600"   delay={0.15}
        />
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar leads..."
            className="input-stripe pl-9 w-64"
          />
        </div>

        <select
          value={filterStage}
          onChange={(e) => setFilterStage(e.target.value)}
          className="input-stripe w-auto"
        >
          <option value="">Todas las etapas</option>
          {[
            ["new","Nuevo"], ["qualifying","Calificando"], ["qualified","Calificado"],
            ["nurturing","Nurturing"], ["demo_scheduled","Demo agendada"],
            ["proposal_sent","Propuesta enviada"], ["negotiating","Negociando"],
            ["closed_won","Ganado"], ["closed_lost","Perdido"],
          ].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        {(search || filterStage) && (
          <button
            onClick={() => { setSearch(""); setFilterStage(""); }}
            className="btn-ghost text-xs"
          >
            Limpiar
          </button>
        )}

        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="card-stripe overflow-hidden">
        <table className="table-stripe">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Empresa</th>
              <th>Etapa</th>
              <th>Score BANT</th>
              <th>Fuente</th>
              <th>Último contacto</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={6} />
            ))}

            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-16 text-center text-muted-foreground">
                  <Users size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="font-medium">Sin leads</p>
                  <p className="text-xs mt-1">
                    {search || filterStage ? "Prueba con otros filtros" : "Los leads aparecerán cuando alguien interactúe con tus agentes"}
                  </p>
                </td>
              </tr>
            )}

            {!isLoading && filtered.map((lead: Record<string, unknown>, i: number) => (
              <motion.tr
                key={lead.id as string}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.025 }}
              >
                {/* Lead info */}
                <td>
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {(lead.name as string) || <span className="text-muted-foreground italic">Sin nombre</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {lead.email && (
                        <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                          <Mail size={10} />
                          {lead.email as string}
                        </a>
                      )}
                      {lead.phone && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Phone size={10} />
                          {lead.phone as string}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Empresa */}
                <td>
                  <div className="flex items-center gap-1.5 text-sm text-foreground">
                    {lead.company && <Building2 size={13} className="text-muted-foreground flex-shrink-0" />}
                    <span>{(lead.company as string) || <span className="text-muted-foreground">—</span>}</span>
                  </div>
                  {lead.position && (
                    <p className="text-xs text-muted-foreground mt-0.5">{lead.position as string}</p>
                  )}
                </td>

                {/* Stage */}
                <td><StageBadge stage={lead.stage as string} /></td>

                {/* Score */}
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          (lead.qualification_score as number) >= 7 ? "bg-green-500" :
                          (lead.qualification_score as number) >= 4 ? "bg-yellow-500" : "bg-red-400"
                        )}
                        style={{ width: `${((lead.qualification_score as number) / 10) * 100}%` }}
                      />
                    </div>
                    <span className={cn(
                      "text-sm font-bold tabular-nums",
                      getScoreColor(lead.qualification_score as number)
                    )}>
                      {formatScore(lead.qualification_score as number)}
                    </span>
                  </div>
                </td>

                {/* Fuente */}
                <td><ChannelBadge channel={lead.source as string} /></td>

                {/* Último contacto */}
                <td className="text-xs text-muted-foreground">
                  {lead.last_contacted_at ? timeAgo(lead.last_contacted_at as string) : "—"}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
