"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin-api";
import { PageHeader } from "@/components/ui/page-header";
import { TableRowSkeleton } from "@/components/ui/skeleton";
import { formatDate, cn } from "@/lib/utils";
import { Users, Plus, Power, ShieldCheck, X } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", is_superuser: false });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.users().then((r) => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi.toggleUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Estado actualizado"); },
  });

  const createMutation = useMutation({
    mutationFn: () => adminApi.createUser(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Usuario creado");
      setShowCreate(false);
      setForm({ email: "", password: "", full_name: "", is_superuser: false });
    },
    onError: () => toast.error("Error al crear usuario"),
  });

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <PageHeader title="Usuarios" subtitle={`${users.length} usuarios en la plataforma`}>
        <button onClick={() => setShowCreate(true)} className="btn-primary text-sm">
          <Plus size={14} />
          Nuevo usuario
        </button>
      </PageHeader>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl p-7 w-full max-w-md shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-foreground">Crear nuevo usuario</h3>
                <button onClick={() => setShowCreate(false)} className="btn-ghost p-1.5">
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Nombre completo</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="input-stripe"
                    placeholder="María González"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-stripe"
                    placeholder="maria@empresa.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="input-stripe"
                    placeholder="••••••••"
                  />
                </div>
                <div className="flex items-center gap-3 p-3.5 bg-secondary/60 rounded-xl">
                  <input
                    type="checkbox"
                    id="is_superuser"
                    checked={form.is_superuser}
                    onChange={(e) => setForm({ ...form, is_superuser: e.target.checked })}
                    className="w-4 h-4 accent-violet-600"
                  />
                  <label htmlFor="is_superuser" className="text-sm font-medium text-foreground cursor-pointer">
                    Super Admin
                  </label>
                  <span className="text-xs text-muted-foreground">Acceso total a la plataforma</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => createMutation.mutate()}
                  disabled={createMutation.isPending || !form.email || !form.password || !form.full_name}
                  className="btn-primary flex-1 py-2.5"
                >
                  {createMutation.isPending ? "Creando..." : "Crear usuario"}
                </button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary px-5">
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="card-stripe overflow-hidden">
        <table className="table-stripe">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Registro</th>
              <th className="text-center">Estado</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}

            {!isLoading && (users as Record<string, unknown>[]).map((user, i) => (
              <motion.tr
                key={user.id as string}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
              >
                <td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(user.full_name as string)?.[0]?.toUpperCase() ?? "U"}
                    </div>
                    <p className="font-medium text-sm text-foreground">{user.full_name as string}</p>
                  </div>
                </td>
                <td className="text-sm text-muted-foreground">{user.email as string}</td>
                <td>
                  {user.is_superuser ? (
                    <span className="badge badge-red flex items-center gap-1 w-fit">
                      <ShieldCheck size={10} /> Super Admin
                    </span>
                  ) : (
                    <span className="badge badge-gray">Usuario</span>
                  )}
                </td>
                <td className="text-xs text-muted-foreground">
                  {formatDate(user.created_at as string)}
                </td>
                <td className="text-center">
                  <button
                    onClick={() => toggleMutation.mutate(user.id as string)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium mx-auto transition-colors",
                      user.is_active
                        ? "bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        : "bg-red-50 text-red-700 border border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                    )}
                  >
                    <Power size={11} />
                    {user.is_active ? "Activo" : "Inactivo"}
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
