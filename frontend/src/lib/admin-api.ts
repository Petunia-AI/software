import { adminAxios } from "@/store/admin-auth";

export const adminApi = {
  overview:   () => adminAxios.get("/admin/overview"),
  businesses: () => adminAxios.get("/admin/businesses"),
  toggleBiz:  (id: string) => adminAxios.patch(`/admin/businesses/${id}/toggle`),
  users:      () => adminAxios.get("/admin/users"),
  toggleUser: (id: string) => adminAxios.patch(`/admin/users/${id}/toggle`),
  createUser: (data: { email: string; password: string; full_name: string; is_superuser?: boolean }) =>
    adminAxios.post("/admin/users", data),
  analytics:  () => adminAxios.get("/admin/analytics"),
  getSettings: () => adminAxios.get("/admin/settings"),
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
  }) => adminAxios.patch("/admin/settings", data),
  testTwilio:     () => adminAxios.post("/admin/whatsapp/test"),
  testMetaWA:     (phone_number_id: string, access_token: string) =>
    adminAxios.post("/admin/whatsapp-meta/test", null, { params: { phone_number_id, access_token } }),
  testMessenger:  (page_id: string, access_token: string) =>
    adminAxios.post("/admin/messenger/test", null, { params: { page_id, access_token } }),
};
