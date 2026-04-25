"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Inbox, Send, Plus, RefreshCw, Settings, Trash2, Eye, EyeOff,
  Search, ChevronDown, X, Check, AlertCircle, Loader2, ExternalLink,
  FileText, Reply, Clock, User, AtSign, Link2, Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/auth";
import { useSearchParams } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmailAccount {
  id: string;
  provider: "imap" | "gmail" | "outlook";
  email_address: string;
  display_name?: string;
  is_active: boolean;
  last_synced_at?: string;
  sync_error?: string;
  created_at: string;
}

interface Email {
  id: string;
  email_account_id: string;
  lead_id?: string;
  direction: "inbound" | "outbound";
  from_email: string;
  from_name?: string;
  to_emails: string[];
  cc_emails: string[];
  subject?: string;
  body_html?: string;
  body_text?: string;
  is_read: boolean;
  sent_at?: string;
  received_at?: string;
  created_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  created_at: string;
  updated_at: string;
}

const PROVIDER_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  gmail:   { label: "Gmail",         color: "bg-red-50 text-red-700 border-red-200",    icon: "G" },
  outlook: { label: "Outlook",       color: "bg-blue-50 text-blue-700 border-blue-200",  icon: "O" },
  imap:    { label: "Email (IMAP)",  color: "bg-slate-50 text-slate-700 border-slate-200", icon: "@" },
};

// ── Compose Modal ─────────────────────────────────────────────────────────────

function ComposeModal({
  onClose, accounts, templates, token, prefill,
  onSent,
}: {
  onClose: () => void;
  accounts: EmailAccount[];
  templates: EmailTemplate[];
  token: string;
  prefill?: { toEmail?: string; leadId?: string };
  onSent: (email: Email) => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [toEmails, setToEmails] = useState(prefill?.toEmail ? [prefill.toEmail] : [] as string[]);
  const [toInput, setToInput] = useState(prefill?.toEmail ?? "");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  function addEmail(list: string[], setList: (v: string[]) => void, val: string) {
    const trimmed = val.trim().replace(/,\s*$/, "");
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
  }

  function applyTemplate(id: string) {
    const t = templates.find((t) => t.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBodyHtml(t.body_html);
    setSelectedTemplate(id);
  }

  async function handleSend() {
    const allTo = [...toEmails, ...(toInput.trim() ? [toInput.trim()] : [])];
    if (!accountId) return toast.error("Selecciona una cuenta de email");
    if (!allTo.length) return toast.error("Agrega al menos un destinatario");
    if (!subject.trim()) return toast.error("El asunto es requerido");
    setSending(true);
    try {
      const res = await fetch(`${API}/email/send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          to_emails: allTo,
          cc_emails: [...ccEmails, ...(ccInput.trim() ? [ccInput.trim()] : [])],
          subject,
          body_html: bodyHtml,
          body_text: "",
          lead_id: prefill?.leadId ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al enviar");
      }
      const sent: Email = await res.json();
      toast.success("Email enviado correctamente");
      onSent(sent);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al enviar");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-sky-500 to-blue-600">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-white" />
            <span className="text-sm font-semibold text-white">Nuevo Email</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Account selector */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Desde</label>
            <select
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white text-foreground outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.display_name || a.email_address} · {PROVIDER_LABELS[a.provider]?.label}
                </option>
              ))}
            </select>
          </div>

          {/* Template picker */}
          {templates.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Plantilla</label>
              <select
                value={selectedTemplate}
                onChange={(e) => applyTemplate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white text-foreground outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
              >
                <option value="">— Sin plantilla —</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          )}

          {/* To */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Para</label>
            <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-xl focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100 bg-white transition-all">
              {toEmails.map((e) => (
                <span key={e} className="flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-medium px-2 py-0.5 rounded-full border border-sky-200">
                  {e}
                  <button onClick={() => setToEmails(toEmails.filter((x) => x !== e))} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                </span>
              ))}
              <input
                type="email"
                value={toInput}
                onChange={(e) => setToInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "," || e.key === " ") {
                    e.preventDefault();
                    addEmail(toEmails, setToEmails, toInput);
                    setToInput("");
                  }
                }}
                onBlur={() => { addEmail(toEmails, setToEmails, toInput); setToInput(""); }}
                placeholder="email@ejemplo.com"
                className="flex-1 min-w-[180px] outline-none text-sm bg-transparent"
              />
            </div>
            <button onClick={() => setShowCc(!showCc)} className="mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {showCc ? "— Ocultar CC" : "+ Agregar CC"}
            </button>
          </div>

          {/* CC */}
          {showCc && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">CC</label>
              <div className="flex flex-wrap gap-1.5 p-2 border border-border rounded-xl focus-within:border-sky-400 bg-white transition-all">
                {ccEmails.map((e) => (
                  <span key={e} className="flex items-center gap-1 bg-slate-50 text-slate-700 text-xs font-medium px-2 py-0.5 rounded-full border">
                    {e}
                    <button onClick={() => setCcEmails(ccEmails.filter((x) => x !== e))}><X size={10} /></button>
                  </span>
                ))}
                <input
                  type="email"
                  value={ccInput}
                  onChange={(e) => setCcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addEmail(ccEmails, setCcEmails, ccInput);
                      setCcInput("");
                    }
                  }}
                  placeholder="cc@ejemplo.com"
                  className="flex-1 outline-none text-sm bg-transparent"
                />
              </div>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Asunto</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Asunto del email"
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white text-foreground outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Mensaje (HTML o texto)</label>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={8}
              placeholder="Escribe tu mensaje aquí. Puedes usar HTML básico: <b>negrita</b>, <a href='...'>enlace</a>..."
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white text-foreground outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all resize-none font-mono"
            />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border bg-slate-50/50 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white border border-border transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #0EA5E9, #2563EB)" }}
          >
            {sending ? <><Loader2 size={14} className="animate-spin" />Enviando...</> : <><Send size={14} />Enviar email</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Connect Account Modal ─────────────────────────────────────────────────────

function ConnectAccountModal({
  onClose, token, onConnected,
}: {
  onClose: () => void;
  token: string;
  onConnected: (acc: EmailAccount) => void;
}) {
  const [step, setStep] = useState<"choose" | "imap">("choose");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [connecting, setConnecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Auto-complete IMAP/SMTP from known presets
  function autoFillPreset(emailAddr: string) {
    const domain = emailAddr.split("@")[1]?.toLowerCase();
    const presets: Record<string, { imap: string; smtp: string }> = {
      "gmail.com":     { imap: "imap.gmail.com",        smtp: "smtp.gmail.com" },
      "googlemail.com":{ imap: "imap.gmail.com",        smtp: "smtp.gmail.com" },
      "outlook.com":   { imap: "outlook.office365.com", smtp: "smtp.office365.com" },
      "hotmail.com":   { imap: "outlook.office365.com", smtp: "smtp.office365.com" },
      "live.com":      { imap: "outlook.office365.com", smtp: "smtp.office365.com" },
      "yahoo.com":     { imap: "imap.mail.yahoo.com",   smtp: "smtp.mail.yahoo.com" },
      "icloud.com":    { imap: "imap.mail.me.com",      smtp: "smtp.mail.me.com" },
      "zoho.com":      { imap: "imap.zoho.com",         smtp: "smtp.zoho.com" },
    };
    if (domain && presets[domain]) {
      setImapHost(presets[domain].imap);
      setSmtpHost(presets[domain].smtp);
    }
  }

  async function handleGmailOAuth() {
    const res = await fetch(`${API}/email/accounts/connect-gmail`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { toast.error("Gmail OAuth no configurado en el servidor"); return; }
    const { auth_url } = await res.json();
    window.location.href = auth_url;
  }

  async function handleOutlookOAuth() {
    const res = await fetch(`${API}/email/accounts/connect-outlook`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { toast.error("Outlook OAuth no configurado en el servidor"); return; }
    const { auth_url } = await res.json();
    window.location.href = auth_url;
  }

  async function handleImapConnect() {
    if (!email || !password) return toast.error("Email y contraseña son requeridos");
    setConnecting(true);
    try {
      const res = await fetch(`${API}/email/accounts/connect-imap`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email_address: email,
          password,
          display_name: displayName || email,
          imap_host: imapHost || undefined,
          imap_port: imapHost ? parseInt(imapPort) : undefined,
          smtp_host: smtpHost || undefined,
          smtp_port: smtpHost ? parseInt(smtpPort) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al conectar");
      }
      const acc: EmailAccount = await res.json();
      toast.success(`Cuenta ${acc.email_address} conectada`);
      onConnected(acc);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al conectar");
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-sky-500 to-blue-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link2 size={16} className="text-white" />
              <span className="text-sm font-semibold text-white">Conectar cuenta de email</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">Elige el tipo de cuenta que quieres conectar:</p>

              {/* Gmail OAuth */}
              <button
                onClick={handleGmailOAuth}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-sky-300 hover:bg-sky-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-lg font-bold text-red-600 flex-shrink-0">G</div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Gmail / Google Workspace</p>
                  <p className="text-xs text-muted-foreground">Conexión segura vía OAuth2 — sin contraseñas</p>
                </div>
                <ExternalLink size={14} className="ml-auto text-muted-foreground group-hover:text-sky-500 transition-colors" />
              </button>

              {/* Outlook OAuth */}
              <button
                onClick={handleOutlookOAuth}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-sky-300 hover:bg-sky-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-lg font-bold text-blue-600 flex-shrink-0">O</div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Outlook / Microsoft 365</p>
                  <p className="text-xs text-muted-foreground">Conexión segura vía OAuth2 con Microsoft</p>
                </div>
                <ExternalLink size={14} className="ml-auto text-muted-foreground group-hover:text-sky-500 transition-colors" />
              </button>

              {/* IMAP */}
              <button
                onClick={() => setStep("imap")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-sky-300 hover:bg-sky-50 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-600 flex-shrink-0">@</div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Otro proveedor (IMAP/SMTP)</p>
                  <p className="text-xs text-muted-foreground">Yahoo, Zoho, dominio propio, etc.</p>
                </div>
                <ChevronDown size={14} className="ml-auto text-muted-foreground rotate-[-90deg] group-hover:text-sky-500 transition-colors" />
              </button>
            </div>
          )}

          {step === "imap" && (
            <div className="space-y-4">
              <button onClick={() => setStep("choose")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2">
                <ChevronDown className="rotate-90" size={13} /> Volver
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
                  <input type="email" value={email}
                    onChange={(e) => { setEmail(e.target.value); autoFillPreset(e.target.value); }}
                    placeholder="tu@empresa.com"
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Contraseña de aplicación</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="Contraseña o App Password"
                      className="w-full px-3 py-2 pr-10 rounded-xl border border-border text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                    />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">Para Gmail/Outlook usa una <a href="https://support.google.com/accounts/answer/185833" target="_blank" className="underline text-sky-600">Contraseña de aplicación</a>, no tu contraseña normal.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Servidor IMAP</label>
                  <input type="text" value={imapHost} onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.tu-dominio.com"
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Puerto IMAP</label>
                  <input type="number" value={imapPort} onChange={(e) => setImapPort(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Servidor SMTP</label>
                  <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.tu-dominio.com"
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Puerto SMTP</label>
                  <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-border text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleImapConnect}
                disabled={connecting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all"
                style={{ background: "linear-gradient(135deg, #0EA5E9, #2563EB)" }}
              >
                {connecting ? <><Loader2 size={14} className="animate-spin" />Verificando conexión...</> : <><Check size={14} />Conectar cuenta</>}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Email Detail Panel ────────────────────────────────────────────────────────

function EmailDetail({ email, onClose, onReply }: { email: Email; onClose: () => void; onReply: () => void }) {
  const dateStr = email.received_at || email.sent_at || email.created_at;
  const date = dateStr ? new Date(dateStr).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" }) : "";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-white flex-shrink-0">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-foreground leading-snug">{email.subject || "(sin asunto)"}</h3>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs w-14 flex-shrink-0">De</span>
            <span className="font-medium text-foreground truncate">
              {email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground text-xs w-14 flex-shrink-0">Para</span>
            <span className="text-muted-foreground truncate">{email.to_emails.join(", ")}</span>
          </div>
          {email.cc_emails.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground text-xs w-14 flex-shrink-0">CC</span>
              <span className="text-muted-foreground truncate">{email.cc_emails.join(", ")}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={11} />
            <span>{date}</span>
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
              email.direction === "inbound" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-green-50 text-green-700 border-green-200"
            }`}>
              {email.direction === "inbound" ? "Recibido" : "Enviado"}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5">
        {email.body_html ? (
          <div
            className="prose prose-sm max-w-none text-foreground"
            dangerouslySetInnerHTML={{ __html: email.body_html }}
          />
        ) : (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans">{email.body_text}</pre>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border bg-slate-50/50 flex gap-2">
        <button
          onClick={onReply}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #0EA5E9, #2563EB)" }}
        >
          <Reply size={14} /> Responder
        </button>
      </div>
    </div>
  );
}

// ── Template Manager ──────────────────────────────────────────────────────────

function TemplateManager({ token, onClose }: { token: string; onClose: () => void }) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ name: "", subject: "", body_html: "" });
  const [saving, setSaving] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${API}/email/templates`, { headers });
    if (r.ok) setTemplates(await r.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    try {
      const url = editing ? `${API}/email/templates/${editing.id}` : `${API}/email/templates`;
      const method = editing ? "PUT" : "POST";
      const r = await fetch(url, { method, headers, body: JSON.stringify(form) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || "Error");
      toast.success(editing ? "Plantilla actualizada" : "Plantilla creada");
      setEditing(null);
      setForm({ name: "", subject: "", body_html: "" });
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    const r = await fetch(`${API}/email/templates/${id}`, { method: "DELETE", headers });
    if (r.ok) { toast.success("Plantilla eliminada"); load(); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-violet-600" />
            <span className="text-sm font-semibold text-foreground">Plantillas de Email</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Form */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{editing ? "Editar plantilla" : "Nueva plantilla"}</p>
            <input type="text" placeholder="Nombre de la plantilla" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white outline-none focus:border-violet-400 transition-all" />
            <input type="text" placeholder="Asunto del email" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white outline-none focus:border-violet-400 transition-all" />
            <textarea rows={5} placeholder="Cuerpo del email (HTML permitido)" value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-border text-sm bg-white outline-none focus:border-violet-400 transition-all resize-none font-mono" />
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !form.name || !form.subject}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {editing ? "Actualizar" : "Crear"}
              </button>
              {editing && <button onClick={() => { setEditing(null); setForm({ name: "", subject: "", body_html: "" }); }} className="px-4 py-2 rounded-xl text-sm text-muted-foreground border border-border hover:bg-slate-100 transition-all">Cancelar</button>}
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aún no tienes plantillas</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-white hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(t); setForm({ name: t.name, subject: t.subject, body_html: t.body_html }); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors"><FileText size={14} /></button>
                    <button onClick={() => del(t.id)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function EmailPage() {
  const { token } = useAuthStore();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [emails, setEmails] = useState<Email[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filterDir, setFilterDir] = useState<"" | "inbound" | "outbound">("");
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<Email | null>(null);

  const headers = { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" };

  // Show success toast when redirected back from OAuth
  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected) {
      toast.success(`Cuenta de ${connected === "gmail" ? "Gmail" : "Outlook"} conectada correctamente`);
    }
  }, [searchParams]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, mailRes, tmplRes] = await Promise.all([
        fetch(`${API}/email/accounts`, { headers }),
        fetch(`${API}/email/inbox?limit=100${filterDir ? `&direction=${filterDir}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`, { headers }),
        fetch(`${API}/email/templates`, { headers }),
      ]);
      if (accRes.ok) setAccounts(await accRes.json());
      if (mailRes.ok) setEmails(await mailRes.json());
      if (tmplRes.ok) setTemplates(await tmplRes.json());
    } finally {
      setLoading(false);
    }
  }, [token, filterDir, search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function syncAccount(accountId: string) {
    setSyncing(accountId);
    const toastId = toast.loading("Sincronizando bandeja...");
    try {
      const r = await fetch(`${API}/email/accounts/${accountId}/sync`, { method: "POST", headers });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        toast.success(`${data.synced ?? 0} emails nuevos sincronizados`, { id: toastId });
        fetchAll();
      } else {
        toast.error(data.detail || "Error al sincronizar", { id: toastId });
      }
    } finally {
      setSyncing(null);
    }
  }

  async function disconnectAccount(id: string) {
    if (!confirm("¿Desconectar esta cuenta?")) return;
    const r = await fetch(`${API}/email/accounts/${id}`, { method: "DELETE", headers });
    if (r.ok) { toast.success("Cuenta desconectada"); fetchAll(); }
  }

  async function markRead(emailId: string) {
    await fetch(`${API}/email/inbox/${emailId}/read`, { method: "PATCH", headers });
    setEmails((prev) => prev.map((e) => e.id === emailId ? { ...e, is_read: true } : e));
  }

  function openEmail(email: Email) {
    setSelectedEmail(email);
    if (!email.is_read) markRead(email.id);
  }

  const unreadCount = emails.filter((e) => !e.is_read && e.direction === "inbound").length;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left panel: accounts + email list ── */}
      <div className={`flex flex-col border-r border-border bg-white transition-all ${selectedEmail ? "hidden md:flex md:w-96" : "flex-1 md:w-96"}`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-border bg-gradient-to-r from-sky-500 to-blue-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Mail size={18} className="text-white" />
              <span className="text-base font-bold text-white">Email CRM</span>
              {unreadCount > 0 && (
                <span className="bg-white text-sky-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setShowTemplates(true)} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors" title="Plantillas">
                <FileText size={15} />
              </button>
              <button onClick={() => setShowConnect(true)} className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors" title="Conectar cuenta">
                <Settings size={15} />
              </button>
              <button
                onClick={() => setShowCompose(true)}
                disabled={accounts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-sky-600 hover:bg-sky-50 disabled:opacity-50 transition-all"
              >
                <Plus size={13} /> Nuevo
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-white/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar emails..."
              className="w-full bg-white/20 text-white placeholder-white/60 text-sm pl-8 pr-3 py-2 rounded-xl border border-white/30 outline-none focus:bg-white/30 transition-all"
            />
          </div>
        </div>

        {/* Accounts strip */}
        {accounts.length > 0 && (
          <div className="px-3 py-2 border-b border-border bg-slate-50/50 flex items-center gap-2 overflow-x-auto">
            {accounts.map((acc) => {
              const p = PROVIDER_LABELS[acc.provider] || PROVIDER_LABELS.imap;
              return (
                <div key={acc.id} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${p.color}`}>
                    <span className="font-bold">{p.icon}</span>
                    <span className="max-w-[100px] truncate">{acc.email_address.split("@")[0]}</span>
                  </div>
                  <button
                    onClick={() => syncAccount(acc.id)}
                    disabled={syncing === acc.id}
                    className="p-1 rounded-full text-muted-foreground hover:text-sky-600 transition-colors"
                    title="Sincronizar"
                  >
                    <RefreshCw size={12} className={syncing === acc.id ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => disconnectAccount(acc.id)}
                    className="p-1 rounded-full text-muted-foreground hover:text-red-500 transition-colors"
                    title="Desconectar"
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex border-b border-border">
          {(["", "inbound", "outbound"] as const).map((dir) => (
            <button
              key={dir}
              onClick={() => setFilterDir(dir)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${filterDir === dir ? "text-sky-600 border-b-2 border-sky-500" : "text-muted-foreground hover:text-foreground"}`}
            >
              {dir === "" ? <><Inbox size={12} className="inline mr-1" />Todos</> : dir === "inbound" ? "Recibidos" : "Enviados"}
            </button>
          ))}
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-4">
              <div className="w-14 h-14 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center">
                <Mail size={24} className="text-sky-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Conecta tu email</p>
                <p className="text-sm text-muted-foreground">Conecta Gmail, Outlook o cualquier cuenta IMAP para gestionar tus correos desde el CRM.</p>
              </div>
              <button
                onClick={() => setShowConnect(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, #0EA5E9, #2563EB)" }}
              >
                <Plus size={14} /> Conectar cuenta
              </button>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 size={24} className="animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6 gap-3">
              <Inbox size={28} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Sin emails. Haz clic en <strong>↻</strong> para sincronizar.</p>
            </div>
          ) : (
            emails.map((email) => (
              <button
                key={email.id}
                onClick={() => openEmail(email)}
                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-sky-50/50 transition-colors ${selectedEmail?.id === email.id ? "bg-sky-50 border-l-2 border-l-sky-500" : ""} ${!email.is_read && email.direction === "inbound" ? "bg-white" : "bg-slate-50/30"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {!email.is_read && email.direction === "inbound" && (
                      <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-1" />
                    )}
                    <div className="min-w-0">
                      <p className={`text-xs truncate ${!email.is_read && email.direction === "inbound" ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                        {email.direction === "inbound" ? (email.from_name || email.from_email) : `→ ${email.to_emails[0] || ""}`}
                      </p>
                      <p className={`text-xs truncate ${!email.is_read && email.direction === "inbound" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {email.subject || "(sin asunto)"}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {email.body_text?.slice(0, 60) || ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 whitespace-nowrap">
                    {new Date(email.received_at || email.sent_at || email.created_at).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: email detail ── */}
      <div className={`flex-1 ${selectedEmail ? "flex" : "hidden md:flex"} flex-col bg-white`}>
        {selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            onClose={() => setSelectedEmail(null)}
            onReply={() => { setReplyTo(selectedEmail); setShowCompose(true); }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-muted-foreground">
            <Mail size={40} className="opacity-20" />
            <p className="text-sm">Selecciona un email para verlo</p>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showConnect && (
          <ConnectAccountModal
            token={token ?? ""}
            onClose={() => setShowConnect(false)}
            onConnected={(acc) => { setAccounts((prev) => [...prev, acc]); syncAccount(acc.id); }}
          />
        )}
        {showCompose && (
          <ComposeModal
            token={token ?? ""}
            accounts={accounts}
            templates={templates}
            onClose={() => { setShowCompose(false); setReplyTo(null); }}
            prefill={replyTo ? { toEmail: replyTo.from_email } : undefined}
            onSent={(email) => setEmails((prev) => [email, ...prev])}
          />
        )}
        {showTemplates && (
          <TemplateManager token={token ?? ""} onClose={() => setShowTemplates(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
