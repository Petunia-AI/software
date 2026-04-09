import { api } from "./api";

export const adminApi = {
  overview:   () => api.get("/admin/overview"),
  businesses: () => api.get("/admin/businesses"),
  toggleBiz:  (id: string) => api.patch(`/admin/businesses/${id}/toggle`),
  users:      () => api.get("/admin/users"),
  toggleUser: (id: string) => api.patch(`/admin/users/${id}/toggle`),
  createUser: (data: { email: string; password: string; full_name: string; is_superuser?: boolean }) =>
    api.post("/admin/users", data),
  analytics:  () => api.get("/admin/analytics"),
  getSettings: () => api.get("/admin/settings"),
  updateSettings: (data: {
    anthropic_api_key?: string;
    claude_model?: string;
    twilio_account_sid?: string;
    twilio_auth_token?: string;
    twilio_whatsapp_from?: string;
    meta_wa_verify_token?: string;
    meta_wa_app_secret?: string;
    instagram_verify_token?: string;
    instagram_app_secret?: string;
  }) => api.patch("/admin/settings", data),
  testTwilio:     () => api.post("/admin/whatsapp/test"),
  testMetaWA:     (phone_number_id: string, access_token: string) =>
    api.post("/admin/whatsapp-meta/test", null, { params: { phone_number_id, access_token } }),
  testMessenger:  (page_id: string, access_token: string) =>
    api.post("/admin/messenger/test", null, { params: { page_id, access_token } }),
};
