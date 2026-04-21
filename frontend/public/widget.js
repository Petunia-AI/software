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

  // Config: primero busca objeto global (para WPCode JS snippet),
  // luego atributos del script tag (para uso directo en HTML).
  var _g = window.PetuniaWidgetConfig || {};
  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var cfg = {
    businessId: _g.businessId || script.getAttribute("data-business-id") || "",
    color:      _g.color      || script.getAttribute("data-color")       || "#635bff",
    name:       _g.name       || script.getAttribute("data-name")        || "Asistente",
    position:   _g.position   || script.getAttribute("data-position")    || "right",
    baseUrl:    _g.baseUrl    || script.getAttribute("data-base-url")    || "https://app.aipetunia.com",
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
      "#av-launcher:hover{transform:scale(1.08);}",
      "#av-launcher." + cfg.position + "{" + cfg.position + ":24px;}",
      "#av-btn{width:60px;height:60px;border-radius:18px;border:none;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,0,0,.22),0 1px 4px rgba(0,0,0,.12);cursor:pointer;transition:all .25s;position:relative;overflow:hidden;}",
      "#av-btn::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.18) 0%,rgba(255,255,255,0) 60%);pointer-events:none;}",
      "#av-badge{position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;padding:0 4px;background:#ef4444;border-radius:10px;border:2px solid #fff;display:none;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:system-ui,sans-serif;}",
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
        '<svg id="av-icon-chat" width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M5 6.5C5 5.12 6.12 4 7.5 4h13C21.88 4 23 5.12 23 6.5v10c0 1.38-1.12 2.5-2.5 2.5H15l-4 4v-4H7.5C6.12 23 5 21.88 5 20.5v-14z" fill="rgba(255,255,255,0.25)"/>' +
          '<path d="M5 6.5C5 5.12 6.12 4 7.5 4h13C21.88 4 23 5.12 23 6.5v10c0 1.38-1.12 2.5-2.5 2.5H15l-4 4v-4H7.5C6.12 23 5 21.88 5 20.5v-14z" stroke="white" stroke-width="1.75" stroke-linejoin="round"/>' +
          '<circle cx="10" cy="12" r="1.5" fill="white"/>' +
          '<circle cx="14" cy="12" r="1.5" fill="white"/>' +
          '<circle cx="18" cy="12" r="1.5" fill="white"/>' +
          '<path d="M19.5 3.5 L20.2 5.3 L22 6 L20.2 6.7 L19.5 8.5 L18.8 6.7 L17 6 L18.8 5.3 Z" fill="white" opacity="0.9"/>' +
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
