"use client";

/**
 * WhatsApp Embedded Signup — Meta Business Platform
 *
 * Abre el popup oficial de Meta donde el cliente conecta su WhatsApp
 * Business Account en minutos. No necesita copiar tokens manualmente.
 *
 * Flujo:
 *  1. Se carga el SDK de Meta (sdk.js) una vez.
 *  2. Al hacer clic en el botón, se llama FB.login() con el config_id de
 *     la app de Petunia como Tech Provider.
 *  3. El popup guía al cliente: crear/seleccionar WABA → verificar número.
 *  4. Al completar, el evento "message" devuelve waba_id + phone_number_id.
 *  5. FB.login() devuelve un code (server-side flow).
 *  6. Se envía todo al backend → /api/meta/embedded-signup.
 *  7. El backend intercambia el code, registra el número y suscribe webhooks.
 */

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Loader2, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return {
    Authorization: t ? `Bearer ${t}` : "",
    "Content-Type": "application/json",
  };
}

interface EmbeddedSignupResult {
  ok: boolean;
  waba_id: string;
  phone_number_id: string;
  display_phone: string;
  verified_name: string;
}

interface Props {
  onSuccess?: (result: EmbeddedSignupResult) => void;
  onError?: (msg: string) => void;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FB: any;
    fbAsyncInit?: () => void;
  }
}

export default function WhatsAppEmbeddedSignup({ onSuccess, onError }: Props) {
  const [status, setStatus] = useState<"idle" | "loading-sdk" | "ready" | "signing-up" | "success" | "error">("loading-sdk");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<EmbeddedSignupResult | null>(null);
  const [config, setConfig] = useState<{ app_id: string; config_id: string } | null>(null);

  // Store waba_id + phone_number_id from the message event before FB.login() callback
  const sessionDataRef = useRef<{ waba_id?: string; phone_number_id?: string }>({});

  // 1. Fetch app_id + config_id from backend
  useEffect(() => {
    fetch(`${API}/meta/embedded-signup/config`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.app_id && data.config_id) {
          setConfig(data);
        } else {
          setStatus("error");
          setErrorMsg("El servidor no tiene META_CONFIG_ID configurado. Pide al administrador que lo agregue.");
        }
      })
      .catch(() => {
        setStatus("error");
        setErrorMsg("No se pudo obtener la configuración del servidor.");
      });
  }, []);

  // 2. Load Meta SDK once config is available
  useEffect(() => {
    if (!config) return;

    // Listen for session info (waba_id + phone_number_id) from Meta popup
    function handleMessage(event: MessageEvent) {
      if (event.origin !== "https://www.facebook.com") return;
      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          if (data.event === "FINISH" && data.data) {
            sessionDataRef.current = {
              waba_id: data.data.waba_id ?? data.data.business_id,
              phone_number_id: data.data.phone_number_id,
            };
          } else if (data.event === "CANCEL") {
            setStatus("ready");
            const msg = "El proceso fue cancelado. Puedes volver a intentarlo.";
            setErrorMsg(msg);
            onError?.(msg);
          } else if (data.event === "ERROR") {
            setStatus("error");
            const msg = `Error en el proceso de Meta: ${data.data?.error_message ?? "desconocido"}`;
            setErrorMsg(msg);
            onError?.(msg);
          }
        }
      } catch {
        // Ignore non-JSON messages from other origins
      }
    }

    window.addEventListener("message", handleMessage);

    // Initialize Meta SDK
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: config.app_id,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v19.0",
      });
      setStatus("ready");
    };

    // Inject SDK script (idempotent)
    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    } else if (window.FB) {
      // SDK already loaded (e.g. hot reload)
      window.FB.init({
        appId: config.app_id,
        autoLogAppEvents: true,
        xfbml: true,
        version: "v19.0",
      });
      setStatus("ready");
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [config, onError]);

  // 3. Launch the Embedded Signup popup
  function launchEmbeddedSignup() {
    if (!window.FB || !config) return;

    setStatus("signing-up");
    setErrorMsg("");
    sessionDataRef.current = {};

    window.FB.login(
      function (response: { authResponse?: { code?: string } }) {
        if (response.authResponse?.code) {
          completeSignup(response.authResponse.code);
        } else {
          // User closed popup without finishing
          setStatus("ready");
        }
      },
      {
        config_id: config.config_id,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featuretype: "",
          sessionInfoVersion: "3",
        },
      }
    );
  }

  // 4. Exchange code + ids on the backend
  async function completeSignup(code: string) {
    const { waba_id, phone_number_id } = sessionDataRef.current;

    if (!waba_id || !phone_number_id) {
      const msg =
        "No se recibió el WABA ID o Phone Number ID de Meta. " +
        "Asegúrate de completar todos los pasos del popup.";
      setStatus("error");
      setErrorMsg(msg);
      onError?.(msg);
      return;
    }

    try {
      const r = await fetch(
        `${API}/meta/embedded-signup?code=${encodeURIComponent(code)}&waba_id=${encodeURIComponent(waba_id)}&phone_number_id=${encodeURIComponent(phone_number_id)}`,
        { method: "POST", headers: authHeaders() }
      );

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data.detail ?? `Error ${r.status}`);
      }

      setResult(data as EmbeddedSignupResult);
      setStatus("success");
      onSuccess?.(data as EmbeddedSignupResult);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al completar la conexión";
      setStatus("error");
      setErrorMsg(msg);
      onError?.(msg);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (status === "success" && result) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-9 h-9 text-green-600" />
        </div>
        <div className="text-center">
          <p className="font-bold text-slate-800 text-lg">¡WhatsApp conectado!</p>
          {result.verified_name && (
            <p className="text-slate-600 mt-1 font-medium">{result.verified_name}</p>
          )}
          {result.display_phone && (
            <p className="text-green-700 font-mono text-sm mt-1">{result.display_phone}</p>
          )}
        </div>
        <p className="text-sm text-slate-500 text-center max-w-xs">
          Petunia ya está suscrita a los mensajes entrantes de este número.
          La autorespuesta está activa.
        </p>
      </div>
    );
  }

  if (status === "error" && !config) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-red-700">Configuración incompleta</p>
          <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Error banner (non-blocking) */}
      {errorMsg && status !== "error" && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">{errorMsg}</p>
        </div>
      )}

      {status === "error" && errorMsg && config && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-2xl">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700">Error al conectar</p>
            <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
          </div>
          <button
            onClick={() => { setStatus("ready"); setErrorMsg(""); }}
            className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reintentar
          </button>
        </div>
      )}

      {/* Main CTA button */}
      <button
        onClick={launchEmbeddedSignup}
        disabled={status !== "ready" && status !== "error"}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-[#1877F2] hover:bg-[#166FE5] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl transition shadow-sm shadow-blue-500/20"
      >
        {status === "loading-sdk" || status === "signing-up" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
        {status === "loading-sdk"
          ? "Cargando..."
          : status === "signing-up"
          ? "Conectando con Meta..."
          : "Conectar WhatsApp Business"}
      </button>

      <p className="text-xs text-slate-400 text-center">
        Se abrirá un popup oficial de Meta. Selecciona tu cuenta de WhatsApp
        Business y sigue los pasos. No necesitas copiar ningún token.
      </p>
    </div>
  );
}
