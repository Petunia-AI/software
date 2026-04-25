"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Inbox, Send, Plus, RefreshCw, Settings, Trash2, Eye, EyeOff,
  Search, ChevronDown, X, Check, AlertCircle, Loader2, ExternalLink,
  FileText, Reply, Clock, User, AtSign, Link2, Zap, Pencil, Bold,
  Italic, List, AlignLeft, Signature, Sparkles,
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
  signature_html?: string;
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

const PROVIDER_LABELS: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  gmail:   { label: "Gmail",        color: "text-red-600",   bg: "bg-red-50 border-red-200",   icon: "G" },
  outlook: { label: "Outlook",      color: "text-blue-600",  bg: "bg-blue-50 border-blue-200",  icon: "O" },
  imap:    { label: "IMAP",         color: "text-slate-600", bg: "bg-slate-50 border-slate-200", icon: "@" },
};

function initials(name?: string, email?: string): string {
  const src = name || email || "?";
  return src.split(/[\s@._-]/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

function avatarColor(str: string): string {
  const colors = ["bg-violet-500","bg-sky-500","bg-emerald-500","bg-amber-500","bg-rose-500","bg-indigo-500","bg-teal-500"];
  let h = 0; for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

// ── Rich text toolbar helpers ──────────────────────────────────────────────────

function execCmd(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

function RichToolbar({ targetRef }: { targetRef: React.RefObject<HTMLDivElement | null> }) {
  function cmd(c: string, v?: string) {
    targetRef.current?.focus();
    execCmd(c, v);
  }
  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-slate-50/80">
      <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("bold"); }}
        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors" title="Negrita (Ctrl+B)">
        <Bold size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("italic"); }}
        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors" title="Cursiva (Ctrl+I)">
        <Italic size={13} />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertUnorderedList"); }}
        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors" title="Lista">
        <List size={13} />
      </button>
      <button type="button" onMouseDown={(e) => { e.preventDefault(); cmd("insertOrderedList"); }}
        className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors" title="Lista numerada">
        <AlignLeft size={13} />
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button type="button" onMouseDown={(e) => {
        e.preventDefault();
        const url = prompt("URL del enlace:");
        if (url) cmd("createLink", url);
      }} className="p-1.5 rounded hover:bg-slate-200 text-slate-600 transition-colors" title="Insertar enlace">
        <Link2 size={13} />
      </button>
    </div>
  );
}

// ── Compose Modal ─────────────────────────────────────────────────────────────

function ComposeModal({
  onClose, accounts, templates, token, prefill, onSent,
}: {
  onClose: () => void;
  accounts: EmailAccount[];
  templates: EmailTemplate[];
  token: string;
  prefill?: { toEmail?: string; leadId?: string; subject?: string; replyAccountId?: string; bodyHtml?: string };
  onSent: (email: Email) => void;
}) {
  const [accountId, setAccountId] = useState(prefill?.replyAccountId ?? accounts[0]?.id ?? "");
  const [toEmails, setToEmails] = useState(prefill?.toEmail ? [prefill.toEmail] : [] as string[]);
  const [toInput, setToInput] = useState(prefill?.toEmail ?? "");
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState("");
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [sending, setSending] = useState(false);
  const [showCc, setShowCc] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const prefillApplied = useRef(false);

  const currentAccount = accounts.find((a) => a.id === accountId);

  // Initialize contenteditable with signature (and AI prefill on first render)
  useEffect(() => {
    if (bodyRef.current) {
      const sig = currentAccount?.signature_html
        ? `<br/><br/><div data-sig="1" style="border-top:1px solid #e2e8f0;margin-top:8px;padding-top:8px;color:#64748b;font-size:13px">${currentAccount.signature_html}</div>`
        : "";
      if (!prefillApplied.current && prefill?.bodyHtml) {
        bodyRef.current.innerHTML = prefill.bodyHtml + sig;
        prefillApplied.current = true;
      } else {
        bodyRef.current.innerHTML = sig;
      }
      // Move cursor to start
      const range = document.createRange();
      const sel = window.getSelection();
      range.setStart(bodyRef.current, 0);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  function addEmail(list: string[], setList: (v: string[]) => void, val: string) {
    const trimmed = val.trim().replace(/,\s*$/, "");
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed]);
  }

  function applyTemplate(id: string) {
    const t = templates.find((t) => t.id === id);
    if (!t) return;
    setSubject(t.subject);
    if (bodyRef.current) {
      const sig = currentAccount?.signature_html
        ? `<br/><br/><div data-sig="1" style="border-top:1px solid #e2e8f0;margin-top:8px;padding-top:8px;color:#64748b;font-size:13px">${currentAccount.signature_html}</div>`
        : "";
      bodyRef.current.innerHTML = t.body_html + sig;
    }
    setSelectedTemplate(id);
  }

  async function handleSend() {
    const allTo = [...toEmails, ...(toInput.trim() ? [toInput.trim()] : [])];
    if (!accountId) return toast.error("Selecciona una cuenta de email");
    if (!allTo.length) return toast.error("Agrega al menos un destinatario");
    if (!subject.trim()) return toast.error("El asunto es requerido");
    const bodyHtml = bodyRef.current?.innerHTML || "";
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
          body_text: bodyRef.current?.innerText || "",
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

  const bodyHtmlForPreview = bodyRef.current?.innerHTML ?? "";

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-900 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <Mail size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">
              {prefill?.subject ? `Re: ${prefill.subject}` : "Nuevo Email"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${showPreview ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              {showPreview ? "Editar" : "Vista previa"}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showPreview ? (
            <div className="p-6">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-border space-y-1">
                  <p className="text-xs"><span className="text-muted-foreground w-12 inline-block">Para:</span> <span className="font-medium">{[...toEmails, toInput].filter(Boolean).join(", ")}</span></p>
                  <p className="text-xs"><span className="text-muted-foreground w-12 inline-block">Asunto:</span> <span className="font-medium">{subject}</span></p>
                </div>
                <div className="p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: bodyHtmlForPreview }} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Fields */}
              <div className="px-5 pt-4 pb-2 space-y-3 border-b border-border">
                {/* From */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-10 flex-shrink-0 font-medium">De</span>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="flex-1 text-sm bg-transparent text-foreground outline-none py-1 border-b border-transparent focus:border-sky-300 transition-colors"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.display_name || a.email_address} ({PROVIDER_LABELS[a.provider]?.label})
                      </option>
                    ))}
                  </select>
                </div>

                {/* To */}
                <div className="flex items-start gap-3">
                  <span className="text-xs text-muted-foreground w-10 flex-shrink-0 font-medium mt-1.5">Para</span>
                  <div className="flex-1 flex flex-wrap gap-1.5 py-0.5 border-b border-transparent focus-within:border-sky-300 transition-colors">
                    {toEmails.map((e) => (
                      <span key={e} className="flex items-center gap-1 bg-sky-50 text-sky-700 text-xs font-medium px-2 py-0.5 rounded-full border border-sky-200">
                        {e}
                        <button onClick={() => setToEmails(toEmails.filter((x) => x !== e))} className="hover:text-red-500 ml-0.5 transition-colors"><X size={9} /></button>
                      </span>
                    ))}
                    <input
                      type="email"
                      value={toInput}
                      onChange={(e) => setToInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "," || e.key === " " || e.key === "Tab") {
                          e.preventDefault();
                          addEmail(toEmails, setToEmails, toInput);
                          setToInput("");
                        }
                      }}
                      onBlur={() => { addEmail(toEmails, setToEmails, toInput); setToInput(""); }}
                      placeholder="destinatario@email.com"
                      className="flex-1 min-w-[160px] outline-none text-sm bg-transparent"
                    />
                    <button onClick={() => setShowCc(!showCc)} className="text-[11px] text-muted-foreground hover:text-sky-600 transition-colors ml-auto">CC</button>
                  </div>
                </div>

                {/* CC */}
                {showCc && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs text-muted-foreground w-10 flex-shrink-0 font-medium mt-1.5">CC</span>
                    <div className="flex-1 flex flex-wrap gap-1.5 py-0.5 border-b border-transparent focus-within:border-sky-300 transition-colors">
                      {ccEmails.map((e) => (
                        <span key={e} className="flex items-center gap-1 bg-slate-50 text-slate-700 text-xs font-medium px-2 py-0.5 rounded-full border">
                          {e}<button onClick={() => setCcEmails(ccEmails.filter((x) => x !== e))}><X size={9} /></button>
                        </span>
                      ))}
                      <input
                        type="email" value={ccInput} onChange={(e) => setCcInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addEmail(ccEmails, setCcEmails, ccInput); setCcInput(""); } }}
                        placeholder="cc@email.com"
                        className="flex-1 outline-none text-sm bg-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Subject */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-10 flex-shrink-0 font-medium">Asunto</span>
                  <input
                    type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                    placeholder="Asunto del email"
                    className="flex-1 text-sm bg-transparent text-foreground outline-none py-1 border-b border-transparent focus:border-sky-300 transition-colors font-medium"
                  />
                </div>

                {/* Template picker */}
                {templates.length > 0 && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-10 flex-shrink-0 font-medium">
                      <FileText size={12} />
                    </span>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => applyTemplate(e.target.value)}
                      className="flex-1 text-xs bg-transparent text-muted-foreground outline-none py-1 border-b border-transparent focus:border-sky-300 transition-colors"
                    >
                      <option value="">— Usar plantilla —</option>
                      {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Rich text editor */}
              <div className="flex flex-col">
                <RichToolbar targetRef={bodyRef} />
                <div
                  ref={bodyRef}
                  contentEditable
                  suppressContentEditableWarning
                  className="min-h-[200px] px-5 py-4 text-sm text-foreground outline-none leading-relaxed"
                  style={{ maxHeight: "320px", overflowY: "auto" }}
                  data-placeholder="Escribe tu mensaje..."
                  onInput={() => {/* trigger re-render if needed */}}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-slate-50/50 flex items-center justify-between gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white border border-border transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90 shadow-sm"
            style={{ background: "linear-gradient(135deg, #1e40af, #1d4ed8)" }}
          >
            {sending ? <><Loader2 size={14} className="animate-spin" />Enviando...</> : <><Send size={14} />Enviar</>}
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
          email_address: email, password, display_name: displayName || email,
          imap_host: imapHost || undefined, imap_port: imapHost ? parseInt(imapPort) : undefined,
          smtp_host: smtpHost || undefined, smtp_port: smtpHost ? parseInt(smtpPort) : undefined,
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-border bg-gradient-to-r from-slate-800 to-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Link2 size={14} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Conectar cuenta de email</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {step === "choose" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-5">Elige el proveedor de email que quieres conectar:</p>
              <button onClick={handleGmailOAuth}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-red-200 hover:bg-red-50/50 transition-all group">
                <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-xl font-bold text-red-600 flex-shrink-0">G</div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-foreground">Gmail / Google Workspace</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Conexión segura vía OAuth2 — sin contraseñas</p>
                </div>
                <ExternalLink size={14} className="text-muted-foreground group-hover:text-red-500 transition-colors" />
              </button>
              <button onClick={handleOutlookOAuth}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-blue-200 hover:bg-blue-50/50 transition-all group">
                <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-xl font-bold text-blue-600 flex-shrink-0">O</div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-foreground">Outlook / Microsoft 365</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Conexión segura vía OAuth2 con Microsoft</p>
                </div>
                <ExternalLink size={14} className="text-muted-foreground group-hover:text-blue-500 transition-colors" />
              </button>
              <button onClick={() => setStep("imap")}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-slate-300 hover:bg-slate-50 transition-all group">
                <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center font-bold text-slate-600 text-lg flex-shrink-0">@</div>
                <div className="text-left flex-1">
                  <p className="text-sm font-semibold text-foreground">Otro proveedor (IMAP/SMTP)</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Yahoo, Zoho, dominio propio u otros</p>
                </div>
                <ChevronDown size={14} className="-rotate-90 text-muted-foreground group-hover:text-slate-600 transition-colors" />
              </button>
            </div>
          )}

          {step === "imap" && (
            <div className="space-y-4">
              <button onClick={() => setStep("choose")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ChevronDown className="rotate-90" size={13} /> Volver
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Email</label>
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); autoFillPreset(e.target.value); }}
                    placeholder="tu@empresa.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Contraseña de aplicación</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      placeholder="App Password"
                      className="w-full px-3 py-2.5 pr-10 rounded-xl border border-border text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100 transition-all" />
                    <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Para Gmail usa una{" "}
                    <a href="https://support.google.com/accounts/answer/185833" target="_blank" className="underline text-sky-600">Contraseña de aplicación</a>.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">IMAP Host</label>
                  <input type="text" value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder="imap.dominio.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-sky-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Puerto IMAP</label>
                  <input type="number" value={imapPort} onChange={(e) => setImapPort(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-sky-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">SMTP Host</label>
                  <input type="text" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.dominio.com"
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-sky-400 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Puerto SMTP</label>
                  <input type="number" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-border text-sm outline-none focus:border-sky-400 transition-all" />
                </div>
              </div>
              <button onClick={handleImapConnect} disabled={connecting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all shadow-sm"
                style={{ background: "linear-gradient(135deg, #1e40af, #1d4ed8)" }}>
                {connecting ? <><Loader2 size={14} className="animate-spin" />Verificando...</> : <><Check size={14} />Conectar cuenta</>}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Signature Editor Modal ────────────────────────────────────────────────────

function SignatureModal({
  account, token, onClose, onSaved,
}: {
  account: EmailAccount;
  token: string;
  onClose: () => void;
  onSaved: (acc: EmailAccount) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = account.signature_html || "";
    }
  }, [account.signature_html]);

  async function handleSave() {
    const html = editorRef.current?.innerHTML || "";
    setSaving(true);
    try {
      const res = await fetch(`${API}/email/accounts/${account.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ signature_html: html }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Error");
      const updated: EmailAccount = await res.json();
      toast.success("Firma guardada");
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-slate-800 to-slate-900 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <Pencil size={13} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Firma de email</p>
              <p className="text-[11px] text-white/60">{account.email_address}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${showPreview ? "bg-white/20 text-white" : "text-white/60 hover:text-white hover:bg-white/10"}`}
            >
              {showPreview ? "Editar" : "Vista previa"}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showPreview ? (
            <div className="p-5">
              <p className="text-xs text-muted-foreground mb-3">Así aparecerá tu firma al final de cada email:</p>
              <div className="border border-border rounded-xl p-4 bg-white">
                <p className="text-sm text-muted-foreground mb-2">— mensaje del email —</p>
                <hr className="border-border mb-3" />
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: editorRef.current?.innerHTML || "<em class='text-muted-foreground'>Sin firma</em>" }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                <p className="text-xs text-amber-700 flex items-center gap-1.5">
                  <Zap size={11} />
                  Puedes usar HTML: <code className="bg-amber-100 px-1 rounded">&lt;b&gt;</code>, <code className="bg-amber-100 px-1 rounded">&lt;a&gt;</code>, <code className="bg-amber-100 px-1 rounded">&lt;img&gt;</code>. La firma se agrega automáticamente al redactar.
                </p>
              </div>
              <RichToolbar targetRef={editorRef} />
              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                className="min-h-[160px] px-5 py-4 text-sm text-foreground outline-none leading-relaxed"
                data-placeholder="Ej: Juan García · Gerente de Ventas · +52 55 1234 5678"
              />

              {/* Quick templates */}
              <div className="px-5 pb-4 pt-2 border-t border-border bg-slate-50/50">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Insertar plantilla rápida:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Básica", html: `<strong>${account.display_name || "Tu nombre"}</strong><br/><span style="color:#64748b">Tu empresa · tu@email.com</span>` },
                    { label: "Con teléfono", html: `<strong>${account.display_name || "Tu nombre"}</strong> · Tu empresa<br/><span style="color:#64748b">📞 +52 55 0000 0000 · ${account.email_address}</span>` },
                    { label: "Profesional", html: `<table style="font-size:13px;color:#374151"><tr><td style="padding-right:12px;border-right:3px solid #7c3aed;vertical-align:middle"><strong>${account.display_name || "Tu nombre"}</strong><br/><span style="color:#6b7280">Tu cargo</span></td><td style="padding-left:12px;color:#6b7280"><span>🏢 Tu empresa</span><br/><span>📧 ${account.email_address}</span><br/><span>🌐 www.tuempresa.com</span></td></tr></table>` },
                  ].map((t) => (
                    <button key={t.label} onClick={() => { if (editorRef.current) editorRef.current.innerHTML = t.html; }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-white hover:border-violet-300 hover:bg-violet-50 text-foreground transition-all">
                      {t.label}
                    </button>
                  ))}
                  <button onClick={() => { if (editorRef.current) editorRef.current.innerHTML = ""; }}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium border border-border bg-white hover:border-red-200 hover:bg-red-50 text-muted-foreground transition-all">
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-border bg-white flex-shrink-0 flex items-center justify-between">
          <button onClick={onClose} className="px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-slate-100 border border-border transition-all">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all shadow-sm"
            style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            {saving ? <><Loader2 size={14} className="animate-spin" />Guardando...</> : <><Check size={14} />Guardar firma</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Account Settings Modal ────────────────────────────────────────────────────

function AccountSettingsModal({
  accounts, token, onClose, onUpdated, onDisconnect,
}: {
  accounts: EmailAccount[];
  token: string;
  onClose: () => void;
  onUpdated: (acc: EmailAccount) => void;
  onDisconnect: (id: string) => void;
}) {
  const [sigAccount, setSigAccount] = useState<EmailAccount | null>(null);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
          className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: "85vh" }}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-slate-800 to-slate-900 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                <Settings size={13} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Cuentas conectadas</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"><X size={15} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay cuentas conectadas</p>
            ) : accounts.map((acc) => {
              const p = PROVIDER_LABELS[acc.provider];
              const ini = initials(acc.display_name, acc.email_address);
              return (
                <div key={acc.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-white hover:bg-slate-50/50 transition-colors">
                  <div className={`w-10 h-10 rounded-xl ${p.bg} border flex items-center justify-center text-lg font-bold ${p.color} flex-shrink-0`}>
                    {p.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{acc.display_name || acc.email_address}</p>
                    <p className="text-xs text-muted-foreground truncate">{acc.email_address}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${p.bg} ${p.color}`}>{p.label}</span>
                      {acc.signature_html && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-600 font-medium flex items-center gap-1">
                          <Pencil size={8} /> Firma activa
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setSigAccount(acc)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors"
                      title="Editar firma"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm(`¿Desconectar ${acc.email_address}?`)) { onDisconnect(acc.id); } }}
                      className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Desconectar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-5 py-3.5 border-t border-border bg-slate-50/50 flex-shrink-0">
            <button onClick={onClose} className="w-full py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white border border-border transition-all">
              Cerrar
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {sigAccount && (
          <SignatureModal
            account={sigAccount}
            token={token}
            onClose={() => setSigAccount(null)}
            onSaved={(updated) => { onUpdated(updated); setSigAccount(null); }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Email Detail Panel ────────────────────────────────────────────────────────

interface AiDraft { subject: string; body_html: string; body_text: string; }

function EmailDetail({
  email, onClose, onReply, onAiReply, token, accountId,
}: {
  email: Email;
  onClose: () => void;
  onReply: () => void;
  onAiReply: (draft: AiDraft) => void;
  token: string;
  accountId: string;
}) {
  const [aiDrafting, setAiDrafting] = useState(false);
  const dateStr = email.received_at || email.sent_at || email.created_at;
  const date = dateStr ? new Date(dateStr).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" }) : "";
  const ini = initials(email.from_name, email.from_email);
  const avatarBg = avatarColor(email.from_email);

  async function handleAiReply() {
    setAiDrafting(true);
    const toastId = toast.loading("Petunia está redactando la respuesta...");
    try {
      const res = await fetch(`${API}/email/ai-draft`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from_email: email.from_email,
          from_name: email.from_name,
          subject: email.subject,
          body_text: email.body_text,
          body_html: email.body_html,
          account_id: accountId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Error al generar borrador");
      }
      const draft: AiDraft = await res.json();
      toast.success("Borrador generado por Petunia ✨", { id: toastId });
      onAiReply(draft);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error", { id: toastId });
    } finally {
      setAiDrafting(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex-shrink-0 bg-white">
        <div className="flex items-start justify-between gap-3 mb-4">
          <h3 className="text-lg font-semibold text-foreground leading-snug flex-1">
            {email.subject || "(sin asunto)"}
          </h3>
          <button onClick={onClose} className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
            {ini}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                {email.from_name || email.from_email}
              </span>
              {email.from_name && (
                <span className="text-xs text-muted-foreground">&lt;{email.from_email}&gt;</span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                email.direction === "inbound" ? "bg-sky-50 text-sky-700 border-sky-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }`}>
                {email.direction === "inbound" ? "Recibido" : "Enviado"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              <span>Para: {email.to_emails.join(", ")}</span>
              {email.cc_emails.length > 0 && <span>· CC: {email.cc_emails.join(", ")}</span>}
            </div>
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
            <Clock size={11} /> {date}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 bg-white">
        {email.body_html ? (
          <div
            className="prose prose-sm max-w-none text-foreground prose-a:text-sky-600"
            dangerouslySetInnerHTML={{ __html: email.body_html }}
          />
        ) : (
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">{email.body_text}</pre>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-border bg-slate-50/50 flex gap-2 flex-shrink-0">
        <button
          onClick={onReply}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm"
          style={{ background: "linear-gradient(135deg, #1e40af, #1d4ed8)" }}
        >
          <Reply size={14} /> Responder
        </button>
        <button
          onClick={handleAiReply}
          disabled={aiDrafting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-all hover:opacity-90 shadow-sm"
          style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}
          title="Petunia redacta la respuesta automáticamente"
        >
          {aiDrafting
            ? <><Loader2 size={14} className="animate-spin" />Redactando...</>
            : <><Sparkles size={14} />Responder con AI</>}
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight: "85vh" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-slate-800 to-slate-900 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText size={13} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Plantillas de Email</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{editing ? "Editar plantilla" : "Nueva plantilla"}</p>
            <input type="text" placeholder="Nombre de la plantilla" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
            <input type="text" placeholder="Asunto del email" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all" />
            <textarea rows={5} placeholder="Cuerpo HTML del email" value={form.body_html} onChange={(e) => setForm({ ...form, body_html: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm bg-white outline-none focus:border-violet-400 transition-all resize-none font-mono" />
            <div className="flex gap-2">
              <button onClick={save} disabled={saving || !form.name || !form.subject}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all shadow-sm"
                style={{ background: "linear-gradient(135deg, #7C3AED, #4F46E5)" }}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {editing ? "Actualizar" : "Crear"}
              </button>
              {editing && <button onClick={() => { setEditing(null); setForm({ name: "", subject: "", body_html: "" }); }}
                className="px-4 py-2 rounded-xl text-sm text-muted-foreground border border-border hover:bg-slate-100 transition-all">Cancelar</button>}
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-muted-foreground" /></div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Aún no tienes plantillas</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-white hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
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
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [filterDir, setFilterDir] = useState<"" | "inbound" | "outbound">("");
  const [search, setSearch] = useState("");
  const [replyTo, setReplyTo] = useState<Email | null>(null);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [composePrefill, setComposePrefill] = useState<{ toEmail?: string; leadId?: string } | null>(null);

  const headers = { Authorization: `Bearer ${token ?? ""}`, "Content-Type": "application/json" };

  useEffect(() => {
    const connected = searchParams.get("connected");
    if (connected) toast.success(`Cuenta de ${connected === "gmail" ? "Gmail" : "Outlook"} conectada correctamente`);
    // Auto-open compose from leads panel
    const compose = searchParams.get("compose");
    const toEmail = searchParams.get("to");
    const leadId = searchParams.get("lead");
    if (compose === "1" && toEmail) {
      setComposePrefill({ toEmail, leadId: leadId ?? undefined });
      setShowCompose(true);
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
      if (r.ok) { toast.success(`${data.synced ?? 0} emails nuevos`, { id: toastId }); fetchAll(); }
      else toast.error(data.detail || "Error al sincronizar", { id: toastId });
    } finally { setSyncing(null); }
  }

  async function disconnectAccount(id: string) {
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
    <div className="flex h-full overflow-hidden bg-slate-50">
      {/* ── Left panel ── */}
      <div className={`flex flex-col border-r border-border bg-white transition-all ${selectedEmail ? "hidden md:flex md:w-[380px]" : "flex-1 md:w-[380px]"} flex-shrink-0`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-border bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-sm">
                <Mail size={15} className="text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground leading-none">Email CRM</h1>
                {unreadCount > 0 && <p className="text-[10px] text-sky-600 font-medium mt-0.5">{unreadCount} sin leer</p>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setShowTemplates(true)} className="p-2 rounded-xl text-muted-foreground hover:text-violet-600 hover:bg-violet-50 transition-colors" title="Plantillas">
                <FileText size={15} />
              </button>
              <button onClick={() => setShowAccountSettings(true)} className="p-2 rounded-xl text-muted-foreground hover:text-slate-700 hover:bg-slate-100 transition-colors" title="Configurar cuentas">
                <Settings size={15} />
              </button>
              <button onClick={() => setShowConnect(true)} className="p-2 rounded-xl text-muted-foreground hover:text-sky-600 hover:bg-sky-50 transition-colors" title="Conectar cuenta">
                <Plus size={15} />
              </button>
              <button
                onClick={() => setShowCompose(true)}
                disabled={accounts.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white disabled:opacity-40 transition-all shadow-sm hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1e40af, #1d4ed8)" }}
              >
                <Pencil size={12} /> Redactar
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar emails..."
              className="w-full bg-slate-50 text-foreground placeholder-muted-foreground text-sm pl-8 pr-3 py-2 rounded-xl border border-border outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 transition-all"
            />
          </div>
        </div>

        {/* Accounts strip */}
        {accounts.length > 0 && (
          <div className="px-3 py-2 border-b border-border bg-slate-50/70 flex items-center gap-2 overflow-x-auto">
            {accounts.map((acc) => {
              const p = PROVIDER_LABELS[acc.provider];
              return (
                <div key={acc.id} className="flex items-center gap-1.5 flex-shrink-0">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${p.bg} ${p.color}`}>
                    <span>{p.icon}</span>
                    <span className="max-w-[80px] truncate">{acc.email_address.split("@")[0]}</span>
                  </div>
                  <button onClick={() => syncAccount(acc.id)} disabled={syncing === acc.id}
                    className="p-1 rounded-full text-muted-foreground hover:text-sky-600 transition-colors" title="Sincronizar">
                    <RefreshCw size={11} className={syncing === acc.id ? "animate-spin" : ""} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex border-b border-border bg-white">
          {(["", "inbound", "outbound"] as const).map((dir) => (
            <button key={dir} onClick={() => setFilterDir(dir)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${filterDir === dir ? "text-sky-600 border-b-2 border-sky-500 bg-sky-50/30" : "text-muted-foreground hover:text-foreground hover:bg-slate-50"}`}>
              {dir === "" ? <><Inbox size={11} className="inline mr-1" />Todos</> : dir === "inbound" ? "Recibidos" : "Enviados"}
            </button>
          ))}
        </div>

        {/* Email list */}
        <div className="flex-1 overflow-y-auto bg-white">
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 gap-5">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-100 flex items-center justify-center">
                <Mail size={28} className="text-sky-400" />
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1.5">Conecta tu email</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Conecta Gmail, Outlook o cualquier cuenta IMAP para gestionar tus correos desde el CRM.</p>
              </div>
              <button onClick={() => setShowConnect(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1e40af, #1d4ed8)" }}>
                <Plus size={14} /> Conectar cuenta
              </button>
            </div>
          ) : loading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 size={22} className="animate-spin text-muted-foreground" />
            </div>
          ) : emails.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6 gap-3">
              <Inbox size={28} className="text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin emails. Haz clic en <strong>↻</strong> para sincronizar.</p>
            </div>
          ) : (
            emails.map((email) => {
              const ini = initials(email.from_name, email.from_email);
              const avatarBg = avatarColor(email.from_email);
              const isUnread = !email.is_read && email.direction === "inbound";
              return (
                <button
                  key={email.id}
                  onClick={() => openEmail(email)}
                  className={`w-full text-left px-4 py-3 border-b border-border/60 hover:bg-slate-50 transition-colors relative ${
                    selectedEmail?.id === email.id ? "bg-sky-50 border-l-2 border-l-sky-500" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5`}>
                      {ini}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate ${isUnread ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                          {email.direction === "inbound" ? (email.from_name || email.from_email) : `→ ${email.to_emails[0] || ""}`}
                        </p>
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {new Date(email.received_at || email.sent_at || email.created_at).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${isUnread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        {email.subject || "(sin asunto)"}
                      </p>
                      <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                        {email.body_text?.slice(0, 70) || ""}
                      </p>
                    </div>
                    {isUnread && <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-2" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className={`flex-1 ${selectedEmail ? "flex" : "hidden md:flex"} flex-col`}>
        {selectedEmail ? (
          <EmailDetail
            email={selectedEmail}
            token={token ?? ""}
            accountId={selectedEmail.email_account_id}
            onClose={() => setSelectedEmail(null)}
            onReply={() => {
              setAiDraft(null);
              setReplyTo(selectedEmail);
              setShowCompose(true);
            }}
            onAiReply={(draft) => {
              setAiDraft(draft);
              setReplyTo(selectedEmail);
              setShowCompose(true);
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 text-muted-foreground bg-slate-50">
            <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center shadow-sm">
              <Mail size={28} className="opacity-30" />
            </div>
            <div>
              <p className="font-medium text-foreground/60">Selecciona un email para verlo</p>
              <p className="text-sm mt-1">o redacta uno nuevo</p>
            </div>
            {accounts.length > 0 && (
              <button onClick={() => setShowCompose(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white mt-2 shadow-sm hover:opacity-90 transition-all"
                style={{ background: "linear-gradient(135deg, #1e40af, #1d4ed8)" }}>
                <Pencil size={13} /> Redactar email
              </button>
            )}
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
            onClose={() => { setShowCompose(false); setReplyTo(null); setAiDraft(null); setComposePrefill(null); }}
            prefill={replyTo ? {
              toEmail: replyTo.from_email,
              subject: aiDraft?.subject || replyTo.subject || "",
              replyAccountId: replyTo.email_account_id,
              bodyHtml: aiDraft?.body_html,
            } : composePrefill ? {
              toEmail: composePrefill.toEmail,
              leadId: composePrefill.leadId,
            } : undefined}
            onSent={(email) => setEmails((prev) => [email, ...prev])}
          />
        )}
        {showTemplates && (
          <TemplateManager token={token ?? ""} onClose={() => setShowTemplates(false)} />
        )}
        {showAccountSettings && (
          <AccountSettingsModal
            accounts={accounts}
            token={token ?? ""}
            onClose={() => setShowAccountSettings(false)}
            onUpdated={(updated) => setAccounts((prev) => prev.map((a) => a.id === updated.id ? updated : a))}
            onDisconnect={(id) => { disconnectAccount(id); setShowAccountSettings(false); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
