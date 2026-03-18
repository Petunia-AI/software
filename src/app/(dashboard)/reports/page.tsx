"use client";

import {
  FileText,
  Download,
  BarChart3,
  Users,
  Megaphone,
  TrendingUp,
  Calendar,
  ExternalLink,
} from "lucide-react";

const REPORT_TYPES = [
  {
    id: "overview",
    title: "Reporte General",
    description: "Pipeline, fuentes de leads, campañas Meta y top leads por score IA.",
    icon: BarChart3,
    border: "border-violet-100",
    iconBg: "bg-violet-50",
    iconColor: "text-violet-600",
    badge: "Más popular",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  {
    id: "leads",
    title: "Reporte de Leads",
    description: "Análisis completo del CRM: pipeline, score promedio, conversión por fuente.",
    icon: Users,
    border: "border-cyan-100",
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-600",
  },
  {
    id: "campaigns",
    title: "Reporte de Campañas",
    description: "Performance de Meta Ads: impresiones, clicks, CTR, CPL por campaña.",
    icon: Megaphone,
    border: "border-blue-100",
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
];

export default function ReportsPage() {
  const openReport = (type: string) => {
    window.open(`/api/reports/generate?type=${type}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6 text-violet-600" />
          Reportes PDF
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          Genera reportes descargables con los datos de tu organización
        </p>
      </div>

      {/* How it works */}
      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">¿Cómo funciona?</p>
          <p className="text-sm text-gray-600 mt-1">
            Haz clic en <strong className="text-gray-800">Generar Reporte</strong> para abrir el reporte en una nueva
            pestaña. Desde ahí, usa <kbd className="bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded text-xs">Cmd+P</kbd> o el botón
            <strong className="text-gray-800"> ⬇ Descargar PDF</strong> para guardar como PDF. Los datos son en tiempo
            real de tu organización.
          </p>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {REPORT_TYPES.map((r) => (
          <div
            key={r.id}
            className={`relative bg-white border ${r.border} shadow-sm rounded-2xl p-6 flex flex-col gap-4`}
          >
            {r.badge && (
              <span className={`absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full font-medium ${r.badgeColor}`}>
                {r.badge}
              </span>
            )}
            <div className={`w-11 h-11 rounded-xl ${r.iconBg} flex items-center justify-center ${r.iconColor}`}>
              <r.icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{r.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{r.description}</p>
            </div>
            <button
              onClick={() => openReport(r.id)}
              className="mt-auto flex items-center justify-center gap-2 w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium rounded-xl transition border border-gray-200"
            >
              <Download className="w-4 h-4" />
              Generar Reporte
              <ExternalLink className="w-3 h-3 opacity-50" />
            </button>
          </div>
        ))}
      </div>

      {/* Quick stats */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
          ¿Qué incluye cada reporte?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: TrendingUp, title: "KPIs principales", desc: "Total leads, conversión, CPL, score promedio" },
            { icon: Users, title: "Pipeline de ventas", desc: "Leads por estatus con porcentajes" },
            { icon: BarChart3, title: "Fuentes de leads", desc: "Instagram, Facebook, WhatsApp, Referidos…" },
            { icon: Megaphone, title: "Campañas Meta Ads", desc: "Impresiones, CTR, CPL por campaña" },
            { icon: TrendingUp, title: "Top leads por Score IA", desc: "Los 10 leads con mayor puntuación" },
            { icon: Calendar, title: "Fecha de generación", desc: "Timestamp exacto de cada reporte" },
          ].map((item) => (
            <div key={item.title} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0 mt-0.5">
                <item.icon className="w-3.5 h-3.5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
