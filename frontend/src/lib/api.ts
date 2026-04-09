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
    api.get("/conversations/", { params }),
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
    api.get("/leads/", { params }),
  get: (id: string) => api.get(`/leads/${id}`),
  create: (data: Record<string, unknown>) => api.post("/leads/", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
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
  getSubscription: () => api.get("/billing/subscription"),
  getPlans:        () => api.get("/billing/plans"),
  createCheckout: (plan: string, successUrl: string, cancelUrl: string) =>
    api.post("/billing/checkout", { plan, success_url: successUrl, cancel_url: cancelUrl }),
  createPortalSession: (returnUrl: string) =>
    api.post("/billing/portal", { return_url: returnUrl }),
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
