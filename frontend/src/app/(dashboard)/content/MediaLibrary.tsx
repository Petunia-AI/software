"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Trash2, X, Check, HardDrive, Image, Video,
  AlertCircle, RefreshCw, FileImage, Film, ZoomIn,
} from "lucide-react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export interface MediaAsset {
  id: string;
  original_filename: string;
  stored_filename: string;
  mime_type: string;
  file_type: "image" | "video";
  file_size_bytes: number;
  public_url: string;
  created_at: string;
}

interface StorageInfo {
  used_bytes: number;
  limit_bytes: number;
  used_mb: number;
  limit_mb: number;
  percentage: number;
  plan: string;
  asset_count: number;
}

interface MediaLibraryProps {
  token: string;
  /** Si se pasa, la librería funciona en modo "selector": clic en imagen la selecciona y llama onSelect */
  onSelect?: (asset: MediaAsset) => void;
  /** URL actualmente seleccionada (para marcarla en el grid) */
  selectedUrl?: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STORAGE_BY_PLAN: Record<string, string> = {
  trial:      "500 MB",
  starter:    "500 MB",
  pro:        "2 GB",
  enterprise: "10 GB",
};

// ── Storage Meter ─────────────────────────────────────────────────────────

function StorageMeter({ info }: { info: StorageInfo }) {
  const pct = Math.min(100, info.percentage);
  const barColor =
    pct >= 90 ? "from-red-500 to-rose-500" :
    pct >= 70 ? "from-amber-400 to-orange-500" :
    "from-violet-500 to-purple-600";

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center">
            <HardDrive size={15} className="text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Almacenamiento</p>
            <p className="text-xs text-gray-400 capitalize">Plan {info.plan} · {STORAGE_BY_PLAN[info.plan] ?? `${info.limit_mb} MB`}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-800">{info.used_mb.toFixed(1)} MB</p>
          <p className="text-xs text-gray-400">de {info.limit_mb >= 1024 ? `${(info.limit_mb / 1024).toFixed(0)} GB` : `${info.limit_mb} MB`}</p>
        </div>
      </div>
      <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-gray-400">{info.asset_count} archivos</p>
        <p className={`text-xs font-semibold ${pct >= 90 ? "text-red-500" : pct >= 70 ? "text-amber-500" : "text-gray-400"}`}>
          {pct.toFixed(1)}% usado
        </p>
      </div>
      {pct >= 85 && (
        <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
          <AlertCircle size={12} />
          <span>Estás casi sin espacio. Elimina archivos o mejora tu plan.</span>
        </div>
      )}
    </div>
  );
}

// ── Upload Zone ───────────────────────────────────────────────────────────

function UploadZone({
  onUpload,
  uploading,
  storageInfo,
}: {
  onUpload: (files: FileList) => void;
  uploading: boolean;
  storageInfo: StorageInfo | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) onUpload(e.dataTransfer.files);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
        dragging
          ? "border-violet-400 bg-violet-50/60 scale-[1.01]"
          : uploading
          ? "border-violet-200 bg-violet-50/30 cursor-not-allowed"
          : "border-gray-200 hover:border-violet-300 hover:bg-violet-50/20"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm"
        multiple
        onChange={(e) => e.target.files && onUpload(e.target.files)}
      />

      {uploading ? (
        <div className="flex flex-col items-center gap-2">
          <RefreshCw size={28} className="text-violet-500 animate-spin" />
          <p className="text-sm font-medium text-violet-600">Subiendo archivo...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dragging ? "bg-violet-100" : "bg-gray-50"} transition-colors`}>
            <Upload size={22} className={dragging ? "text-violet-600" : "text-gray-400"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">
              {dragging ? "Suelta aquí" : "Arrastra archivos o haz clic"}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Imágenes (JPEG, PNG, GIF, WebP · máx 25 MB) · Videos (MP4, MOV, WebM · máx 500 MB)
            </p>
            {storageInfo && (
              <p className="text-xs text-gray-400 mt-1">
                {storageInfo.used_mb.toFixed(1)} MB usados de{" "}
                {storageInfo.limit_mb >= 1024
                  ? `${(storageInfo.limit_mb / 1024).toFixed(0)} GB`
                  : `${storageInfo.limit_mb} MB`}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Media Thumbnail ───────────────────────────────────────────────────────

function MediaThumb({
  asset,
  onDelete,
  onSelect,
  selected,
  selectMode,
}: {
  asset: MediaAsset;
  onDelete: () => void;
  onSelect?: () => void;
  selected: boolean;
  selectMode: boolean;
}) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className={`relative group rounded-2xl overflow-hidden bg-gray-100 border-2 transition-all cursor-pointer ${
          selected
            ? "border-violet-500 ring-2 ring-violet-200 shadow-lg shadow-violet-100"
            : "border-transparent hover:border-violet-200"
        }`}
        style={{ aspectRatio: "1/1" }}
        onClick={() => setShowPreview(true)}
      >
        {asset.file_type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={asset.public_url}
            alt={asset.original_filename}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
            <video
              src={`${asset.public_url}#t=0.001`}
              muted
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />
            {/* Play icon overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          </div>
        )}

        {/* Overlay info */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-white font-medium truncate">{asset.original_filename}</p>
          <p className="text-[9px] text-white/60">{formatBytes(asset.file_size_bytes)}</p>
        </div>

        {/* Type badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            asset.file_type === "image"
              ? "bg-blue-500/80 text-white"
              : "bg-gray-800/80 text-white"
          } backdrop-blur-sm`}>
            {asset.file_type === "image" ? <FileImage size={8} /> : <Film size={8} />}
          </span>
        </div>

        {/* Select checkmark */}
        {selected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center shadow-md">
            <Check size={11} className="text-white" strokeWidth={3} />
          </div>
        )}

        {/* Select mode hover */}
        {selectMode && !selected && (
          <div className="absolute top-2 right-2 w-5 h-5 bg-black/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        )}

        {/* Zoom icon (non-select mode) */}
        {!selectMode && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setShowPreview(true); }}
              className="w-7 h-7 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ZoomIn size={12} className="text-white" />
            </button>
          </div>
        )}

        {/* Delete button */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 bg-red-500/80 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors backdrop-blur-sm"
          >
            <Trash2 size={11} className="text-white" />
          </button>
        </div>
      </motion.div>

      {/* Full preview modal */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.85)" }}
            onClick={() => setShowPreview(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {asset.file_type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset.public_url} alt={asset.original_filename} className="w-full rounded-2xl shadow-2xl max-h-[80vh] object-contain" />
              ) : (
                <video src={asset.public_url} controls muted autoPlay playsInline className="w-full rounded-2xl shadow-2xl max-h-[80vh]" />
              )}
              <div className="mt-3 flex items-center justify-between px-1">
                <div>
                  <p className="text-sm font-medium text-white">{asset.original_filename}</p>
                  <p className="text-xs text-white/50">{formatBytes(asset.file_size_bytes)} · {new Date(asset.created_at).toLocaleDateString("es-MX")}</p>
                </div>
                <div className="flex items-center gap-2">
                  {selectMode && (
                    <button
                      onClick={() => { onSelect?.(); setShowPreview(false); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white text-sm font-semibold transition-colors"
                    >
                      <Check size={14} /> Seleccionar
                    </button>
                  )}
                  <button onClick={() => setShowPreview(false)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                    <X size={16} className="text-white" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main MediaLibrary ─────────────────────────────────────────────────────

export default function MediaLibrary({ token, onSelect, selectedUrl }: MediaLibraryProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "image" | "video">("all");

  const headers = { Authorization: `Bearer ${token}` };
  const selectMode = !!onSelect;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, storageRes] = await Promise.all([
        fetch(`${API}/content/media`, { headers }),
        fetch(`${API}/content/media/storage-info`, { headers }),
      ]);
      if (assetsRes.ok) setAssets(await assetsRes.json());
      if (storageRes.ok) setStorageInfo(await storageRes.json());
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleUpload(files: FileList) {
    setUploading(true);
    let successCount = 0;
    let lastError = "";

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const res = await fetch(`${API}/content/media/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (res.ok) {
          const asset: MediaAsset = await res.json();
          setAssets((prev) => [asset, ...prev]);
          successCount++;
        } else {
          const err = await res.json().catch(() => ({}));
          lastError = err.detail || `Error al subir ${file.name}`;
          toast.error(lastError);
        }
      } catch {
        toast.error(`Error de conexión al subir ${file.name}`);
      }
    }

    setUploading(false);
    if (successCount > 0) {
      toast.success(`${successCount} archivo${successCount > 1 ? "s" : ""} subido${successCount > 1 ? "s" : ""} ✅`);
      // Refresh storage info
      const storageRes = await fetch(`${API}/content/media/storage-info`, { headers });
      if (storageRes.ok) setStorageInfo(await storageRes.json());
    }
  }

  async function handleDelete(asset: MediaAsset) {
    const res = await fetch(`${API}/content/media/${asset.id}`, { method: "DELETE", headers });
    if (res.ok || res.status === 204) {
      setAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toast.success("Archivo eliminado");
      const storageRes = await fetch(`${API}/content/media/storage-info`, { headers });
      if (storageRes.ok) setStorageInfo(await storageRes.json());
    } else {
      toast.error("Error al eliminar el archivo");
    }
  }

  const filtered = filterType === "all" ? assets : assets.filter((a) => a.file_type === filterType);

  return (
    <div className="space-y-4">
      {/* Storage meter */}
      {storageInfo && <StorageMeter info={storageInfo} />}

      {/* Upload zone */}
      <UploadZone
        onUpload={handleUpload}
        uploading={uploading}
        storageInfo={storageInfo}
      />

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        {(["all", "image", "video"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              filterType === t
                ? "bg-violet-50 border-violet-300 text-violet-700"
                : "bg-white border-gray-200 text-gray-500 hover:border-violet-200 hover:text-violet-600"
            }`}
          >
            {t === "all" ? null : t === "image" ? <Image size={11} /> : <Video size={11} />}
            {t === "all" ? "Todos" : t === "image" ? "Imágenes" : "Videos"}
            <span className="bg-gray-100 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-0.5">
              {t === "all" ? assets.length : assets.filter((a) => a.file_type === t).length}
            </span>
          </button>
        ))}
        {selectMode && (
          <p className="ml-auto text-xs text-violet-600 font-medium flex items-center gap-1">
            <Check size={11} /> Haz clic para seleccionar
          </p>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-gray-100 animate-pulse" style={{ aspectRatio: "1/1" }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl">
          {filterType === "video" ? <Film size={32} className="text-gray-300 mb-3" /> : <FileImage size={32} className="text-gray-300 mb-3" />}
          <p className="text-sm font-medium text-gray-500 mb-1">
            {filterType === "all" ? "Sin archivos todavía" : `Sin ${filterType === "image" ? "imágenes" : "videos"}`}
          </p>
          <p className="text-xs text-gray-400">Sube archivos para usarlos en tus posts</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {filtered.map((asset) => (
              <MediaThumb
                key={asset.id}
                asset={asset}
                onDelete={() => handleDelete(asset)}
                onSelect={() => onSelect?.(asset)}
                selected={selectedUrl === asset.public_url}
                selectMode={selectMode}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
