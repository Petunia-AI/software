"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/store/admin-auth";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAdminAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si ya está autenticado como admin, redirigir
  if (isAuthenticated) {
    router.replace("/admin");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      router.push("/admin");
    } catch {
      setError("Credenciales incorrectas o no tienes permisos de Super Admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-xl">
            <ShieldCheck size={26} className="text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-white font-bold text-xl">Super Admin</h1>
            <p className="text-white/40 text-sm mt-0.5">Agente Ventas AI</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="admin@agenteventas.ai"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-red-500/60 focus:ring-1 focus:ring-red-500/30 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 text-white font-semibold text-sm py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/30"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
              {loading ? "Verificando..." : "Acceder al panel"}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Solo accesible para usuarios con privilegios de Super Admin
        </p>
      </div>
    </div>
  );
}
