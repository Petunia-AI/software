"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Plus, Home, MapPin, Briefcase, PackageOpen,
  Bed, Bath, Car, Ruler, X, Upload, Star, Trash2, Pencil,
  RefreshCw, Search, Filter, ImageIcon, ChevronDown,
  CheckCircle, AlertCircle, Clock, Eye,
} from "lucide-react";
import toast from "react-hot-toast";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Types ─────────────────────────────────────────────────────────────────

type PropertyType = "casa" | "departamento" | "terreno" | "local" | "oficina" | "bodega";
type OperationType = "venta" | "renta" | "venta_renta";
type PropertyStatus = "disponible" | "vendida" | "rentada" | "reservada" | "no_disponible";

interface PropImage {
  id: string;
  url: string;
  caption: string | null;
  is_cover: boolean;
  order: number;
}

interface Property {
  id: string;
  title: string;
  property_type: PropertyType;
  operation_type: OperationType;
  status: PropertyStatus;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  price: number | null;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  parking_spaces: number | null;
  area_m2: number | null;
  construction_m2: number | null;
  floor: number | null;
  total_floors: number | null;
  age_years: number | null;
  amenities: string[];
  features: Record<string, string>;
  cover_image_url: string | null;
  images: PropImage[];
  is_active: boolean;
  created_at: string;
}

// ── Config ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<PropertyType, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  casa:         { label: "Casa",          icon: <Home size={12} />,        color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  departamento: { label: "Departamento",  icon: <Building2 size={12} />,   color: "text-blue-700",    bg: "bg-blue-50 border-blue-200"       },
  terreno:      { label: "Terreno",       icon: <MapPin size={12} />,      color: "text-amber-700",   bg: "bg-amber-50 border-amber-200"     },
  local:        { label: "Local",         icon: <PackageOpen size={12} />, color: "text-violet-700",  bg: "bg-violet-50 border-violet-200"   },
  oficina:      { label: "Oficina",       icon: <Briefcase size={12} />,   color: "text-indigo-700",  bg: "bg-indigo-50 border-indigo-200"   },
  bodega:       { label: "Bodega",        icon: <PackageOpen size={12} />, color: "text-slate-700",   bg: "bg-slate-50 border-slate-200"     },
};

const STATUS_CONFIG: Record<PropertyStatus, { label: string; dot: string; badge: string }> = {
  disponible:    { label: "Disponible",    dot: "#10B981", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  vendida:       { label: "Vendida",       dot: "#8B5CF6", badge: "bg-violet-50 text-violet-700 border-violet-200"   },
  rentada:       { label: "Rentada",       dot: "#3B82F6", badge: "bg-blue-50 text-blue-700 border-blue-200"         },
  reservada:     { label: "Reservada",     dot: "#F59E0B", badge: "bg-amber-50 text-amber-700 border-amber-200"      },
  no_disponible: { label: "No disponible", dot: "#94A3B8", badge: "bg-slate-50 text-slate-500 border-slate-200"      },
};

const OP_CONFIG: Record<OperationType, { label: string; color: string }> = {
  venta:       { label: "Venta",       color: "text-teal-700 bg-teal-50 border-teal-200"   },
  renta:       { label: "Renta",       color: "text-cyan-700 bg-cyan-50 border-cyan-200"   },
  venta_renta: { label: "Venta/Renta", color: "text-sky-700 bg-sky-50 border-sky-200"      },
};

const PROPERTY_TYPES: PropertyType[] = ["casa", "departamento", "terreno", "local", "oficina", "bodega"];
const AMENITY_LIST = ["Alberca", "Gym", "Jardín", "Terraza", "Roof garden", "Seguridad 24h", "Elevador", "Áreas verdes", "Salón de eventos", "Cisterna", "Cuarto de servicio", "Estudio"];

function formatPrice(price: number | null, currency: string) {
  if (!price) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
}

// ── Empty form ─────────────────────────────────────────────────────────────

function emptyForm() {
  return {
    title: "",
    property_type: "casa" as PropertyType,
    operation_type: "venta" as OperationType,
    status: "disponible" as PropertyStatus,
    description: "",
    address: "",
    neighborhood: "",
    city: "Orlando",
    state: "FL",
    price: "",
    currency: "USD",
    bedrooms: "",
    bathrooms: "",
    parking_spaces: "",
    area_m2: "",
    construction_m2: "",
    floor: "",
    total_floors: "",
    age_years: "",
    amenities: [] as string[],
  };
}

// ── Stat strip ─────────────────────────────────────────────────────────────

function StatStrip({ total, byStatus }: { total: number; byStatus: Record<string, number> }) {
  const stats = [
    { label: "Total",          value: total,                           icon: Building2,     color: "text-indigo-600",  bg: "bg-indigo-50"  },
    { label: "Disponibles",    value: byStatus.disponible ?? 0,        icon: CheckCircle,   color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Reservadas",     value: byStatus.reservada ?? 0,         icon: Clock,         color: "text-amber-600",   bg: "bg-amber-50"   },
    { label: "Vendidas",       value: byStatus.vendida ?? 0,           icon: Star,          color: "text-violet-600",  bg: "bg-violet-50"  },
    { label: "No disponibles", value: byStatus.no_disponible ?? 0,     icon: AlertCircle,   color: "text-slate-500",   bg: "bg-slate-50"   },
  ];
  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map(({ label, value, icon: Icon, color, bg }, i) => (
        <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.4 }}
          className="card-stripe p-4">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
              <Icon size={15} className={color} />
            </div>
            <div>
              <p className={`text-xl font-bold tracking-tight ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Property Card ──────────────────────────────────────────────────────────

function PropertyCard({ prop, onEdit, onDelete, onViewImages }: {
  prop: Property;
  onEdit: () => void;
  onDelete: () => void;
  onViewImages: () => void;
}) {
  const tc = TYPE_CONFIG[prop.property_type];
  const sc = STATUS_CONFIG[prop.status];
  const oc = OP_CONFIG[prop.operation_type];

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}
      className="card group overflow-hidden flex flex-col">

      {/* Cover image */}
      <div className="relative bg-slate-100 overflow-hidden" style={{ aspectRatio: "4/3" }}>
        {prop.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={prop.cover_image_url} alt={prop.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-300">
            <Building2 size={40} />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
        {/* Image count badge */}
        {prop.images.length > 0 && (
          <button onClick={onViewImages}
            className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm hover:bg-black/80 transition-colors">
            <ImageIcon size={9} />{prop.images.length} fotos
          </button>
        )}
        {/* Status badge */}
        <span className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.badge}`}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
          {sc.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border ${tc.bg} ${tc.color}`}>
            {tc.icon}{tc.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${oc.color}`}>
            {oc.label}
          </span>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{prop.title}</h3>
          {(prop.neighborhood || prop.city) && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <MapPin size={10} />{[prop.neighborhood, prop.city].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        <p className="text-lg font-bold text-foreground">{formatPrice(prop.price, prop.currency)}</p>

        {/* Specs */}
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {prop.bedrooms != null && (
            <span className="flex items-center gap-1"><Bed size={11} className="text-slate-400" />{prop.bedrooms} rec</span>
          )}
          {prop.bathrooms != null && (
            <span className="flex items-center gap-1"><Bath size={11} className="text-slate-400" />{prop.bathrooms} baños</span>
          )}
          {prop.parking_spaces != null && (
            <span className="flex items-center gap-1"><Car size={11} className="text-slate-400" />{prop.parking_spaces} lugares</span>
          )}
          {prop.area_m2 != null && (
            <span className="flex items-center gap-1"><Ruler size={11} className="text-slate-400" />{prop.area_m2} sqft</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2 border-t border-border/50">
          <button onClick={onViewImages} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 transition-colors">
            <ImageIcon size={12} />Fotos
          </button>
          <button onClick={onEdit} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium border border-indigo-200 transition-colors">
            <Pencil size={12} />Editar
          </button>
          <button onClick={onDelete} className="ml-auto p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Property Form Modal ────────────────────────────────────────────────────

function PropertyFormModal({ property, onClose, onSaved, token }: {
  property: Property | null;
  onClose: () => void;
  onSaved: (p: Property) => void;
  token: string;
}) {
  const [form, setForm] = useState(() => {
    if (property) return {
      title: property.title,
      property_type: property.property_type,
      operation_type: property.operation_type,
      status: property.status,
      description: property.description ?? "",
      address: property.address ?? "",
      neighborhood: property.neighborhood ?? "",
      city: property.city ?? "",
      state: property.state ?? "",
      price: property.price?.toString() ?? "",
      currency: property.currency,
      bedrooms: property.bedrooms?.toString() ?? "",
      bathrooms: property.bathrooms?.toString() ?? "",
      parking_spaces: property.parking_spaces?.toString() ?? "",
      area_m2: property.area_m2?.toString() ?? "",
      construction_m2: property.construction_m2?.toString() ?? "",
      floor: property.floor?.toString() ?? "",
      total_floors: property.total_floors?.toString() ?? "",
      age_years: property.age_years?.toString() ?? "",
      amenities: property.amenities ?? [],
    };
    return emptyForm();
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"basic" | "specs" | "location" | "fotos">("basic");
  const [images, setImages] = useState<PropImage[]>(property?.images ?? []);
  const [uploadingImg, setUploadingImg] = useState(false);
  const imgFileRef = useRef<HTMLInputElement>(null);
  // track the saved property id (needed for images after first save)
  const [savedPropId, setSavedPropId] = useState<string | null>(property?.id ?? null);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const headersNoJson = { Authorization: `Bearer ${token}` };

  function toggleAmenity(a: string) {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a],
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error("El título es requerido"); return; }
    setSaving(true);
    try {
      const body = {
        ...form,
        price: form.price ? parseFloat(form.price) : null,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseFloat(form.bathrooms) : null,
        parking_spaces: form.parking_spaces ? parseInt(form.parking_spaces) : null,
        area_m2: form.area_m2 ? parseFloat(form.area_m2) : null,
        construction_m2: form.construction_m2 ? parseFloat(form.construction_m2) : null,
        floor: form.floor ? parseInt(form.floor) : null,
        total_floors: form.total_floors ? parseInt(form.total_floors) : null,
        age_years: form.age_years ? parseInt(form.age_years) : null,
      };
      const url = property ? `${API}/properties/${property.id}` : `${API}/properties/`;
      const method = property ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (res.ok) {
        const saved = await res.json();
        toast.success(property ? "Propiedad actualizada" : "Propiedad creada");
        setSavedPropId(saved.id);
        setImages(saved.images ?? []);
        onSaved(saved);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.detail || "Error al guardar");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleImgUpload(files: FileList) {
    if (!savedPropId) return;
    setUploadingImg(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API}/properties/${savedPropId}/images`, { method: "POST", headers: headersNoJson, body: fd });
      if (res.ok) { const img = await res.json(); setImages(prev => [...prev, img]); uploaded++; }
    }
    setUploadingImg(false);
    if (uploaded > 0) {
      toast.success(`${uploaded} imagen${uploaded > 1 ? "es" : ""} subida${uploaded > 1 ? "s" : ""}`);
      const r = await fetch(`${API}/properties/${savedPropId}`, { headers: headersNoJson });
      if (r.ok) { const p = await r.json(); setImages(p.images ?? []); onSaved(p); }
    }
  }

  async function handleImgSetCover(imgId: string) {
    if (!savedPropId) return;
    await fetch(`${API}/properties/${savedPropId}/images/${imgId}/cover`, { method: "POST", headers: headersNoJson });
    setImages(prev => prev.map(i => ({ ...i, is_cover: i.id === imgId })));
    const r = await fetch(`${API}/properties/${savedPropId}`, { headers: headersNoJson });
    if (r.ok) onSaved(await r.json());
    toast.success("Portada actualizada");
  }

  async function handleImgDelete(imgId: string) {
    if (!savedPropId) return;
    await fetch(`${API}/properties/${savedPropId}/images/${imgId}`, { method: "DELETE", headers: headersNoJson });
    setImages(prev => prev.filter(i => i.id !== imgId));
    const r = await fetch(`${API}/properties/${savedPropId}`, { headers: headersNoJson });
    if (r.ok) onSaved(await r.json());
    toast.success("Imagen eliminada");
  }

  const inputCls = "w-full px-3 py-2 rounded-xl text-sm bg-white border border-border outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-foreground placeholder:text-muted-foreground";
  const labelCls = "block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border"
          style={{ background: "linear-gradient(135deg, #4F46E5 0%, #6D28D9 100%)" }}>
          <div className="flex items-center gap-2.5">
            <Building2 size={18} className="text-white" />
            <span className="text-sm font-semibold text-white">{property ? "Editar propiedad" : "Nueva propiedad"}</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-6 pt-2">
          {(["basic", "specs", "location", "fotos"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors border-b-2 ${tab === t ? "border-indigo-500 text-indigo-600" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "basic" ? "Información" : t === "specs" ? "Ficha técnica" : t === "location" ? "Ubicación" : `Fotos${images.length > 0 ? ` (${images.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "basic" && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Título de la propiedad *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="ej: Casa en Lomas de Chapultepec" className={inputCls} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Tipo</label>
                  <select value={form.property_type} onChange={e => setForm(f => ({ ...f, property_type: e.target.value as PropertyType }))} className={inputCls}>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Operación</label>
                  <select value={form.operation_type} onChange={e => setForm(f => ({ ...f, operation_type: e.target.value as OperationType }))} className={inputCls}>
                    <option value="venta">Venta</option>
                    <option value="renta">Renta</option>
                    <option value="venta_renta">Venta / Renta</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PropertyStatus }))} className={inputCls}>
                    <option value="disponible">Disponible</option>
                    <option value="reservada">Reservada</option>
                    <option value="vendida">Vendida</option>
                    <option value="rentada">Rentada</option>
                    <option value="no_disponible">No disponible</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className={labelCls}>Precio</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Moneda</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inputCls}>
                    <option value="USD">USD</option>
                    <option value="MXN">MXN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Descripción</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Descripción de la propiedad..." className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className={labelCls}>Amenidades</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {AMENITY_LIST.map(a => (
                    <button key={a} type="button" onClick={() => toggleAmenity(a)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${form.amenities.includes(a) ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-white border-border text-muted-foreground hover:border-indigo-200"}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "specs" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Recámaras</label>
                  <input type="number" min={0} value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Baños</label>
                  <input type="number" min={0} step={0.5} value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Lugares de estacionamiento</label>
                  <input type="number" min={0} value={form.parking_spaces} onChange={e => setForm(f => ({ ...f, parking_spaces: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Superficie total (sqft)</label>
                  <input type="number" min={0} value={form.area_m2} onChange={e => setForm(f => ({ ...f, area_m2: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Construcción (sqft)</label>
                  <input type="number" min={0} value={form.construction_m2} onChange={e => setForm(f => ({ ...f, construction_m2: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Antigüedad (años)</label>
                  <input type="number" min={0} value={form.age_years} onChange={e => setForm(f => ({ ...f, age_years: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Piso</label>
                  <input type="number" min={0} value={form.floor} onChange={e => setForm(f => ({ ...f, floor: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Total de pisos</label>
                  <input type="number" min={0} value={form.total_floors} onChange={e => setForm(f => ({ ...f, total_floors: e.target.value }))} className={inputCls} />
                </div>
              </div>
            </div>
          )}

          {tab === "fotos" && (
            <div>
              {!savedPropId ? (
                <div className="flex flex-col items-center justify-center py-14 text-center border-2 border-dashed border-slate-200 rounded-2xl">
                  <ImageIcon size={36} className="text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-500">Guarda la propiedad primero</p>
                  <p className="text-xs text-muted-foreground mt-1">Haz clic en <strong>Crear propiedad</strong> y luego vuelve a esta pestaña para subir fotos.</p>
                </div>
              ) : (
                <div>
                  <input ref={imgFileRef} type="file" multiple accept="image/*" className="hidden"
                    onChange={e => e.target.files && handleImgUpload(e.target.files)} />

                  {/* Upload button + drop zone */}
                  <div
                    className="flex flex-col items-center justify-center gap-3 p-6 mb-4 border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/40 cursor-pointer hover:bg-indigo-50 transition-colors"
                    onClick={() => imgFileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleImgUpload(e.dataTransfer.files); }}>
                    {uploadingImg ? (
                      <><RefreshCw size={24} className="text-indigo-400 animate-spin" /><p className="text-xs text-indigo-500 font-medium">Subiendo imágenes...</p></>
                    ) : (
                      <><Upload size={24} className="text-indigo-400" /><p className="text-xs text-indigo-600 font-semibold">Arrastra fotos aquí o haz clic para seleccionar</p><p className="text-[11px] text-muted-foreground">JPG, PNG, WEBP — múltiples archivos permitidos</p></>
                    )}
                  </div>

                  {/* Grid */}
                  {images.length === 0 ? (
                    <p className="text-center text-xs text-muted-foreground py-4">Aún no hay imágenes</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {images.map(img => (
                        <div key={img.id} className="relative group rounded-xl overflow-hidden border-2 border-transparent hover:border-indigo-300 transition-all">
                          <div style={{ aspectRatio: "4/3" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={img.url} alt={img.caption ?? "Imagen"} className="w-full h-full object-cover" />
                          </div>
                          {img.is_cover && (
                            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                              <Star size={8} />Portada
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end justify-center pb-2 gap-1.5 opacity-0 group-hover:opacity-100">
                            {!img.is_cover && (
                              <button onClick={() => handleImgSetCover(img.id)}
                                className="flex items-center gap-1 bg-amber-400 hover:bg-amber-500 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full">
                                <Star size={8} />Portada
                              </button>
                            )}
                            <button onClick={() => handleImgDelete(img.id)}
                              className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                              <Trash2 size={8} />Borrar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {tab === "location" && (
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Dirección</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street address, unit" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Subdivision / Community</label>
                <input value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))}
                  placeholder="e.g. Lake Nona, Celebration" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Ciudad</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="Orlando" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Estado</label>
                  <input value={form.state} onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    placeholder="FL" className={inputCls} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border bg-slate-50/50">
          <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-60">
            {saving ? <><RefreshCw size={14} className="animate-spin" />Guardando...</> : <><CheckCircle size={14} />{property ? "Guardar cambios" : "Crear propiedad"}</>}
          </button>
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Image Gallery Modal ────────────────────────────────────────────────────

function ImageGalleryModal({ property, onClose, onUpdated, token }: {
  property: Property;
  onClose: () => void;
  onUpdated: (p: Property) => void;
  token: string;
}) {
  const [images, setImages] = useState<PropImage[]>(property.images);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Bearer ${token}` };

  async function handleUpload(files: FileList) {
    setUploading(true);
    let uploaded = 0;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API}/properties/${property.id}/images`, { method: "POST", headers, body: form });
      if (res.ok) {
        const img = await res.json();
        setImages(prev => [...prev, img]);
        uploaded++;
      }
    }
    setUploading(false);
    if (uploaded > 0) {
      toast.success(`${uploaded} imagen${uploaded > 1 ? "es" : ""} subida${uploaded > 1 ? "s" : ""}`);
      // refresh full property
      const r = await fetch(`${API}/properties/${property.id}`, { headers });
      if (r.ok) onUpdated(await r.json());
    }
  }

  async function handleSetCover(imageId: string) {
    const res = await fetch(`${API}/properties/${property.id}/images/${imageId}/cover`, { method: "POST", headers });
    if (res.ok) {
      setImages(prev => prev.map(img => ({ ...img, is_cover: img.id === imageId })));
      const r = await fetch(`${API}/properties/${property.id}`, { headers });
      if (r.ok) onUpdated(await r.json());
      toast.success("Portada actualizada");
    }
  }

  async function handleDeleteImage(imageId: string) {
    const res = await fetch(`${API}/properties/${property.id}/images/${imageId}`, { method: "DELETE", headers });
    if (res.ok) {
      setImages(prev => prev.filter(img => img.id !== imageId));
      const r = await fetch(`${API}/properties/${property.id}`, { headers });
      if (r.ok) onUpdated(await r.json());
      toast.success("Imagen eliminada");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <ImageIcon size={16} className="text-indigo-500" />{property.title}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{images.length} imágenes</p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" multiple accept="image/*" className="hidden" onChange={e => e.target.files && handleUpload(e.target.files)} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
              {uploading ? <><RefreshCw size={12} className="animate-spin" />Subiendo...</> : <><Upload size={12} />Subir fotos</>}
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-1"><X size={18} /></button>
          </div>
        </div>

        {/* Drop zone */}
        <div className="flex-1 overflow-y-auto p-5"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleUpload(e.dataTransfer.files); }}>

          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl">
              <ImageIcon size={40} className="text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">No hay imágenes</p>
              <p className="text-xs text-muted-foreground mt-1">Arrastra fotos aquí o usa el botón "Subir fotos"</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {images.map(img => (
                <motion.div key={img.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                  className={`relative group rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selected === img.id ? "border-indigo-400 ring-2 ring-indigo-200" : "border-transparent hover:border-slate-300"}`}
                  onClick={() => setSelected(selected === img.id ? null : img.id)}>
                  <div style={{ aspectRatio: "4/3" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.caption ?? "Imagen"} className="w-full h-full object-cover" />
                  </div>
                  {/* Cover badge */}
                  {img.is_cover && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      <Star size={8} />Portada
                    </div>
                  )}
                  {/* Overlay actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-end justify-center pb-3 gap-2 opacity-0 group-hover:opacity-100">
                    {!img.is_cover && (
                      <button onClick={e => { e.stopPropagation(); handleSetCover(img.id); }}
                        className="flex items-center gap-1 bg-amber-400 hover:bg-amber-500 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-full transition-colors">
                        <Star size={9} />Portada
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDeleteImage(img.id); }}
                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded-full transition-colors">
                      <Trash2 size={9} />Eliminar
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────

export default function PropertiesPage() {
  const { token } = useAuthStore();
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState<{ total: number; by_status: Record<string, number> }>({ total: 0, by_status: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOp, setFilterOp] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  const [galleryProp, setGalleryProp] = useState<Property | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchProperties = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType) params.set("property_type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      if (filterOp) params.set("operation_type", filterOp);
      const res = await fetch(`${API}/properties/?${params}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProperties(data.properties ?? []);
        setStats({ total: data.total ?? 0, by_status: data.by_status ?? {} });
      } else if (res.status === 401) {
        toast.error("Sesión expirada, vuelve a iniciar sesión");
      } else {
        toast.error(`Error al cargar propiedades (${res.status})`);
      }
    } catch (e) {
      console.error("fetchProperties error:", e);
      toast.error("No se pudo conectar al servidor");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, filterType, filterStatus, filterOp]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar esta propiedad?")) return;
    const res = await fetch(`${API}/properties/${id}`, { method: "DELETE", headers });
    if (res.ok) {
      setProperties(prev => prev.filter(p => p.id !== id));
      setStats(s => ({ ...s, total: s.total - 1 }));
      toast.success("Propiedad eliminada");
    }
  }

  function handleSaved(saved: Property) {
    setProperties(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n; }
      return [saved, ...prev];
    });
    setStats(s => ({ ...s, total: editingProp ? s.total : s.total + 1 }));
    setShowForm(false);
    setEditingProp(null);
  }

  function handleUpdated(updated: Property) {
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (galleryProp?.id === updated.id) setGalleryProp(updated);
  }

  const filtered = properties.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) ||
      (p.neighborhood ?? "").toLowerCase().includes(q) ||
      (p.city ?? "").toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col gap-6 p-6 max-w-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Building2 size={24} className="text-indigo-500" />Propiedades
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tu catálogo de propiedades e imágenes para contenido</p>
        </div>
        <button onClick={() => { setEditingProp(null); setShowForm(true); }}
          className="btn-primary" style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
          <Plus size={15} />Nueva propiedad
        </button>
      </div>

      {/* Stats */}
      <StatStrip total={stats.total} byStatus={stats.by_status} />

      {/* Filters */}
      <div className="card-stripe p-3 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, colonia, ciudad..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-sm bg-white border border-border outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
        </div>
        {/* Type */}
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-muted-foreground" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm bg-white border border-border outline-none focus:border-indigo-400 transition-all text-foreground">
            <option value="">Todos los tipos</option>
            {PROPERTY_TYPES.map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm bg-white border border-border outline-none focus:border-indigo-400 transition-all text-foreground">
            <option value="">Todos los estados</option>
            <option value="disponible">Disponible</option>
            <option value="reservada">Reservada</option>
            <option value="vendida">Vendida</option>
            <option value="rentada">Rentada</option>
            <option value="no_disponible">No disponible</option>
          </select>
          <select value={filterOp} onChange={e => setFilterOp(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm bg-white border border-border outline-none focus:border-indigo-400 transition-all text-foreground">
            <option value="">Venta y renta</option>
            <option value="venta">Venta</option>
            <option value="renta">Renta</option>
          </select>
        </div>
        <button onClick={fetchProperties} className="btn-secondary gap-1.5">
          <RefreshCw size={13} />Actualizar
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="bg-slate-100 rounded-t-2xl" style={{ aspectRatio: "4/3" }} />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-4 bg-slate-100 rounded" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <Building2 size={36} className="text-indigo-300" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {search || filterType || filterStatus ? "Sin resultados" : "Aún no tienes propiedades"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {search || filterType || filterStatus
              ? "Prueba con otros filtros o términos de búsqueda"
              : "Agrega tu primera propiedad y empieza a crear contenido con sus fotos"
            }
          </p>
          {!search && !filterType && !filterStatus && (
            <button onClick={() => setShowForm(true)} className="btn-primary mt-5"
              style={{ background: "linear-gradient(135deg, #4F46E5, #7C3AED)" }}>
              <Plus size={14} />Agregar propiedad
            </button>
          )}
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(prop => (
              <PropertyCard key={prop.id} prop={prop}
                onEdit={() => { setEditingProp(prop); setShowForm(true); }}
                onDelete={() => handleDelete(prop.id)}
                onViewImages={() => setGalleryProp(prop)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Count */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Eye size={12} />Mostrando {filtered.length} de {stats.total} propiedades
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showForm && (
          <PropertyFormModal
            property={editingProp}
            onClose={() => { setShowForm(false); setEditingProp(null); }}
            onSaved={handleSaved}
            token={token ?? ""}
          />
        )}
        {galleryProp && (
          <ImageGalleryModal
            property={galleryProp}
            onClose={() => setGalleryProp(null)}
            onUpdated={handleUpdated}
            token={token ?? ""}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
