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
      "@keyframes av-pulse{0%{transform:scale(1);opacity:.6}70%{transform:scale(1.55);opacity:0}100%{transform:scale(1.55);opacity:0}}",
      "@keyframes av-pop{0%{transform:translateY(8px) scale(.9);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}",
      "#av-launcher{position:fixed;bottom:24px;z-index:2147483647;display:flex;flex-direction:column;align-items:flex-end;gap:10px;}",
      "#av-launcher." + cfg.position + "{" + cfg.position + ":24px;}",
      "#av-tooltip{background:#1a1a2e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:500;padding:8px 14px;border-radius:20px;white-space:nowrap;box-shadow:0 4px 20px rgba(0,0,0,.18);animation:av-pop .3s ease;cursor:pointer;display:flex;align-items:center;gap:6px;letter-spacing:-.01em;}",
      "#av-tooltip-dot{width:7px;height:7px;background:#22c55e;border-radius:50%;flex-shrink:0;box-shadow:0 0 0 2px rgba(34,197,94,.3);}",
      "#av-btn-wrap{position:relative;width:62px;height:62px;flex-shrink:0;}",
      "#av-pulse{position:absolute;inset:0;border-radius:50%;animation:av-pulse 2.2s ease-out infinite;}",
      "#av-btn{width:62px;height:62px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease;position:relative;z-index:1;box-shadow:0 4px 20px rgba(0,0,0,.25),0 0 0 3px rgba(255,255,255,.9);}",
      "#av-btn:hover{transform:scale(1.1);box-shadow:0 8px 28px rgba(0,0,0,.3),0 0 0 3px rgba(255,255,255,.9);}",
      "#av-btn-inner{width:100%;height:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,0) 55%);}",
      "#av-badge{position:absolute;top:-2px;right:-2px;min-width:20px;height:20px;padding:0 5px;background:#ef4444;border-radius:10px;border:2px solid #fff;display:none;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;font-family:system-ui,sans-serif;z-index:2;}",
      "#av-iframe-wrap{position:fixed;bottom:100px;z-index:2147483646;width:380px;height:600px;border-radius:20px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,.22),0 2px 8px rgba(0,0,0,.1);transition:opacity .25s,transform .25s;transform:translateY(12px) scale(.97);opacity:0;pointer-events:none;}",
      "#av-iframe-wrap.av-open{transform:translateY(0) scale(1);opacity:1;pointer-events:all;}",
      "#av-iframe-wrap." + cfg.position + "{" + cfg.position + ":24px;}",
      "#av-iframe-wrap iframe{width:100%;height:100%;border:none;display:block;}",
      "@media(max-width:480px){#av-iframe-wrap{width:calc(100vw - 16px);height:calc(100svh - 100px);bottom:92px;" + cfg.position + ":8px;border-radius:16px;}}",
    ].join("");
    document.head.appendChild(style);

    /* ── Launcher button ──────────────────────────────────────────────── */
    var launcher = document.createElement("div");
    launcher.id = "av-launcher";
    launcher.className = cfg.position;

    var agentLabel = cfg.name !== "Asistente" ? cfg.name : "¿En qué te ayudamos?";
    launcher.innerHTML =
      '<div id="av-tooltip">' +
        '<span id="av-tooltip-dot"></span>' + agentLabel +
      '</div>' +
      '<div id="av-btn-wrap">' +
        '<div id="av-pulse" style="background:' + cfg.color + '"></div>' +
        '<button id="av-btn" style="background:' + cfg.color + '" aria-label="Abrir chat">' +
          '<div id="av-btn-inner">' +
            '<svg id="av-icon-chat" width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">' +
              '<!-- cabeza -->' +
              '<rect x="5" y="10" width="22" height="15" rx="4" fill="white"/>' +
              '<!-- antenas -->' +
              '<line x1="16" y1="5" x2="16" y2="10" stroke="white" stroke-width="2" stroke-linecap="round"/>' +
              '<circle cx="16" cy="4" r="2" fill="white"/>' +
              '<!-- ojos -->' +
              '<circle cx="11" cy="16" r="2.2" fill="' + cfg.color + '"/>' +
              '<circle cx="21" cy="16" r="2.2" fill="' + cfg.color + '"/>' +
              '<circle cx="11.8" cy="15.2" r="0.8" fill="white"/>' +
              '<circle cx="21.8" cy="15.2" r="0.8" fill="white"/>' +
              '<!-- boca -->' +
              '<path d="M11 21 Q16 24.5 21 21" stroke="' + cfg.color + '" stroke-width="1.8" stroke-linecap="round" fill="none"/>' +
            '</svg>' +
            '<svg id="av-icon-close" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:none">' +
              '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</div>' +
        '</button>' +
        '<div id="av-badge">1</div>' +
      '</div>';
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
      var tooltip = document.getElementById("av-tooltip");
      if (tooltip) tooltip.style.display = isOpen ? "none" : "flex";
      if (isOpen) {
        document.getElementById("av-badge").style.display = "none";
        hasUnread = false;
      }
    }

    document.getElementById("av-btn").addEventListener("click", toggle);
    var tooltip = document.getElementById("av-tooltip");
    if (tooltip) tooltip.addEventListener("click", toggle);

    /* ── Ocultar tooltip al hacer scroll ─────────────────────────────── */
    var tooltipHidden = false;
    window.addEventListener("scroll", function() {
      if (!tooltipHidden) {
        var t = document.getElementById("av-tooltip");
        if (t) { t.style.opacity = "0"; t.style.pointerEvents = "none"; }
        tooltipHidden = true;
      }
    }, { passive: true });

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
