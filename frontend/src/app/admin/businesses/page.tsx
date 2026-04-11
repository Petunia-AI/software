"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { PageHeader } from "@/components/ui/page-header";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Building2, MessageSquare, Users, Power } from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AdminBusinessesPage() {
  const qc = useQueryClient();

  const { data: businesses = [], isLoading } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: () => adminApi.businesses().then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleBiz(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-businesses"] });
      toast.success("Estado actualizado");
    },
  });

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <PageHeader
        title="Negocios"
        subtitle={`${businesses.length} negocios registrados en la plataforma`}
      />

      <div className="card-stripe overflow-hidden">
        <table className="table-stripe">
          <thead>
            <tr>
              <th>Negocio</th>
              <th>Industria</th>
              <th className="text-center">Conversaciones</th>
              <th className="text-center">Leads</th>
              <th className="text-center">Usuarios</th>
              <th className="text-center">Canales</th>
              <th>Registro</th>
              <th className="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <TableRowSkeleton key={i} cols={8} />
            ))}

            {!isLoading && businesses.length === 0 && (
              <tr>
                <td colSpan={8} className="py-16 text-center text-muted-foreground">
                  <Building2 size={28} className="mx-auto mb-2 opacity-20" />
                  <p>Sin negocios registrados</p>
                </td>
              </tr>
            )}

            {(businesses as Record<string, unknown>[]).map((biz, i) => (
              <motion.tr
                key={biz.id as string}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-violet-50 border border-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 size={14} className="text-violet-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{biz.name as string}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{(biz.id as string).slice(0, 12)}…</p>
                    </div>
                  </div>
                </td>
                <td className="text-sm text-muted-foreground">{(biz.industry as string) || "—"}</td>
                <td className="text-center">
                  <span className="font-semibold text-foreground tabular-nums">{biz.conversations as number}</span>
                </td>
                <td className="text-center">
                  <span className="font-semibold text-foreground tabular-nums">{biz.leads as number}</span>
                </td>
                <td className="text-center">
                  <span className="font-semibold text-foreground tabular-nums">{biz.users as number}</span>
                </td>
                <td className="text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {!!biz.whatsapp_enabled && <span title="WhatsApp" className="text-base">💬</span>}
                    <span title="Webchat" className="text-base">🌐</span>
                  </div>
                </td>
                <td className="text-xs text-muted-foreground">
                  {formatDate(biz.created_at as string)}
                </td>
                <td className="text-center">
                  <button
                    onClick={() => toggleMutation.mutate(biz.id as string)}
                    disabled={toggleMutation.isPending}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mx-auto transition-colors",
                      biz.is_active
                        ? "bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        : "bg-red-50 text-red-700 border border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                    )}
                    title={biz.is_active ? "Click para desactivar" : "Click para activar"}
                  >
                    <Power size={11} />
                    {biz.is_active ? "Activo" : "Inactivo"}
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
