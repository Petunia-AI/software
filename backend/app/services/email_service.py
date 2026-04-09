"""
Email Service — Resend API with HTML templates
Supports: welcome, trial_ending, payment_failed, subscription_activated,
          daily_report, lead_qualified, human_takeover_needed
"""
import resend
import structlog
from typing import Any
from app.config import settings

logger = structlog.get_logger()

# Initialize Resend
resend.api_key = settings.resend_api_key

FROM_EMAIL = settings.email_from
FROM_NAME  = settings.email_from_name
BRAND_COLOR = "#635bff"


# ── Base HTML template ─────────────────────────────────────────────────────
def _base(title: str, preview: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background:#f6f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <!-- preview text -->
  <span style="display:none;max-height:0;overflow:hidden;">{preview}</span>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f9;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:{BRAND_COLOR};padding:28px 40px;text-align:center;">
            <table cellpadding="0" cellspacing="0" style="display:inline-table;">
              <tr>
                <td style="background:rgba(255,255,255,.15);border-radius:10px;padding:8px 10px;vertical-align:middle;">
                  <span style="font-size:18px;">⚡</span>
                </td>
                <td style="padding-left:10px;vertical-align:middle;">
                  <span style="color:#fff;font-size:16px;font-weight:700;">Agente de Ventas AI</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 28px;">
            {body_html}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 28px;border-top:1px solid #f0f0f5;">
            <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
              Agente de Ventas AI · Construido para LATAM 🌎<br/>
              <a href="{{{{unsubscribe}}}}" style="color:{BRAND_COLOR};text-decoration:none;">Cancelar suscripción</a>
              &nbsp;·&nbsp;
              <a href="{settings.frontend_url}" style="color:{BRAND_COLOR};text-decoration:none;">Ir al dashboard</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _btn(text: str, url: str, color: str = BRAND_COLOR) -> str:
    return f"""<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:{color};border-radius:10px;">
      <a href="{url}" style="display:inline-block;padding:13px 28px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;">{text}</a>
    </td>
  </tr>
</table>"""


def _h1(text: str) -> str:
    return f'<h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">{text}</h1>'


def _p(text: str, color: str = "#4b5563") -> str:
    return f'<p style="margin:12px 0;font-size:15px;color:{color};line-height:1.6;">{text}</p>'


def _stat_row(items: list[tuple[str, str]]) -> str:
    cells = "".join(
        f'<td style="text-align:center;padding:0 16px;border-right:{"1px solid #f0f0f5" if i < len(items)-1 else "none"};">'
        f'<p style="margin:0;font-size:22px;font-weight:700;color:#111827;">{v}</p>'
        f'<p style="margin:4px 0 0;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">{k}</p>'
        f'</td>'
        for i, (k, v) in enumerate(items)
    )
    return f'<table width="100%" style="margin:20px 0;background:#f9fafb;border-radius:10px;padding:20px 0;"><tr>{cells}</tr></table>'


# ── Email builders ─────────────────────────────────────────────────────────

def _welcome_html(name: str, business_name: str) -> str:
    body = (
        _h1(f"Bienvenido, {name} 👋")
        + _p(f"Tu cuenta de <strong>{business_name}</strong> está lista. Tus 5 agentes IA están en línea y listos para calificar leads, nutrir prospectos y cerrar ventas — las 24 horas.")
        + _p("En los próximos <strong>14 días</strong> tienes acceso completo sin costo. Aquí te dejamos los 3 pasos para empezar:")
        + """<table style="margin:20px 0;width:100%;" cellpadding="0" cellspacing="0">
""" + "".join(
            f"""<tr>
  <td style="padding:10px 0;vertical-align:top;">
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="background:{BRAND_COLOR};border-radius:50%;width:28px;height:28px;text-align:center;vertical-align:middle;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">{n}</td>
      <td style="padding-left:12px;font-size:14px;color:#374151;">{t}</td>
    </tr></table>
  </td>
</tr>"""
            for n, t in [
                ("1", "Configura el contexto de tu negocio en <strong>Configuración</strong>"),
                ("2", "Instala el widget de chat en tu sitio web"),
                ("3", "Conecta WhatsApp Business para responder 24/7"),
            ]
        )
        + "</table>"
        + _btn("Ir al dashboard →", f"{settings.frontend_url}/dashboard")
        + _p("¿Tienes preguntas? Responde este email y te ayudamos.", "#9ca3af")
    )
    return _base(
        "Bienvenido a Agente de Ventas AI",
        f"Tu cuenta está lista — 14 días gratis para {business_name}",
        body,
    )


def _trial_ending_html(name: str, days_left: int, plan_url: str) -> str:
    urgent = days_left <= 1
    color = "#ef4444" if urgent else "#f59e0b"
    body = (
        f'<div style="background:{"#fef2f2" if urgent else "#fffbeb"};border:1px solid {"#fecaca" if urgent else "#fde68a"};border-radius:10px;padding:16px 20px;margin-bottom:20px;">'
        f'<p style="margin:0;font-size:14px;color:{color};font-weight:600;">{"⚠️ Último día" if urgent else "⏰ Tu trial termina pronto"}</p>'
        f'</div>'
        + _h1(f"Tu prueba gratuita termina en {days_left} día{'s' if days_left != 1 else ''}")
        + _p(f"Hola {name}, para no perder el acceso a tus agentes, leads y conversaciones elige un plan antes de que expire tu trial.")
        + _stat_row([
            ("Conversaciones", "activas"),
            ("Leads calificados", "guardados"),
            ("Días restantes", str(days_left)),
        ])
        + _btn("Elegir mi plan →", plan_url, color)
        + _p("Todos los planes incluyen 14 días adicionales de prueba si aún no has agregado tarjeta.", "#9ca3af")
    )
    return _base(
        f"Tu trial termina en {days_left} día{'s' if days_left != 1 else ''}",
        f"Elige un plan para no perder tus datos — {days_left} día{'s' if days_left != 1 else ''} restante{'s' if days_left != 1 else ''}",
        body,
    )


def _payment_failed_html(name: str, portal_url: str) -> str:
    body = (
        '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;margin-bottom:20px;">'
        '<p style="margin:0;font-size:14px;color:#ef4444;font-weight:600;">💳 Pago fallido</p>'
        '</div>'
        + _h1("Hubo un problema con tu pago")
        + _p(f"Hola {name}, no pudimos procesar el cobro de tu suscripción. Para reactivar tus agentes actualiza tu método de pago.")
        + _btn("Actualizar método de pago →", portal_url, "#ef4444")
        + _p("Si necesitas ayuda escríbenos a <a href='mailto:soporte@agenteventas.ai' style='color:#635bff;'>soporte@agenteventas.ai</a>", "#9ca3af")
    )
    return _base(
        "Acción requerida: actualiza tu método de pago",
        "Hubo un problema con el cobro de tu suscripción",
        body,
    )


def _subscription_activated_html(name: str, plan: str, period_end: str) -> str:
    plan_label = {"starter": "Starter", "pro": "Pro", "enterprise": "Enterprise"}.get(plan, plan.title())
    body = (
        '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">'
        '<p style="margin:0;font-size:14px;color:#16a34a;font-weight:600;">✅ Suscripción activa</p>'
        '</div>'
        + _h1(f"¡Plan {plan_label} activado!")
        + _p(f"Hola {name}, tu suscripción está activa. Todos tus agentes están operando sin límites.")
        + _stat_row([
            ("Plan", plan_label),
            ("Próximo cobro", period_end),
        ])
        + _btn("Ir al dashboard →", f"{settings.frontend_url}/dashboard")
    )
    return _base(
        f"Plan {plan_label} activado",
        f"Tu suscripción {plan_label} está activa",
        body,
    )


def _daily_report_html(
    name: str,
    business_name: str,
    stats: dict[str, Any],
    date: str,
) -> str:
    body = (
        _h1(f"Reporte diario — {date}")
        + _p(f"Hola {name}, aquí tienes el resumen de actividad de <strong>{business_name}</strong> de ayer.")
        + _stat_row([
            ("Conversaciones", str(stats.get("conversations", 0))),
            ("Leads nuevos", str(stats.get("new_leads", 0))),
            ("Calificados (≥7)", str(stats.get("qualified", 0))),
            ("Cierres", str(stats.get("closed_won", 0))),
        ])
        + _btn("Ver analytics completo →", f"{settings.frontend_url}/analytics")
    )
    return _base(
        f"Reporte diario {date} — {business_name}",
        f"{stats.get('conversations', 0)} conversaciones, {stats.get('new_leads', 0)} leads nuevos ayer",
        body,
    )


def _lead_qualified_html(
    name: str,
    lead_name: str,
    score: int,
    channel: str,
    conv_url: str,
) -> str:
    body = (
        '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;margin-bottom:20px;">'
        f'<p style="margin:0;font-size:14px;color:#16a34a;font-weight:600;">🎯 Lead calificado — Score {score}/10</p>'
        '</div>'
        + _h1(f"Nuevo lead calificado: {lead_name}")
        + _p(f"Hola {name}, el agente Calificador detectó un lead de alto valor por <strong>{channel}</strong> con score BANT <strong>{score}/10</strong>.")
        + _p("El agente Cerrador ya tomó la conversación. Puedes revisar el contexto completo aquí:")
        + _btn("Ver conversación →", conv_url)
    )
    return _base(
        f"Lead calificado: {lead_name} (score {score}/10)",
        f"Nuevo lead de alto valor detectado por {channel} — Score {score}/10",
        body,
    )


def _human_takeover_html(
    name: str,
    lead_name: str,
    channel: str,
    reason: str,
    conv_url: str,
) -> str:
    body = (
        '<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:16px 20px;margin-bottom:20px;">'
        '<p style="margin:0;font-size:14px;color:#d97706;font-weight:600;">🤝 El cliente requiere atención humana</p>'
        '</div>'
        + _h1(f"Intervención requerida: {lead_name}")
        + _p(f"Hola {name}, el agente de Soporte detectó que <strong>{lead_name}</strong> ({channel}) necesita atención personalizada.")
        + _p(f"<strong>Motivo:</strong> {reason}")
        + _btn("Tomar la conversación →", conv_url, "#f59e0b")
    )
    return _base(
        f"Atención requerida: {lead_name}",
        f"El agente solicitó intervención humana para {lead_name}",
        body,
    )


# ── Send functions (public API) ────────────────────────────────────────────

async def send_welcome(to_email: str, name: str, business_name: str) -> bool:
    return await _send(
        to=to_email,
        subject=f"Bienvenido a Agente de Ventas AI, {name} 👋",
        html=_welcome_html(name, business_name),
    )


async def send_trial_ending(to_email: str, name: str, days_left: int) -> bool:
    plan_url = f"{settings.frontend_url}/billing"
    return await _send(
        to=to_email,
        subject=f"⏰ Tu trial termina en {days_left} día{'s' if days_left != 1 else ''} — elige tu plan",
        html=_trial_ending_html(name, days_left, plan_url),
    )


async def send_payment_failed(to_email: str, name: str, portal_url: str) -> bool:
    return await _send(
        to=to_email,
        subject="⚠️ Pago fallido — actualiza tu método de pago",
        html=_payment_failed_html(name, portal_url),
    )


async def send_subscription_activated(
    to_email: str, name: str, plan: str, period_end: str
) -> bool:
    plan_label = {"starter": "Starter", "pro": "Pro", "enterprise": "Enterprise"}.get(plan, plan.title())
    return await _send(
        to=to_email,
        subject=f"✅ Plan {plan_label} activado — ¡listo para vender!",
        html=_subscription_activated_html(name, plan, period_end),
    )


async def send_daily_report(
    to_email: str,
    name: str,
    business_name: str,
    stats: dict[str, Any],
    date: str,
) -> bool:
    return await _send(
        to=to_email,
        subject=f"📊 Reporte diario {date} — {business_name}",
        html=_daily_report_html(name, business_name, stats, date),
    )


async def send_lead_qualified(
    to_email: str,
    name: str,
    lead_name: str,
    score: int,
    channel: str,
    conv_url: str,
) -> bool:
    return await _send(
        to=to_email,
        subject=f"🎯 Lead calificado: {lead_name} (score {score}/10)",
        html=_lead_qualified_html(name, lead_name, score, channel, conv_url),
    )


async def send_human_takeover(
    to_email: str,
    name: str,
    lead_name: str,
    channel: str,
    reason: str,
    conv_url: str,
) -> bool:
    return await _send(
        to=to_email,
        subject=f"🤝 Atención requerida: {lead_name} espera respuesta",
        html=_human_takeover_html(name, lead_name, channel, reason, conv_url),
    )


# ── Internal send ──────────────────────────────────────────────────────────

async def _send(to: str, subject: str, html: str) -> bool:
    if not settings.resend_api_key:
        logger.warning("email.skipped", reason="no_resend_api_key", to=to, subject=subject)
        return False
    try:
        resend.Emails.send({
            "from": f"{FROM_NAME} <{FROM_EMAIL}>",
            "to": [to],
            "subject": subject,
            "html": html,
        })
        logger.info("email.sent", to=to, subject=subject)
        return True
    except Exception as e:
        logger.error("email.failed", to=to, subject=subject, error=str(e))
        return False
