/**
 * Agente de Ventas AI — Widget embeddable
 *
 * Uso:
 * <script
 *   src="https://tu-dominio.com/widget.js"
 *   data-business-id="tu-business-id"
 *   data-color="#635bff"
 *   data-name="Sofía"
 *   data-position="right"
 * ></script>
 */
(function () {
  "use strict";

  // Captura los atributos del script tag ANTES de cualquier defer/async
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var cfg = {
    businessId: script.getAttribute("data-business-id") || "",
    color:      script.getAttribute("data-color")       || "#635bff",
    name:       script.getAttribute("data-name")        || "Asistente",
    position:   script.getAttribute("data-position")    || "right",
    baseUrl:    script.getAttribute("data-base-url")    || "https://app.aipetunia.com",
  };

  function init() {
    // Evitar doble inicialización
    if (document.getElementById("av-launcher")) return;

    var isOpen    = false;
    var hasUnread = false;

    /* ── CSS ──────────────────────────────────────────────────────────── */
    var style = document.createElement("style");
    style.textContent = [
      "#av-launcher{position:fixed;bottom:24px;z-index:2147483647;cursor:pointer;transition:transform .2s ease;}",
      "#av-launcher:hover{transform:scale(1.06);}",
      "#av-launcher." + cfg.position + "{" + cfg.position + ":24px;}",
      "#av-btn{width:60px;height:60px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,0,0,.25);cursor:pointer;transition:all .2s;}",
      "#av-badge{position:absolute;top:-2px;right:-2px;width:18px;height:18px;background:#ef4444;border-radius:50%;border:2px solid #fff;display:none;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;}",
      "#av-iframe-wrap{position:fixed;bottom:96px;z-index:2147483646;width:380px;height:600px;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.2);transition:opacity .25s,transform .25s;transform:translateY(10px) scale(.97);opacity:0;pointer-events:none;}",
      "#av-iframe-wrap.av-open{transform:translateY(0) scale(1);opacity:1;pointer-events:all;}",
      "#av-iframe-wrap." + cfg.position + "{" + cfg.position + ":24px;}",
      "#av-iframe-wrap iframe{width:100%;height:100%;border:none;display:block;}",
      "@media(max-width:480px){#av-iframe-wrap{width:calc(100vw - 16px);height:calc(100svh - 100px);bottom:84px;" + cfg.position + ":8px;border-radius:12px;}}",
    ].join("");
    document.head.appendChild(style);

    /* ── Launcher button ──────────────────────────────────────────────── */
    var launcher = document.createElement("div");
    launcher.id = "av-launcher";
    launcher.className = cfg.position;
    launcher.innerHTML =
      '<button id="av-btn" style="background:' + cfg.color + '" aria-label="Abrir chat">' +
        '<svg id="av-icon-chat" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
          '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
        "</svg>" +
        '<svg id="av-icon-close" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:none">' +
          '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
        "</svg>" +
      "</button>" +
      '<div id="av-badge">1</div>';
    document.body.appendChild(launcher);

    /* ── iFrame ───────────────────────────────────────────────────────── */
    var wrap = document.createElement("div");
    wrap.id = "av-iframe-wrap";
    wrap.className = cfg.position;

    var widgetUrl = cfg.baseUrl + "/widget" +
      "?business_id=" + encodeURIComponent(cfg.businessId) +
      "&color="       + encodeURIComponent(cfg.color) +
      "&name="        + encodeURIComponent(cfg.name);

    wrap.innerHTML = '<iframe src="' + widgetUrl + '" title="Chat" allow="microphone" loading="lazy"></iframe>';
    document.body.appendChild(wrap);

    /* ── Toggle ───────────────────────────────────────────────────────── */
    function toggle() {
      isOpen = !isOpen;
      wrap.classList.toggle("av-open", isOpen);
      document.getElementById("av-icon-chat").style.display  = isOpen ? "none"  : "block";
      document.getElementById("av-icon-close").style.display = isOpen ? "block" : "none";
      if (isOpen) {
        document.getElementById("av-badge").style.display = "none";
        hasUnread = false;
      }
    }

    document.getElementById("av-btn").addEventListener("click", toggle);

    /* ── Badge de notificación ────────────────────────────────────────── */
    setTimeout(function () {
      if (!isOpen) {
        hasUnread = true;
        document.getElementById("av-badge").style.display = "flex";
      }
    }, 8000);

    /* ── API pública ──────────────────────────────────────────────────── */
    window.AgenteVentasWidget = {
      open:   function () { if (!isOpen) toggle(); },
      close:  function () { if (isOpen)  toggle(); },
      toggle: toggle,
    };
  }

  // Ejecutar cuando el DOM esté listo (funciona en cualquier punto de carga)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
