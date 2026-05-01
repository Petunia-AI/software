"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Layers, Plus, Sparkles, Download, Printer,
  Trash2, Loader2, X, CheckCircle2, AlertCircle, RotateCcw,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PresentationItem {
  id: string;
  title: string;
  style: string;
  slide_count: number;
  created_at: string;
}

interface PresentationFull extends PresentationItem {
  transcript_text: string | null;
  presentation_html: string | null;
  business_id: string;
  updated_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token") || localStorage.getItem("token")
      : null;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Style config ──────────────────────────────────────────────────────────────

const STYLES = [
  { id: "profesional", label: "Profesional", desc: "Gradientes violeta, tipografía elegante", bg: "#7C3AED" },
  { id: "creativo",    label: "Creativo",    desc: "Vibrante, dinámico y llamativo",          bg: "#EC4899" },
  { id: "minimalista", label: "Minimalista", desc: "Limpio, mucho espacio en blanco",          bg: "#111827" },
  { id: "corporativo", label: "Corporativo", desc: "Formal, azul marino ejecutivo",            bg: "#1E3A5F" },
] as const;

type StyleId = (typeof STYLES)[number]["id"];

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = { success: "bg-green-600", error: "bg-red-600", info: "bg-blue-600" };
  return (
    <div
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white shadow-xl ${colors[type]} text-sm max-w-md`}
    >
      {type === "error" ? (
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      )}
      <span>{message}</span>
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PresentacionesPage() {
  const [items, setItems] = useState<PresentationItem[]>([]);
  const [selected, setSelected] = useState<PresentationFull | null>(null);
  const [mode, setMode] = useState<"idle" | "creating" | "generating">("idle");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [style, setStyle] = useState<StyleId>("profesional");

  // Regenerate state
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenPanel, setShowRegenPanel] = useState(false);

  // Confirm delete
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Iframe ref for auto-resize
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ message, type });
    },
    []
  );

  // ── Load list ──────────────────────────────────────────────────────────────

  async function loadList() {
    try {
      const resp = await fetch(`${API}/presentations`, { headers: authHeaders() });
      if (resp.ok) setItems(await resp.json());
    } catch {
      showToast("Error al cargar presentaciones", "error");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Select item (fetch full detail) ───────────────────────────────────────

  async function selectItem(item: PresentationItem) {
    setMode("idle");
    setShowRegenPanel(false);
    setConfirmDelete(false);
    setLoadingDetail(true);
    setSelected({
      ...item,
      transcript_text: null,
      presentation_html: null,
      business_id: "",
      updated_at: item.created_at,
    });
    try {
      const resp = await fetch(`${API}/presentations/${item.id}`, {
        headers: authHeaders(),
      });
      if (resp.ok) setSelected(await resp.json());
    } catch {
      showToast("Error al cargar la presentación", "error");
    } finally {
      setLoadingDetail(false);
    }
  }

  // ── Generate ───────────────────────────────────────────────────────────────

  async function handleGenerate() {
    if (!title.trim()) {
      showToast("Ingresa un título para la presentación", "error");
      return;
    }
    if (transcript.trim().length < 50) {
      showToast("La transcripción debe tener al menos 50 caracteres", "error");
      return;
    }
    setMode("generating");
    try {
      const resp = await fetch(`${API}/presentations`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ title, transcript_text: transcript, style }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || "Error al generar la presentación");
      }
      const created: PresentationFull = await resp.json();
      setItems((prev) => [
        { id: created.id, title: created.title, style: created.style, slide_count: created.slide_count, created_at: created.created_at },
        ...prev,
      ]);
      setSelected(created);
      setMode("idle");
      setTitle("");
      setTranscript("");
      setStyle("profesional");
      showToast(
        `¡Presentación creada con ${created.slide_count} diapositivas! ✨`,
        "success"
      );
    } catch (e: unknown) {
      setMode("creating");
      showToast(
        e instanceof Error ? e.message : "Error al generar — intenta de nuevo",
        "error"
      );
    }
  }

  // ── Regenerate ─────────────────────────────────────────────────────────────

  async function handleRegenerate(newStyle: StyleId) {
    if (!selected) return;
    setRegenerating(true);
    setShowRegenPanel(false);
    try {
      const resp = await fetch(`${API}/presentations/${selected.id}/regenerate`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ style: newStyle }),
        signal: AbortSignal.timeout(180_000),
      });
      if (!resp.ok) throw new Error("Error al regenerar");
      const updated: PresentationFull = await resp.json();
      setSelected(updated);
      setItems((prev) =>
        prev.map((p) =>
          p.id === updated.id
            ? { ...p, style: updated.style, slide_count: updated.slide_count }
            : p
        )
      );
      showToast("Presentación regenerada ✨", "success");
    } catch {
      showToast("Error al regenerar — intenta de nuevo", "error");
    } finally {
      setRegenerating(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!selected) return;
    setConfirmDelete(false);
    await fetch(`${API}/presentations/${selected.id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    setItems((prev) => prev.filter((p) => p.id !== selected.id));
    setSelected(null);
    setMode("idle");
    showToast("Presentación eliminada", "info");
  }

  // ── Download / Print ───────────────────────────────────────────────────────

  function downloadHTML(html: string, title: string) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}_presentacion.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPresentation(html: string) {
    const win = window.open("", "_blank");
    if (!win) {
      showToast("Habilita las ventanas emergentes para exportar como PDF", "error");
      return;
    }
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  function handleIframeLoad() {
    if (iframeRef.current) {
      try {
        const doc = iframeRef.current.contentDocument;
        if (doc) {
          const h = doc.documentElement.scrollHeight;
          if (h > 100) iframeRef.current.style.height = `${h + 48}px`;
        }
      } catch {
        // Cross-origin — leave default height
      }
    }
  }

  const styleFor = (id: string) => STYLES.find((s) => s.id === id) ?? STYLES[0];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-slate-50">
      {/* ── Left sidebar ── */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-600" />
              <h1 className="font-semibold text-slate-800">Presentaciones</h1>
            </div>
            <button
              onClick={() => {
                setMode("creating");
                setSelected(null);
                setShowRegenPanel(false);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Nueva
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingList ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-400">
              <Layers className="w-8 h-8 text-slate-200" />
              <p className="text-sm text-center px-4">Aún no hay presentaciones</p>
            </div>
          ) : (
            items.map((item) => {
              const s = styleFor(item.style);
              const isSelected = selected?.id === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => selectItem(item)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    isSelected ? "bg-violet-50 border-r-2 border-r-violet-500" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {fmtDate(item.created_at)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium capitalize"
                        style={{ background: s.bg }}
                      >
                        {s.label}
                      </span>
                      {item.slide_count > 0 && (
                        <span className="text-[10px] text-slate-400">
                          {item.slide_count} slides
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* GENERATING */}
        {mode === "generating" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow">
                <Loader2 className="w-3 h-3 animate-spin text-violet-600" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xl font-semibold text-slate-800">
                Claude está creando tu presentación...
              </p>
              <p className="text-sm text-slate-500 mt-2">
                Analizando la transcripción y diseñando cada diapositiva
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Esto puede tomar hasta 60 segundos
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-2.5 h-2.5 rounded-full bg-violet-300 animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* CREATION FORM */}
        {mode === "creating" && (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800">
                    Nueva Presentación
                  </h2>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Claude analizará la transcripción y generará diapositivas
                    espectaculares
                  </p>
                </div>
                <button
                  onClick={() => setMode("idle")}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Title */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Título de la presentación *
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                  placeholder="Ej: Revisión Q1 2026 · Propuesta comercial cliente · Demo de producto"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Style selector */}
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Estilo de diseño
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                        style === s.id
                          ? "border-violet-500 shadow-md shadow-violet-100"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div
                          className="w-4 h-4 rounded-full flex-shrink-0"
                          style={{ background: s.bg }}
                        />
                        <span className="text-sm font-semibold text-slate-800">
                          {s.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{s.desc}</p>
                      {style === s.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transcript */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Transcripción de la reunión *
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Pega aquí la transcripción completa (Zoom, Google Meet, Teams,
                  Otter.ai, tRec, etc.)
                </p>
                <textarea
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none h-64 font-mono"
                  placeholder={`[00:00] Ana García: Buenos días a todos, gracias por unirse...\n[00:15] Carlos: Comenzamos con el reporte del trimestre...\n[00:45] Director: Los números muestran un crecimiento del 23%...`}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                />
                <div className="flex justify-between items-center mt-1.5">
                  <span className="text-xs text-slate-400">
                    {transcript.length.toLocaleString("es-MX")} caracteres
                  </span>
                  {transcript.length > 0 && transcript.length < 50 && (
                    <span className="text-xs text-amber-500">
                      Mínimo 50 caracteres
                    </span>
                  )}
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={handleGenerate}
                disabled={!title.trim() || transcript.trim().length < 50}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold text-base hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/25 transition-all"
              >
                <Sparkles className="w-5 h-5" />
                Generar presentación con Claude ✨
              </button>

              <p className="text-xs text-slate-400 text-center mt-3">
                Claude generará 8-12 diapositivas profesionales en español · ~30-60
                segundos
              </p>
            </div>
          </div>
        )}

        {/* PRESENTATION VIEW */}
        {mode === "idle" && selected && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Detail header */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 flex-shrink-0 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: styleFor(selected.style).bg }}
                >
                  <Layers className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-800 truncate">
                    {selected.title}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ background: styleFor(selected.style).bg }}
                    >
                      {styleFor(selected.style).label}
                    </span>
                    {selected.slide_count > 0 && (
                      <span className="text-xs text-slate-400">
                        {selected.slide_count} diapositivas
                      </span>
                    )}
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs text-slate-400">
                      {fmtDate(selected.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {selected.presentation_html && (
                  <>
                    <button
                      onClick={() =>
                        downloadHTML(selected.presentation_html!, selected.title)
                      }
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
                    >
                      <Download className="w-3.5 h-3.5" /> HTML
                    </button>
                    <button
                      onClick={() => printPresentation(selected.presentation_html!)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700"
                    >
                      <Printer className="w-3.5 h-3.5" /> PDF
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowRegenPanel(!showRegenPanel)}
                  disabled={regenerating}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 disabled:opacity-50"
                >
                  {regenerating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  Regenerar
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Regenerate style panel */}
            {showRegenPanel && (
              <div className="bg-violet-50 border-b border-violet-100 px-6 py-3 flex items-center gap-3 flex-shrink-0 flex-wrap">
                <span className="text-xs font-semibold text-violet-700">
                  Regenerar con estilo:
                </span>
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleRegenerate(s.id)}
                    disabled={regenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    style={{ background: s.bg }}
                  >
                    {s.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowRegenPanel(false)}
                  className="ml-auto text-violet-400 hover:text-violet-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Iframe or loading */}
            <div className="flex-1 overflow-auto bg-slate-100 p-6">
              {loadingDetail || !selected.presentation_html ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                  <p className="text-sm">Cargando presentación...</p>
                </div>
              ) : (
                <iframe
                  ref={iframeRef}
                  key={`${selected.id}-${selected.style}`}
                  srcDoc={selected.presentation_html}
                  sandbox="allow-same-origin"
                  onLoad={handleIframeLoad}
                  title={selected.title}
                  className="w-full rounded-2xl shadow-xl bg-white"
                  style={{ minHeight: "4200px", border: "none", display: "block" }}
                />
              )}
            </div>
          </div>
        )}

        {/* WELCOME / EMPTY STATE */}
        {mode === "idle" && !selected && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 text-slate-400">
            <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center">
              <Layers className="w-14 h-14 text-violet-400" />
            </div>
            <div className="text-center max-w-sm">
              <h2 className="text-xl font-semibold text-slate-700">
                Convierte reuniones en presentaciones
              </h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                Pega la transcripción de cualquier reunión y Claude generará una
                presentación espectacular lista para compartir o exportar como PDF.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={() => setMode("creating")}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 font-medium text-sm shadow-lg shadow-violet-500/25 transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Crear primera presentación
              </button>
            </div>
            <div className="flex gap-6 mt-4">
              {STYLES.map((s) => (
                <div key={s.id} className="flex flex-col items-center gap-1.5">
                  <div
                    className="w-10 h-7 rounded-lg shadow-sm"
                    style={{ background: s.bg }}
                  />
                  <span className="text-[10px] text-slate-400 font-medium">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80">
            <h3 className="font-semibold text-slate-800 mb-2">
              ¿Eliminar presentación?
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Esta acción no se puede deshacer. Se eliminará la presentación y su
              transcripción.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
