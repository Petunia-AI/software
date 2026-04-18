import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Inyectar token automáticamente
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejo de errores global
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("auth-storage");
      document.cookie = "auth_token=; path=/; max-age=0";
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ============ AUTH ============
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (email: string, password: string, full_name: string) =>
    api.post("/auth/register", { email, password, full_name }),
  me: () => api.get("/auth/me"),
};

// ============ CONVERSATIONS ============
export const conversationsApi = {
  list: (params?: { status?: string; channel?: string; limit?: number }) =>
    api.get("/conversations", { params }),
  get: (id: string) => api.get(`/conversations/${id}`),
  start: (channel: string = "webchat", lead_name?: string) =>
    api.post("/conversations/start", null, { params: { channel, lead_name } }),
  sendMessage: (conversation_id: string, content: string) =>
    api.post("/conversations/send", { conversation_id, content }),
  takeover: (id: string) => api.post(`/conversations/${id}/takeover`),
  release: (id: string) => api.post(`/conversations/${id}/release`),
};

// ============ LEADS ============
export const leadsApi = {
  list: (params?: { stage?: string; min_score?: number; limit?: number }) =>
    api.get("/leads", { params }),
  get: (id: string) => api.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => api.post("/leads", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  updateStage: (id: string, stage: string) =>
    api.patch(`/leads/${id}/stage`, { stage }),
  exportUrl: (format: "csv" | "xlsx", stage?: string) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const base = process.env.NEXT_PUBLIC_API_URL ?? "/api";
    const params = new URLSearchParams({ format });
    if (stage) params.set("stage", stage);
    return { url: `${base}/leads/export?${params}`, token };
  },
  import: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/leads/import", form, {
      headers: { "Content-Type": undefined },
    });
  },
};

// ============ FOLLOWUPS ============
export const followupsApi = {
  stats: () => api.get("/followups/stats"),
  calendar: (year?: number, month?: number) =>
    api.get("/followups/calendar", { params: { year, month } }),
  list: (params?: {
    status?: string; priority?: string; followup_type?: string;
    lead_id?: string; assigned_to?: string; period?: string;
    date_from?: string; date_to?: string; limit?: number;
  }) => api.get("/followups", { params }),
  create: (data: {
    lead_id: string; followup_type?: string; title: string;
    description?: string; priority?: string; scheduled_at: string;
    assigned_to?: string; notify_email?: boolean; notify_whatsapp?: boolean;
  }) => api.post("/followups", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/followups/${id}`, data),
  complete: (id: string, outcome?: string) =>
    api.patch(`/followups/${id}/complete`, null, { params: { outcome } }),
  cancel: (id: string) => api.delete(`/followups/${id}`),
  // Lead activities
  getActivities: (leadId: string) => api.get(`/leads/${leadId}/activities`),
  createActivity: (leadId: string, data: {
    activity_type?: string; title: string; description?: string;
    outcome?: string; scheduled_at?: string; completed_at?: string;
  }) => api.post(`/leads/${leadId}/activities`, data),
};

// ============ ANALYTICS ============
export const analyticsApi = {
  dashboard:         () => api.get("/analytics/dashboard"),
  trend:             (days?: number) => api.get("/analytics/conversations/trend", { params: { days } }),
  agentPerformance:  () => api.get("/analytics/agents/performance"),
  leadsFunnel:       (days?: number) => api.get("/analytics/leads/funnel", { params: { days } }),
  scoreDistribution: () => api.get("/analytics/leads/score-distribution"),
  channelTrend:      (days?: number) => api.get("/analytics/conversations/by-channel-trend", { params: { days } }),
};

// ============ BILLING ============
export const billingApi = {
  getSubscription:     () => api.get("/billing/subscription"),
  getPlans:            () => api.get("/billing/plans"),
  createCheckout: (plan: string, successUrl: string, cancelUrl: string) =>
    api.post("/billing/checkout", { plan, success_url: successUrl, cancel_url: cancelUrl }),
  createPortalSession: (returnUrl: string) =>
    api.post("/billing/portal", { return_url: returnUrl }),
  createSetupIntent:   () => api.post("/billing/setup-intent"),
  attachPaymentMethod: (payment_method_id: string) =>
    api.post("/billing/attach-payment-method", { payment_method_id }),
  getPaymentMethod:    () => api.get("/billing/payment-method"),
};

// ============ BUSINESS ============
export const businessApi = {
  get: () => api.get("/business/"),
  update: (data: Record<string, unknown>) => api.patch("/business/", data),
  getAgents: () => api.get("/business/agents"),
  createAgent: (agent_type: string, persona_name: string, persona_tone: string) =>
    api.post("/business/agents", null, {
      params: { agent_type, persona_name, persona_tone },
    }),
};

// ============ META OAUTH ============
export const metaApi = {
  /** Obtiene la URL de Meta OAuth a la que redirigir al usuario */
  getConnectUrl: () => api.get<{ url: string; redirect_uri: string }>("/meta/connect"),
  /** Estado de conexión + páginas + números WA */
  getStatus: () => api.get("/meta/status"),
  /** Selecciona qué página usar para Messenger + Instagram */
  selectPage: (page_id: string) =>
    api.post("/meta/select-page", null, { params: { page_id } }),
  /** Selecciona qué número de WA usar */
  selectWhatsApp: (phone_number_id: string) =>
    api.post("/meta/select-whatsapp", null, { params: { phone_number_id } }),
  /** Desconecta la cuenta de Meta */
  disconnect: () => api.post("/meta/disconnect"),
  /** Renueva el long-lived token antes de expirar */
  refreshToken: () => api.post("/meta/refresh-token"),
  /** Prueba un canal: 'wa' | 'instagram' | 'messenger' */
  testChannel: (channel: "wa" | "instagram" | "messenger") =>
    api.post<{ ok: boolean; message: string }>(`/meta/test/${channel}`),
  /** Re-suscribe webhooks de páginas */
  resubscribeWebhooks: () => api.post("/meta/resubscribe-webhooks"),
};

// ============ LINKEDIN OAUTH ============
export const linkedinApi = {
  getConnectUrl: () => api.get<{ url: string }>("/linkedin/connect"),
  getStatus:     () => api.get("/linkedin/status"),
  disconnect:    () => api.post("/linkedin/disconnect"),
  post:          (text: string, image_url?: string, use_org?: boolean) =>
    api.post("/linkedin/post", { text, image_url, use_org }),
  getComments:   (post_urn: string) =>
    api.get("/linkedin/comments", { params: { post_urn } }),
  reply:         (post_urn: string, text: string, comment_urn?: string, use_org?: boolean) =>
    api.post("/linkedin/reply", { post_urn, comment_urn, text, use_org }),
};

// ============ TIKTOK OAUTH ============
export const tiktokApi = {
  getConnectUrl: () => api.get<{ url: string }>("/tiktok/connect"),
  getStatus:     () => api.get("/tiktok/status"),
  disconnect:    () => api.post("/tiktok/disconnect"),
  publish:       (video_url: string, title?: string, privacy?: string) =>
    api.post("/tiktok/publish", { video_url, title, privacy }),
  getVideos:     () => api.get("/tiktok/videos"),
  getComments:   (video_id: string) =>
    api.get("/tiktok/comments", { params: { video_id } }),
  reply:         (video_id: string, text: string, comment_id?: string) =>
    api.post("/tiktok/reply", { video_id, comment_id, text }),
};

// ============ AYRSHARE — Auto Global OAuth ============
export const ayrshareApi = {
  /** Crea o reutiliza perfil Ayrshare y devuelve la JWT URL para vincular redes */
  connect:     () => api.post<{ url: string; profile_key: string }>("/ayrshare/connect"),
  /** Estado de conexión + redes vinculadas */
  getStatus:   () => api.get("/ayrshare/status"),
  /** Refresca la lista de redes conectadas desde Ayrshare */
  refresh:     () => api.post("/ayrshare/refresh"),
  /** Elimina el perfil de Ayrshare */
  disconnect:  () => api.post("/ayrshare/disconnect"),
  /** Publica contenido en redes sociales del cliente */
  post:        (text: string, platforms: string[], media_urls?: string[], scheduled_date?: string) =>
    api.post("/ayrshare/post", { text, platforms, media_urls, scheduled_date }),
  /** Activa o desactiva el auto-respondedor de comentarios/mensajes */
  updateSettings: (autoresponder_enabled: boolean) =>
    api.patch("/ayrshare/settings", { autoresponder_enabled }),
  /** Registra el webhook de Petunia en Ayrshare */
  registerWebhook: () => api.post("/ayrshare/register-webhook"),
};

// ============ PROPERTIES ============
export const propertiesApi = {
  list: (params?: { status?: string; property_type?: string; operation?: string }) =>
    api.get("/properties/", { params }),
  get:    (id: string) => api.get(`/properties/${id}`),
  create: (data: Record<string, unknown>) => api.post("/properties/", data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/properties/${id}`, data),
  delete: (id: string) => api.delete(`/properties/${id}`),
  allImages: () => api.get("/properties/images/all"),
  uploadImage: (id: string, file: File, caption?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (caption) form.append("caption", caption);
    return api.post(`/properties/${id}/images`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  setCover:    (id: string, imageId: string) => api.post(`/properties/${id}/images/${imageId}/cover`),
  deleteImage: (id: string, imageId: string) => api.delete(`/properties/${id}/images/${imageId}`),
};
