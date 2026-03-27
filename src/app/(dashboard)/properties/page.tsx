"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Ruler,
  Search,
  Loader2,
  Home,
  LandPlot,
  Store,
  Briefcase,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Property {
  id: string;
  title: string;
  description: string | null;
  propertyType: string;
  operationType: string;
  price: number | string | null;
  currency: string | null;
  area: number | string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  address: string | null;
  city: string | null;
  state: string | null;
  status: string;
  features: string[] | null;
  images?: string[] | null;
  createdAt: string;
}

const typeIcons: Record<string, any> = {
  HOUSE: Home,
  APARTMENT: Building2,
  LAND: LandPlot,
  COMMERCIAL: Store,
  OFFICE: Briefcase,
};

const typeLabels: Record<string, string> = {
  HOUSE: "Casa",
  APARTMENT: "Departamento",
  LAND: "Terreno",
  COMMERCIAL: "Comercial",
  OFFICE: "Oficina",
};

const operationLabels: Record<string, string> = {
  SALE: "Venta",
  RENT: "Renta",
  BOTH: "Venta/Renta",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "Disponible",
  RESERVED: "Reservado",
  SOLD: "Vendido",
  RENTED: "Rentado",
};

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  RESERVED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  SOLD: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  RENTED: "bg-[#4A154B]/10 text-[#4A154B] border-[#4A154B]/20",
};

function formatPrice(price: number | string | null, currency: string | null) {
  if (!price) return "Consultar";
  const num = typeof price === "string" ? parseFloat(price) : price;
  const cur = currency || "USD";
  return `$${num.toLocaleString("en-US")} ${cur}`;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    propertyType: "APARTMENT",
    operationType: "SALE",
    price: "",
    currency: "USD",
    area: "",
    bedrooms: "",
    bathrooms: "",
    parking: "",
    address: "",
    city: "Ciudad de México",
    state: "CDMX",
  });

  const loadProperties = () => {
    fetch("/api/properties")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setProperties(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProperties();
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("El título es requerido");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          propertyType: form.propertyType,
          operationType: form.operationType,
          price: form.price ? parseFloat(form.price) : null,
          currency: form.currency,
          area: form.area ? parseFloat(form.area) : null,
          bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
          bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
          parking: form.parking ? parseInt(form.parking) : null,
          address: form.address || null,
          city: form.city || null,
          state: form.state || null,
        }),
      });
      if (res.ok) {
        toast.success("Propiedad creada exitosamente");
        setShowNewDialog(false);
        setForm({
          title: "", description: "", propertyType: "APARTMENT", operationType: "SALE",
          price: "", currency: "USD", area: "", bedrooms: "", bathrooms: "", parking: "",
          address: "", city: "Ciudad de México", state: "CDMX",
        });
        loadProperties();
      } else {
        toast.error("Error al crear la propiedad");
      }
    } catch {
      toast.error("Error de conexión");
    }
    setSaving(false);
  };

  const filtered = properties.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.address || "").toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || p.propertyType === filterType;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Cpath d='M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18 18 36 36 18'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <Building2 className="h-5 w-5" />
              </div>
              <Badge className="bg-white/10 text-white/80 border-white/10 text-[10px] font-medium backdrop-blur-sm">
                Portafolio
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Propiedades</h1>
            <p className="text-white/70 text-sm max-w-md">
              {properties.length} propiedades en catálogo
            </p>
          </div>
          <Button
            size="sm"
            className="rounded-xl bg-white text-[#4A154B] hover:bg-white/90 font-semibold"
            onClick={() => setShowNewDialog(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva propiedad
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar propiedad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-muted/40 border-0"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Type filter chips */}
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterType === "all"
                ? "bg-primary text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Todos
          </button>
          {Object.entries(typeLabels).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilterType(k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filterType === k
                  ? "bg-primary text-white"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
          <div className="w-px h-6 bg-border/60 self-center mx-1" />
          {/* Status filter chips */}
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              filterStatus === "all"
                ? "bg-primary text-white"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            Todos
          </button>
          {Object.entries(statusLabels).map(([k, v]) => (
            <button
              key={k}
              onClick={() => setFilterStatus(k)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                filterStatus === k
                  ? "bg-primary text-white"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((property) => {
          const TypeIcon = typeIcons[property.propertyType] || Building2;
          return (
            <Card
              key={property.id}
              className="rounded-2xl border border-border/40 shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group overflow-hidden"
            >
              <CardContent className="p-0">
                <div className="h-44 relative overflow-hidden bg-gradient-to-br from-muted/80 to-muted/30">
                  {property.images && Array.isArray(property.images) && (property.images as string[])[0] ? (
                    <img
                      src={(property.images as string[])[0]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <TypeIcon className="h-12 w-12 text-muted-foreground/15" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <Badge className={`rounded-full text-[10px] border ${statusColors[property.status]}`}>
                      {statusLabels[property.status]}
                    </Badge>
                    <Badge className="rounded-full text-[10px] bg-background/80 text-foreground/70 border border-border/40">
                      {operationLabels[property.operationType]}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-sm leading-tight">
                      {property.title}
                    </h3>
                    {property.address && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {property.address}, {property.city}
                      </p>
                    )}
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {formatPrice(property.price, property.currency)}
                    {property.operationType === "RENT" && (
                      <span className="text-xs font-normal text-muted-foreground">/mes</span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/30">
                    {property.area && (
                      <span className="flex items-center gap-1">
                        <Ruler className="h-3 w-3" />
                        {Number(property.area)}m²
                      </span>
                    )}
                    {property.bedrooms !== null && property.bedrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <BedDouble className="h-3 w-3" />
                        {property.bedrooms}
                      </span>
                    )}
                    {property.bathrooms !== null && property.bathrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bath className="h-3 w-3" />
                        {property.bathrooms}
                      </span>
                    )}
                    {property.parking !== null && property.parking > 0 && (
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {property.parking}
                      </span>
                    )}
                  </div>
                  {property.features && Array.isArray(property.features) && property.features.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(property.features as string[]).slice(0, 3).map((f) => (
                        <Badge key={f} className="rounded-full text-[9px] bg-muted/50 text-muted-foreground border-0 font-normal">
                          {f}
                        </Badge>
                      ))}
                      {(property.features as string[]).length > 3 && (
                        <Badge className="rounded-full text-[9px] bg-muted/50 text-muted-foreground border-0 font-normal">
                          +{(property.features as string[]).length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Building2 className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No se encontraron propiedades</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Intenta cambiar los filtros</p>
        </div>
      )}

      {/* New Property Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Agregar
            </p>
            <DialogTitle>Nueva Propiedad</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid gap-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Título *
              </Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej: Departamento de lujo en Polanco"
                className="rounded-xl bg-muted/30 border border-border/60"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Descripción
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe la propiedad..."
                rows={3}
                className="rounded-xl bg-muted/30 border border-border/60"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Tipo
                </Label>
                <Select value={form.propertyType} onValueChange={(v) => setForm({ ...form, propertyType: v ?? "APARTMENT" })}>
                  <SelectTrigger className="rounded-xl bg-muted/30 border border-border/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Operación
                </Label>
                <Select value={form.operationType} onValueChange={(v) => setForm({ ...form, operationType: v ?? "SALE" })}>
                  <SelectTrigger className="rounded-xl bg-muted/30 border border-border/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(operationLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Precio
                </Label>
                <Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0" className="rounded-xl bg-muted/30 border border-border/60" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Moneda
                </Label>
                <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v ?? "USD" })}>
                  <SelectTrigger className="rounded-xl bg-muted/30 border border-border/60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="MXN">MXN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Área m²
                </Label>
                <Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} className="rounded-xl bg-muted/30 border border-border/60" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Recámaras
                </Label>
                <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} className="rounded-xl bg-muted/30 border border-border/60" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Baños
                </Label>
                <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} className="rounded-xl bg-muted/30 border border-border/60" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Parking
                </Label>
                <Input type="number" value={form.parking} onChange={(e) => setForm({ ...form, parking: e.target.value })} className="rounded-xl bg-muted/30 border border-border/60" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                Dirección
              </Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Calle y número" className="rounded-xl bg-muted/30 border border-border/60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Ciudad
                </Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="rounded-xl bg-muted/30 border border-border/60" />
              </div>
              <div className="grid gap-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Estado
                </Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="rounded-xl bg-muted/30 border border-border/60" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving} className="w-full bg-primary text-white rounded-xl hover:bg-foreground/90 border-0">
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" />Crear propiedad</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
