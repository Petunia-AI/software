"use client";

import { useState } from "react";
import {
  Search,
  BookOpen,
  MessageCircle,
  Smartphone,
  BarChart3,
  Zap,
  Globe,
  Video,
  Mail,
  ChevronRight,
  Clock,
  Star,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
  Lightbulb,
  ArrowLeft,
  Phone,
  Brain,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ContentSection {
  heading: string;
  body: string[];          // cada string es un párrafo o bullet
  type?: "steps" | "info" | "warning" | "tip" | "code";
}

interface DocArticle {
  title: string;
  description: string;
  time: string;
  difficulty: "Fácil" | "Medio" | "Avanzado";
  tag?: string;
  content: ContentSection[];
}

interface DocCategory {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  articles: DocArticle[];
}

/* ------------------------------------------------------------------ */
/*  Data — 9 categorías, 29 artículos con contenido completo          */
/* ------------------------------------------------------------------ */

const categories: DocCategory[] = [
  /* ==================== 1. Primeros Pasos ==================== */
  {
    title: "Primeros Pasos",
    description: "Guías para empezar con Petunia AI",
    icon: Star,
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    articles: [
      {
        title: "Guía de Inicio Rápido",
        description: "Configura Petunia en 30 minutos",
        time: "5 min",
        difficulty: "Fácil",
        tag: "Popular",
        content: [
          { heading: "Bienvenido a Petunia AI", body: [
            "Petunia AI es la plataforma todo-en-uno para agentes inmobiliarios que quieren automatizar su marketing, seguimiento de leads y generación de contenido con inteligencia artificial.",
            "En esta guía aprenderás a configurar tu cuenta en menos de 30 minutos y empezar a captar leads de forma automática.",
          ]},
          { heading: "Paso 1 — Crear tu cuenta", type: "steps", body: [
            "1. Ve a la página de registro y completa tus datos: nombre, correo y contraseña.",
            "2. Verifica tu correo electrónico haciendo clic en el enlace que te enviamos.",
            "3. Inicia sesión y serás redirigido al asistente de configuración inicial (Onboarding).",
          ]},
          { heading: "Paso 2 — Completar el Onboarding", type: "steps", body: [
            "1. Ingresa el nombre de tu empresa inmobiliaria y sube tu logotipo.",
            "2. Configura tus colores de marca (primario, secundario, acento).",
            "3. Selecciona tu zona geográfica y tipo de propiedades que manejas.",
            "4. Conecta al menos una integración: WhatsApp, Meta Ads o Email.",
          ]},
          { heading: "Paso 3 — Explorar el Dashboard", type: "steps", body: [
            "1. El Dashboard te muestra un resumen de leads, propiedades activas, seguimientos pendientes y métricas clave.",
            "2. Usa la barra lateral para navegar entre CRM, Contenido IA, Propiedades, Calendario y Configuración.",
            "3. El asistente Petunia Helper (esquina inferior derecha) puede guiarte en cualquier momento.",
          ]},
          { heading: "Consejo Pro", type: "tip", body: [
            "Conecta Meta Ads y WhatsApp Business como primeras integraciones — son las que generan resultados más rápido para el sector inmobiliario.",
          ]},
        ],
      },
      {
        title: "Glosario de Términos",
        description: "Vocabulario clave de la plataforma",
        time: "3 min",
        difficulty: "Fácil",
        content: [
          { heading: "Términos Generales", body: [
            "• Lead — Persona interesada en comprar, vender o rentar una propiedad que ha proporcionado sus datos de contacto.",
            "• Pipeline — El embudo de ventas visual donde se organizan los leads por etapa (Nuevo → Contactado → Interesado → Visita → Negociación → Cerrado).",
            "• Follow-up — Secuencia de seguimiento automático que se envía a un lead por WhatsApp, email o llamada.",
            "• Conversion Rate — Porcentaje de leads que completan una acción deseada (agendar visita, cerrar venta, etc.).",
          ]},
          { heading: "Términos de Marketing", body: [
            "• Lead Form — Formulario de captura de datos en Facebook/Instagram/TikTok que conecta directamente con Petunia.",
            "• Landing Page — Página web dedicada a una propiedad o campaña específica para captar leads.",
            "• CTR (Click-Through Rate) — Porcentaje de personas que hacen clic en tu anuncio respecto al total de impresiones.",
            "• CPL (Costo por Lead) — Cuánto pagas en publicidad por cada lead captado.",
            "• ROI (Retorno de Inversión) — Ganancia obtenida en relación a lo invertido en marketing.",
          ]},
          { heading: "Términos Técnicos", body: [
            "• Webhook — Conexión automática que envía datos de una plataforma a otra en tiempo real (ej: de Meta Ads a Petunia).",
            "• API Key — Clave secreta que permite a Petunia conectarse con servicios externos como HeyGen, Twilio o SendGrid.",
            "• Token de Acceso — Credencial temporal que autoriza a Petunia a actuar en tu nombre en plataformas como Facebook.",
            "• OAuth — Protocolo de autorización seguro para conectar cuentas sin compartir contraseñas.",
          ]},
          { heading: "Términos de IA", body: [
            "• Avatar IA — Representación digital de una persona que puede narrar videos generados por inteligencia artificial.",
            "• Voice AI — Sistema de llamadas automáticas que usa IA conversacional para hablar con leads.",
            "• Prompt — Instrucción de texto que se le da a la IA para generar contenido específico.",
            "• Generación de Contenido — Creación automática de posts, emails, descripciones de propiedades y más usando IA.",
          ]},
        ],
      },
      {
        title: "Preguntas Frecuentes",
        description: "Las 20 preguntas más comunes",
        time: "10 min",
        difficulty: "Fácil",
        content: [
          { heading: "Cuenta y Configuración", body: [
            "¿Cuánto cuesta Petunia? → Ofrecemos 3 planes: Starter ($49/mes), Professional ($149/mes) y Enterprise (personalizado). Todos incluyen prueba gratuita de 14 días.",
            "¿Puedo cambiar de plan? → Sí, puedes subir o bajar de plan en cualquier momento desde Configuración → Facturación.",
            "¿Cuántos usuarios puedo tener? → Starter: 1 usuario, Professional: 5 usuarios, Enterprise: ilimitados.",
            "¿Mis datos están seguros? → Sí, usamos encriptación SSL, base de datos cifrada y cumplimos con estándares GDPR.",
            "¿Puedo cancelar cuando quiera? → Sí, sin penalidades. Tu cuenta permanece activa hasta el final del período pagado.",
          ]},
          { heading: "Leads y CRM", body: [
            "¿Cómo llegan los leads a Petunia? → Automáticamente desde Meta Ads (Facebook/Instagram), TikTok, tu landing page, WhatsApp o formularios web.",
            "¿Puedo importar leads existentes? → Sí, desde CSV/Excel en la sección CRM → Importar Leads.",
            "¿Qué pasa si un lead no contesta? → Petunia activa automáticamente la secuencia de follow-up configurada (WhatsApp, email, llamada).",
            "¿Puedo asignar leads a diferentes agentes? → Sí, en el plan Professional y Enterprise puedes configurar reglas de asignación automática.",
            "¿Cuántos leads puedo tener? → Starter: 500/mes, Professional: 5,000/mes, Enterprise: ilimitados.",
          ]},
          { heading: "Integraciones", body: [
            "¿Necesito cuenta de Meta Business? → Sí, para conectar Facebook/Instagram Lead Ads necesitas una cuenta de Meta Business Suite.",
            "¿WhatsApp funciona con mi número personal? → No, necesitas WhatsApp Business API. Te guiamos paso a paso en la documentación.",
            "¿Puedo conectar Google Ads? → Sí, Petunia soporta Google Ads para campañas de búsqueda y display.",
            "¿Funciona con cualquier CRM externo? → Actualmente el CRM es interno, pero puedes exportar datos vía CSV o API.",
            "¿La IA funciona en español? → Sí, toda la generación de contenido, videos y Voice AI soportan español de Latinoamérica y España.",
          ]},
          { heading: "Contenido e IA", body: [
            "¿Qué tipo de contenido genera la IA? → Posts para redes sociales, descripciones de propiedades, emails de follow-up, scripts de video, landing pages y más.",
            "¿Los videos con Avatar IA son realistas? → Sí, usamos HeyGen para crear videos con avatares que lucen y suenan naturales.",
            "¿Puedo personalizar el tono del contenido? → Sí, puedes configurar el tono (profesional, amigable, formal) y la IA se adapta.",
            "¿Cuántos videos puedo crear? → Depende de tu plan y créditos de HeyGen. Starter: 5/mes, Professional: 20/mes.",
            "¿La IA aprende de mi marca? → Sí, la IA usa la información de tu empresa, propiedades y estilo de marca para generar contenido personalizado.",
          ]},
        ],
      },
    ],
  },

  /* ==================== 2. WhatsApp Business API ==================== */
  {
    title: "WhatsApp Business API",
    description: "Conecta y configura WhatsApp",
    icon: MessageCircle,
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    articles: [
      {
        title: "Guía de Setup WhatsApp",
        description: "Paso a paso con screenshots",
        time: "15 min",
        difficulty: "Medio",
        tag: "Esencial",
        content: [
          { heading: "Requisitos Previos", type: "info", body: [
            "• Cuenta de Meta Business Suite verificada.",
            "• Número de teléfono que NO esté registrado en WhatsApp personal ni WhatsApp Business App.",
            "• Acceso de administrador a tu cuenta de Meta Business.",
            "• Plan Petunia Professional o superior.",
          ]},
          { heading: "Paso 1 — Crear App en Meta Developers", type: "steps", body: [
            "1. Ve a developers.facebook.com y crea una nueva aplicación tipo «Business».",
            "2. En el panel de la app, agrega el producto «WhatsApp».",
            "3. Copia el Phone Number ID y el WhatsApp Business Account ID que aparecen en la configuración.",
          ]},
          { heading: "Paso 2 — Generar Token Permanente", type: "steps", body: [
            "1. En Meta Business Suite → Configuración → Usuarios del sistema, crea un usuario de sistema.",
            "2. Asigna permisos: whatsapp_business_management, whatsapp_business_messaging.",
            "3. Genera un token permanente para ese usuario de sistema.",
            "4. Copia el token — lo necesitarás en el siguiente paso.",
          ]},
          { heading: "Paso 3 — Configurar en Petunia", type: "steps", body: [
            "1. Ve a Configuración → Integraciones → WhatsApp.",
            "2. Pega el Phone Number ID, Business Account ID y Token.",
            "3. Haz clic en «Verificar Conexión» — deberías ver un check verde.",
            "4. Envía un mensaje de prueba a tu número para confirmar.",
          ]},
          { heading: "Paso 4 — Configurar Webhook", type: "steps", body: [
            "1. En Meta Developers → WhatsApp → Configuración → Webhook, agrega la URL que Petunia te proporciona.",
            "2. Suscríbete a los campos: messages, messaging_postbacks.",
            "3. Petunia procesará automáticamente los mensajes entrantes y los asociará al lead correcto en el CRM.",
          ]},
          { heading: "Importante", type: "warning", body: [
            "El número de WhatsApp Business API no puede usarse simultáneamente en la app de WhatsApp. Una vez registrado en la API, solo funcionará a través de Petunia.",
          ]},
        ],
      },
      {
        title: "Troubleshooting WhatsApp",
        description: "Errores comunes y soluciones",
        time: "8 min",
        difficulty: "Medio",
        content: [
          { heading: "Error: «Token Inválido»", body: [
            "Causa: El token de acceso ha expirado o fue generado incorrectamente.",
            "Solución: Genera un nuevo token permanente desde Meta Business Suite → Usuarios del Sistema. Asegúrate de seleccionar los permisos whatsapp_business_management y whatsapp_business_messaging.",
          ]},
          { heading: "Error: «Número no verificado»", body: [
            "Causa: El número de teléfono no completó la verificación por SMS o llamada.",
            "Solución: En Meta Developers → WhatsApp → Números de teléfono, solicita un nuevo código de verificación. Si usas un número VoIP, intenta con la opción de llamada de voz.",
          ]},
          { heading: "Error: «Webhook no responde»", body: [
            "Causa: La URL del webhook no es accesible o devuelve un código de error.",
            "Solución: Verifica que la URL sea HTTPS y que no tengas un firewall bloqueando las peticiones de Meta. Puedes probar con el botón «Test» en la configuración del webhook.",
          ]},
          { heading: "Los mensajes se envían pero no se reciben las respuestas", body: [
            "Causa: Los campos del webhook no están suscritos correctamente.",
            "Solución: En Meta Developers → Webhook, asegúrate de estar suscrito a «messages» y «messaging_postbacks». Revisa los logs en Petunia → Configuración → Logs de Integraciones.",
          ]},
          { heading: "Error: «Límite de mensajes alcanzado»", body: [
            "Causa: WhatsApp Business API tiene límites de envío según la calidad de tu cuenta.",
            "Solución: Los límites se incrementan automáticamente conforme tu calificación de calidad mejora. Empieza con 1,000 mensajes/día y sube a 10K, 100K. Mantén tasas de bloqueo bajo 2%.",
          ]},
          { heading: "Consejo", type: "tip", body: [
            "Usa la herramienta de diagnóstico en Petunia → Configuración → WhatsApp → Diagnosticar Conexión para verificar automáticamente todos los puntos de integración.",
          ]},
        ],
      },
      {
        title: "Referencia de API",
        description: "Endpoints disponibles",
        time: "10 min",
        difficulty: "Avanzado",
        content: [
          { heading: "Descripción General", body: [
            "La API de WhatsApp de Petunia te permite enviar mensajes, gestionar contactos y automatizar flujos de comunicación desde aplicaciones externas o integraciones personalizadas.",
            "Base URL: https://tu-instancia.petunia.ai/api/whatsapp",
            "Autenticación: Bearer Token (obtenerlo en Configuración → API Keys).",
          ]},
          { heading: "POST /api/whatsapp/send", type: "code", body: [
            "Envía un mensaje de texto a un contacto de WhatsApp.",
            "Parámetros: { phone: string (formato E.164, ej: +521234567890), message: string, leadId?: string }",
            "Respuesta: { success: true, messageId: string, timestamp: string }",
            "Ejemplo: POST /api/whatsapp/send → { \"phone\": \"+5215512345678\", \"message\": \"Hola, tenemos una propiedad que podría interesarte\" }",
          ]},
          { heading: "POST /api/whatsapp/send-template", type: "code", body: [
            "Envía un mensaje con template aprobado por Meta (necesario para iniciar conversaciones).",
            "Parámetros: { phone: string, templateName: string, language: string, components?: array }",
            "Nota: Los templates deben estar pre-aprobados en Meta Business Suite antes de usarse.",
          ]},
          { heading: "GET /api/whatsapp/messages/:leadId", type: "code", body: [
            "Obtiene el historial de mensajes de WhatsApp con un lead específico.",
            "Parámetros de query: limit (default: 50), offset (default: 0)",
            "Respuesta: { messages: Array<{ id, direction, content, timestamp, status }>, total: number }",
          ]},
          { heading: "Webhooks Entrantes", type: "info", body: [
            "Petunia procesa automáticamente los webhooks de WhatsApp. Los eventos disponibles que puedes escuchar desde tu integración:",
            "• message.received — Nuevo mensaje entrante de un lead.",
            "• message.delivered — Confirmación de entrega de mensaje.",
            "• message.read — El lead leyó tu mensaje.",
            "• message.failed — Error al enviar mensaje.",
          ]},
        ],
      },
      {
        title: "Mensajes Automáticos",
        description: "Configura respuestas automáticas",
        time: "5 min",
        difficulty: "Fácil",
        content: [
          { heading: "¿Qué son los Mensajes Automáticos?", body: [
            "Los mensajes automáticos son respuestas predefinidas que Petunia envía a los leads cuando se cumple una condición específica (nuevo lead, inactividad, agendar visita, etc.).",
            "Esto asegura que ningún lead quede sin atender, incluso fuera de horario laboral.",
          ]},
          { heading: "Configurar Mensaje de Bienvenida", type: "steps", body: [
            "1. Ve a Configuración → Automatizaciones → WhatsApp.",
            "2. Activa «Mensaje de Bienvenida Automático».",
            "3. Personaliza el mensaje. Puedes usar variables como {nombre}, {propiedad}, {agente}.",
            "4. Ejemplo: «¡Hola {nombre}! 👋 Soy {agente} de {empresa}. Vi que te interesó {propiedad}. ¿Te gustaría agendar una visita?»",
            "5. Configura el horario de envío (inmediato o dentro de horario laboral).",
          ]},
          { heading: "Configurar Respuestas Fuera de Horario", type: "steps", body: [
            "1. En la misma sección, activa «Respuesta Fuera de Horario».",
            "2. Define tu horario laboral (ej: Lunes a Viernes, 9:00 - 18:00).",
            "3. Escribe el mensaje para horario no laboral: «Gracias por tu interés. Estamos fuera de horario pero te contactaremos a primera hora. 🏠»",
          ]},
          { heading: "Mensajes de Seguimiento Automático", type: "steps", body: [
            "1. En Automatizaciones → Secuencias de Follow-up, crea una nueva secuencia.",
            "2. Define los tiempos: Mensaje 1 (inmediato), Mensaje 2 (24h después), Mensaje 3 (72h después).",
            "3. Personaliza cada mensaje con contexto relevante del lead.",
            "4. La secuencia se detiene automáticamente cuando el lead responde.",
          ]},
          { heading: "Mejores Prácticas", type: "tip", body: [
            "• Responde en los primeros 5 minutos — las tasas de conversión caen 80% después de 30 minutos.",
            "• Usa emojis con moderación para un tono amigable pero profesional.",
            "• Incluye siempre un call-to-action claro (agendar visita, ver propiedad, llamar).",
            "• Personaliza los mensajes con datos de la propiedad que le interesó al lead.",
          ]},
        ],
      },
    ],
  },

  /* ==================== 3. Meta Ads ==================== */
  {
    title: "Meta Ads (Facebook/Instagram)",
    description: "Captura leads de tus anuncios",
    icon: Globe,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    articles: [
      {
        title: "Setup Facebook Lead Ads",
        description: "Conecta tus formularios de Facebook",
        time: "10 min",
        difficulty: "Medio",
        content: [
          { heading: "Requisitos Previos", type: "info", body: [
            "• Cuenta de Facebook Business Manager con rol de administrador.",
            "• Al menos una página de Facebook asociada a tu negocio inmobiliario.",
            "• Cuenta de anuncios activa con método de pago configurado.",
            "• Plan Petunia Professional o superior.",
          ]},
          { heading: "Paso 1 — Autorizar Meta en Petunia", type: "steps", body: [
            "1. Ve a Configuración → Integraciones → Meta Ads.",
            "2. Si es la primera vez, ingresa tu Meta App ID y App Secret (se obtienen en Meta Developers).",
            "3. Haz clic en «Conectar con Facebook» — se abrirá la ventana de autorización de Meta.",
            "4. Selecciona tu cuenta de Business Manager y las páginas que quieres conectar.",
            "5. Acepta todos los permisos solicitados (leads_retrieval, pages_manage_ads, ads_management).",
          ]},
          { heading: "Paso 2 — Seleccionar Cuenta de Anuncios", type: "steps", body: [
            "1. Después de autorizar, Petunia mostrará tus cuentas de anuncios disponibles.",
            "2. Selecciona la cuenta desde la que ejecutas tus campañas inmobiliarias.",
            "3. Petunia sincronizará automáticamente tus formularios de Lead Ads existentes.",
          ]},
          { heading: "Paso 3 — Crear tu Primera Campaña", type: "steps", body: [
            "1. Ve a la sección Campañas → Nueva Campaña → Facebook Lead Ad.",
            "2. Selecciona el objetivo: Captación de Leads para Propiedad Específica o Captación General.",
            "3. La IA de Petunia generará automáticamente: copy del anuncio, audiencia sugerida y formulario optimizado para inmobiliarias.",
            "4. Revisa, ajusta y publica la campaña.",
          ]},
          { heading: "Importante", type: "warning", body: [
            "Los anuncios de propiedades se clasifican como «Vivienda» en Meta y tienen restricciones de segmentación especiales. Petunia configura esto automáticamente para cumplir con las políticas de Meta.",
          ]},
        ],
      },
      {
        title: "Setup Instagram Lead Ads",
        description: "Captura leads de Instagram",
        time: "10 min",
        difficulty: "Medio",
        content: [
          { heading: "Requisitos Previos", type: "info", body: [
            "• Cuenta de Instagram Business o Creator conectada a tu Facebook Page.",
            "• Facebook Business Manager configurado con Petunia (ver guía de Facebook Lead Ads).",
            "• La conexión de Meta Ads en Petunia ya debe estar activa.",
          ]},
          { heading: "Conectar Instagram", type: "steps", body: [
            "1. Ve a Facebook Business Suite → Configuración → Cuentas de Instagram.",
            "2. Vincula tu cuenta de Instagram Business con tu Business Manager.",
            "3. En Petunia, ve a Configuración → Integraciones → Meta Ads y verifica que la cuenta de Instagram aparezca.",
          ]},
          { heading: "Crear Anuncio de Leads en Instagram", type: "steps", body: [
            "1. En Petunia → Campañas → Nueva Campaña, selecciona «Instagram Lead Ad».",
            "2. Sube la creatividad: imagen o video de la propiedad (recomendado: 1080x1080 o 1080x1920 para Stories).",
            "3. La IA generará el copy optimizado para Instagram (más corto y visual que Facebook).",
            "4. Configura el formulario de lead: nombre, teléfono, email, interés (comprar/rentar).",
            "5. Publica y monitorea los resultados en tiempo real desde el Dashboard.",
          ]},
          { heading: "Formatos Recomendados para Inmobiliarias", type: "tip", body: [
            "• Feed: Carrusel de 3-5 fotos de la propiedad con precio y detalles clave.",
            "• Stories: Video corto (15s) con tour virtual y botón «Más Info».",
            "• Reels: Video de 30-60s mostrando la propiedad con música trending.",
            "• La IA de Petunia puede generar automáticamente el contenido visual y textual.",
          ]},
        ],
      },
      {
        title: "Configurar Lead Forms",
        description: "Templates optimizados para RE",
        time: "8 min",
        difficulty: "Fácil",
        content: [
          { heading: "¿Qué es un Lead Form?", body: [
            "Un Lead Form (formulario de captación) es el formulario que aparece cuando alguien hace clic en tu anuncio de Facebook o Instagram. Meta prerellena los datos del usuario para facilitar el envío.",
            "Petunia incluye templates optimizados específicamente para el sector inmobiliario con tasas de conversión probadas.",
          ]},
          { heading: "Templates Disponibles", body: [
            "📋 Captación Básica — Nombre, teléfono, email. Ideal para campañas de volumen alto.",
            "🏠 Interés en Propiedad — Nombre, teléfono, email, tipo de propiedad (casa/depto/terreno), presupuesto. Para campañas específicas.",
            "📅 Agendar Visita — Nombre, teléfono, fecha preferida, horario. Máxima intención de compra.",
            "💰 Pre-calificación — Nombre, teléfono, email, ingreso mensual, enganche disponible, plazo de compra. Para filtrar leads calificados.",
            "🔑 Inversionista — Nombre, teléfono, tipo de inversión, monto a invertir, zona de interés. Para proyectos de desarrollo.",
          ]},
          { heading: "Personalizar un Template", type: "steps", body: [
            "1. Al crear una campaña, selecciona el template que mejor se adapte.",
            "2. Puedes agregar, eliminar o reordenar campos según tu necesidad.",
            "3. Agrega una pantalla de agradecimiento personalizada: «¡Gracias! Un asesor te contactará en los próximos 5 minutos.»",
            "4. Configura un enlace de acción post-envío (ver propiedad, agendar visita, llamar).",
          ]},
          { heading: "Mejores Prácticas", type: "tip", body: [
            "• Menos campos = más leads. Usa máximo 3-4 campos para campañas de volumen.",
            "• Siempre incluye el número de teléfono — es el canal más efectivo para inmobiliarias.",
            "• Agrega una pregunta de «presupuesto» como rango para pre-filtrar leads calificados.",
            "• La pantalla de bienvenida debe explicar qué obtendrá el usuario al llenar el formulario.",
          ]},
        ],
      },
      {
        title: "Configuración de Webhooks",
        description: "Conecta webhooks correctamente",
        time: "12 min",
        difficulty: "Avanzado",
        content: [
          { heading: "¿Para qué sirven los Webhooks?", body: [
            "Los webhooks de Meta permiten que cuando alguien llena un formulario de Lead Ad, los datos lleguen instantáneamente a Petunia sin necesidad de sincronización manual.",
            "Sin webhooks, tendrías que esperar a que Petunia haga polling periódico (cada 5-15 min), lo cual retrasa el tiempo de respuesta al lead.",
          ]},
          { heading: "Paso 1 — Obtener URL del Webhook", type: "steps", body: [
            "1. Ve a Petunia → Configuración → Integraciones → Meta Ads → Webhooks.",
            "2. Copia la URL del webhook que Petunia genera automáticamente.",
            "3. También copia el Verify Token que necesitarás en Meta.",
          ]},
          { heading: "Paso 2 — Configurar en Meta Developers", type: "steps", body: [
            "1. Ve a developers.facebook.com → tu aplicación → Webhooks.",
            "2. Haz clic en «Agregar Suscripción» para el objeto «Page».",
            "3. En Callback URL, pega la URL de Petunia. En Verify Token, pega el token.",
            "4. Haz clic en «Verify and Save».",
            "5. Suscríbete al campo «leadgen» — este es el que envía los datos de leads.",
          ]},
          { heading: "Paso 3 — Probar la Conexión", type: "steps", body: [
            "1. En Meta, usa la herramienta de testing de Lead Ads para enviar un lead de prueba.",
            "2. Verifica en Petunia → CRM que el lead de prueba llegó correctamente.",
            "3. El lead debería aparecer en menos de 5 segundos.",
          ]},
          { heading: "Solución de Problemas", type: "warning", body: [
            "Si el webhook no responde: verifica que la URL sea HTTPS y accesible públicamente. Si usas un firewall, permite las IPs de Meta (lista disponible en Meta Developers docs).",
            "Si los leads no llegan: revisa que estés suscrito al campo «leadgen» y que tu app tenga los permisos leads_retrieval y pages_manage_ads.",
          ]},
        ],
      },
      {
        title: "Problemas Comunes",
        description: "Soluciones rápidas",
        time: "5 min",
        difficulty: "Fácil",
        content: [
          { heading: "«No se encontraron cuentas de anuncios»", body: [
            "Causa: El usuario de Facebook conectado no tiene permisos de administrador en la cuenta de anuncios.",
            "Solución: Ve a Facebook Business Manager → Configuración de Negocio → Personas y asegúrate de tener rol de Administrador. Luego reconecta en Petunia.",
          ]},
          { heading: "«Formulario no sincroniza»", body: [
            "Causa: El formulario fue creado en Ads Manager y no tiene un webhook configurado.",
            "Solución: Crea las campañas desde Petunia para que la conexión sea automática. Si el formulario existe, configura el webhook manualmente (ver guía de webhooks).",
          ]},
          { heading: "«Los leads llegan con datos incompletos»", body: [
            "Causa: Meta prerellena los campos con datos del perfil del usuario, que a veces están desactualizados.",
            "Solución: Agrega preguntas personalizadas que el usuario deba escribir manualmente (ej: «¿Cuál es tu presupuesto?»). Esto también mejora la calidad del lead.",
          ]},
          { heading: "«Anuncio rechazado por política de Vivienda»", body: [
            "Causa: Los anuncios de propiedades deben marcarse como «Categoría Especial: Vivienda» en Meta.",
            "Solución: Petunia marca esto automáticamente, pero si creaste el anuncio manualmente, ve a Ads Manager → Editar Campaña → selecciona «Vivienda» en Categoría Especial.",
          ]},
          { heading: "«CPL (costo por lead) muy alto»", type: "tip", body: [
            "• Revisa tu creatividad: fotos profesionales de propiedades convierten 3x mejor que fotos de celular.",
            "• Simplifica tu formulario: quita campos innecesarios.",
            "• Prueba audiencias similares (Lookalike) basadas en tus clientes actuales.",
            "• Usa video en lugar de imagen estática — los videos tienen 20-30% más engagement.",
            "• Deja correr la campaña al menos 3-5 días antes de optimizar.",
          ]},
        ],
      },
    ],
  },

  /* ==================== 4. CRM Pipeline ==================== */
  {
    title: "CRM Pipeline",
    description: "Gestiona tu proceso de ventas",
    icon: BarChart3,
    color: "text-[#611f69]",
    bgColor: "bg-[#4A154B]/10",
    articles: [
      {
        title: "Configurar Pipeline",
        description: "Personaliza tus etapas de venta",
        time: "8 min",
        difficulty: "Fácil",
        content: [
          { heading: "¿Qué es el Pipeline?", body: [
            "El Pipeline es tu embudo de ventas visual donde organizas cada lead según la etapa en que se encuentra dentro de tu proceso de venta inmobiliaria.",
            "Petunia viene preconfigurado con las etapas más comunes para inmobiliarias, pero puedes personalizarlas completamente.",
          ]},
          { heading: "Etapas Predeterminadas", body: [
            "🆕 Nuevo — Lead recién captado, sin contactar.",
            "📞 Contactado — Ya se estableció comunicación inicial.",
            "🏠 Interesado — Mostró interés real en una o más propiedades.",
            "📅 Visita Agendada — Tiene cita para visitar una propiedad.",
            "🤝 Negociación — En proceso de negociación de precio/condiciones.",
            "✅ Cerrado Ganado — ¡Venta o renta exitosa!",
            "❌ Cerrado Perdido — No se concretó la operación.",
          ]},
          { heading: "Personalizar Etapas", type: "steps", body: [
            "1. Ve a Configuración → CRM → Pipeline.",
            "2. Haz clic en «Editar Etapas» para ver todas las etapas actuales.",
            "3. Para agregar una etapa: haz clic en «+ Nueva Etapa», dale nombre y color.",
            "4. Para reordenar: arrastra y suelta las etapas en el orden deseado.",
            "5. Para eliminar: haz clic en el ícono de basura (los leads se moverán a la etapa anterior).",
          ]},
          { heading: "Mover Leads entre Etapas", type: "steps", body: [
            "1. En la vista CRM, arrastra la tarjeta del lead de una columna a otra.",
            "2. También puedes hacer clic en el lead → «Cambiar Etapa» y seleccionar la nueva etapa.",
            "3. Petunia registra automáticamente el historial de movimientos para tus reportes.",
          ]},
          { heading: "Consejo", type: "tip", body: [
            "Configura automatizaciones por etapa: por ejemplo, cuando un lead se mueva a «Visita Agendada», enviar automáticamente un recordatorio por WhatsApp con la dirección y hora.",
          ]},
        ],
      },
      {
        title: "Calificación de Leads",
        description: "Lead scoring automático",
        time: "10 min",
        difficulty: "Medio",
        content: [
          { heading: "¿Qué es el Lead Scoring?", body: [
            "El Lead Scoring es un sistema de puntuación automática que asigna un valor numérico a cada lead basado en su comportamiento, datos demográficos y nivel de interés.",
            "Esto te ayuda a priorizar los leads con mayor probabilidad de convertir y no perder tiempo con leads fríos.",
          ]},
          { heading: "Criterios de Puntuación Automática", body: [
            "📊 Datos del Lead (0-30 pts):",
            "• Teléfono válido: +10 pts",
            "• Email corporativo: +5 pts",
            "• Presupuesto declarado alineado con tus propiedades: +15 pts",
            "",
            "🔥 Comportamiento (0-40 pts):",
            "• Respondió WhatsApp en <1 hora: +15 pts",
            "• Visitó landing page múltiples veces: +10 pts",
            "• Preguntó por propiedad específica: +10 pts",
            "• Solicitó agendar visita: +5 pts",
            "",
            "📅 Engagement (0-30 pts):",
            "• Asistió a visita: +20 pts",
            "• Pidió documentación legal/financiera: +10 pts",
          ]},
          { heading: "Categorías de Lead", body: [
            "🔴 Lead Frío (0-25 pts) — Necesita nurturing. Agregar a secuencia de contenido de valor.",
            "🟡 Lead Tibio (26-60 pts) — Interés moderado. Seguimiento activo cada 48-72 horas.",
            "🟢 Lead Caliente (61-85 pts) — Alta probabilidad. Seguimiento diario, prioridad máxima.",
            "⭐ Lead Estrella (86-100 pts) — Listo para cerrar. Acción inmediata del agente.",
          ]},
          { heading: "Personalizar el Scoring", type: "steps", body: [
            "1. Ve a Configuración → CRM → Lead Scoring.",
            "2. Ajusta los puntos de cada criterio según tu experiencia y mercado.",
            "3. Agrega criterios personalizados (ej: zona de interés, tipo de operación).",
            "4. Activa alertas automáticas cuando un lead suba de categoría.",
          ]},
        ],
      },
      {
        title: "Secuencias de Follow-up",
        description: "Automatiza el seguimiento",
        time: "12 min",
        difficulty: "Medio",
        content: [
          { heading: "¿Por qué Automatizar el Follow-up?", body: [
            "El 80% de las ventas requieren al menos 5 puntos de contacto, pero el 44% de los agentes se rinden después del primer intento.",
            "Las secuencias automáticas de Petunia aseguran que cada lead reciba seguimiento oportuno y persistente sin esfuerzo manual.",
          ]},
          { heading: "Crear una Secuencia", type: "steps", body: [
            "1. Ve a Follow-up → Nueva Secuencia.",
            "2. Nombra tu secuencia (ej: «Secuencia Lead Nuevo - Departamento»).",
            "3. Selecciona el trigger: ¿cuándo se activa? (nuevo lead, cambio de etapa, inactividad, etc.).",
            "4. Agrega los pasos de la secuencia:",
          ]},
          { heading: "Ejemplo: Secuencia para Lead Nuevo", body: [
            "⏱️ Inmediato — WhatsApp: Mensaje de bienvenida personalizado con la propiedad de interés.",
            "⏱️ +2 horas — WhatsApp: Si no respondió, enviar foto principal + precio + link a la ficha.",
            "⏱️ +24 horas — Email: Enviar brochure completo de la propiedad con galería de fotos.",
            "⏱️ +48 horas — WhatsApp: Mensaje preguntando si desea agendar visita, con opciones de horario.",
            "⏱️ +72 horas — Tarea para agente: Llamar personalmente al lead.",
            "⏱️ +7 días — Email: Enviar propiedades similares que podrían interesarle.",
            "⏱️ +14 días — WhatsApp: Último seguimiento con oferta especial o nuevas opciones.",
          ]},
          { heading: "Reglas Inteligentes", type: "info", body: [
            "• La secuencia se pausa automáticamente si el lead responde.",
            "• Si el lead se mueve a «Visita Agendada», se activa la secuencia de pre-visita.",
            "• Los horarios de envío se ajustan automáticamente a tu zona horaria y horario laboral.",
            "• Petunia detecta si el lead ya fue contactado por otro canal para evitar duplicados.",
          ]},
          { heading: "Consejo Pro", type: "tip", body: [
            "Crea secuencias diferentes según la fuente del lead (Facebook, Instagram, Landing Page, Referido). Los leads de cada canal tienen expectativas y comportamientos distintos.",
          ]},
        ],
      },
    ],
  },

  /* ==================== 5. TikTok Lead Gen ==================== */
  {
    title: "TikTok Lead Gen",
    description: "Integra TikTok para captar leads",
    icon: Smartphone,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    articles: [
      {
        title: "Setup TikTok Lead Gen",
        description: "Conecta tu cuenta de TikTok",
        time: "10 min",
        difficulty: "Medio",
        content: [
          { heading: "Requisitos Previos", type: "info", body: [
            "• Cuenta de TikTok for Business con acceso a TikTok Ads Manager.",
            "• Cuenta de TikTok con al menos 1,000 seguidores (para Lead Gen orgánico) o cuenta de anuncios activa (para Lead Gen pagado).",
            "• Plan Petunia Professional o Enterprise.",
          ]},
          { heading: "Paso 1 — Crear App en TikTok Developers", type: "steps", body: [
            "1. Ve a developers.tiktok.com y crea una nueva aplicación.",
            "2. En los permisos, solicita: lead.info.read, ad.read, ad.write.",
            "3. Espera la aprobación de TikTok (generalmente 1-2 días hábiles).",
            "4. Una vez aprobada, copia el App ID y App Secret.",
          ]},
          { heading: "Paso 2 — Conectar en Petunia", type: "steps", body: [
            "1. Ve a Configuración → Integraciones → TikTok.",
            "2. Ingresa tu App ID y App Secret de TikTok.",
            "3. Haz clic en «Conectar con TikTok» — se abrirá la ventana de autorización.",
            "4. Autoriza el acceso a tu cuenta de anuncios.",
            "5. Selecciona el Advertiser Account que deseas conectar.",
          ]},
          { heading: "Paso 3 — Crear tu Primera Campaña", type: "steps", body: [
            "1. En Petunia → Campañas → Nueva Campaña → TikTok Lead Gen.",
            "2. Sube tu video creativo (recomendado: vertical 9:16, 15-60 segundos).",
            "3. La IA de Petunia puede generar el copy y sugerir audiencias basadas en tu mercado inmobiliario.",
            "4. Configura el formulario de captura con los campos que necesitas.",
            "5. Publica y monitorea desde el Dashboard.",
          ]},
          { heading: "Tips para Videos Inmobiliarios en TikTok", type: "tip", body: [
            "• Los videos que mejor convierten: tours rápidos de propiedades, «antes y después» de renovaciones, y tips de compra de vivienda.",
            "• Duración ideal: 15-30 segundos con gancho en los primeros 3 segundos.",
            "• Usa trending audio y texto superpuesto con precio y ubicación.",
            "• La IA de Petunia puede generar el guión del video automáticamente.",
          ]},
        ],
      },
      {
        title: "Configurar Webhooks TikTok",
        description: "Recibe leads automáticamente",
        time: "8 min",
        difficulty: "Avanzado",
        content: [
          { heading: "¿Por qué configurar Webhooks?", body: [
            "Sin webhooks, Petunia necesita hacer polling periódico a TikTok para obtener nuevos leads, causando retrasos de hasta 15 minutos.",
            "Con webhooks activos, los leads llegan instantáneamente a Petunia en menos de 5 segundos.",
          ]},
          { heading: "Paso 1 — Obtener la URL del Webhook", type: "steps", body: [
            "1. Ve a Petunia → Configuración → Integraciones → TikTok → Webhooks.",
            "2. Copia la URL de webhook generada por Petunia.",
            "3. Copia también el Secret Token para verificación.",
          ]},
          { heading: "Paso 2 — Configurar en TikTok", type: "steps", body: [
            "1. En TikTok Ads Manager → Herramientas → Lead Management.",
            "2. Selecciona tu formulario de leads.",
            "3. En «Integración CRM», selecciona «Webhook/CRM personalizado».",
            "4. Pega la URL de Petunia y el token de verificación.",
            "5. Haz clic en «Test Connection» — debería mostrar «Conectado con éxito».",
          ]},
          { heading: "Paso 3 — Verificar", type: "steps", body: [
            "1. En TikTok Ads Manager, usa la herramienta «Send Test Lead».",
            "2. Verifica que el lead de prueba aparezca en Petunia → CRM en menos de 10 segundos.",
            "3. Revisa que todos los campos se hayan mapeado correctamente.",
          ]},
          { heading: "Nota Importante", type: "warning", body: [
            "TikTok requiere que tu webhook responda con HTTP 200 en menos de 3 segundos. Petunia maneja esto automáticamente, pero si usas una integración intermedia (como Zapier), asegúrate de que cumpla con este requisito.",
          ]},
        ],
      },
    ],
  },

  /* ==================== 6. Contenido IA & Calendario ==================== */
  {
    title: "Contenido IA & Calendario",
    description: "Genera y programa contenido",
    icon: Zap,
    color: "text-orange-400",
    bgColor: "bg-orange-500/10",
    articles: [
      {
        title: "Generar Contenido con IA",
        description: "Posts, reels, emails y más",
        time: "5 min",
        difficulty: "Fácil",
        content: [
          { heading: "Tipos de Contenido Disponibles", body: [
            "La IA de Petunia puede generar contenido profesional para múltiples canales:",
            "📱 Redes Sociales — Posts para Facebook, Instagram (feed, stories, reels), TikTok y LinkedIn.",
            "✉️ Email Marketing — Newsletters, secuencias de nurturing, emails de follow-up personalizados.",
            "🏠 Propiedades — Descripciones atractivas, fichas técnicas, brochures digitales.",
            "📝 Blog/SEO — Artículos optimizados para buscadores sobre el mercado inmobiliario local.",
            "🎬 Scripts de Video — Guiones para videos con Avatar IA o grabación propia.",
            "🌐 Landing Pages — Páginas de captura optimizadas para cada propiedad o campaña.",
          ]},
          { heading: "Cómo Generar Contenido", type: "steps", body: [
            "1. Ve a Contenido IA en el menú lateral.",
            "2. Selecciona el tipo de contenido que quieres crear.",
            "3. Proporciona contexto: propiedad (si aplica), audiencia objetivo, tono deseado.",
            "4. La IA genera múltiples opciones para que elijas la mejor.",
            "5. Edita, ajusta y publica directamente o programa en el Calendario.",
          ]},
          { heading: "Personalización de la IA", type: "info", body: [
            "La IA aprende de tu marca: usa tu nombre de empresa, colores, tono de voz y datos de propiedades para generar contenido 100% personalizado.",
            "Configura tu perfil de marca en Configuración → Marca para mejores resultados.",
          ]},
          { heading: "Consejo Pro", type: "tip", body: [
            "Genera contenido en lote: crea una semana completa de posts en 10 minutos. Usa la función «Plan Semanal» que genera 7 posts variados automáticamente.",
          ]},
        ],
      },
      {
        title: "Calendario de Contenido",
        description: "Programa y publica automáticamente",
        time: "8 min",
        difficulty: "Fácil",
        content: [
          { heading: "¿Qué es el Calendario de Contenido?", body: [
            "El Calendario de Contenido de Petunia te permite visualizar, programar y gestionar todas tus publicaciones en redes sociales desde un solo lugar.",
            "Funciona como un planificador visual donde arrastras y sueltas contenido en los días que deseas publicar.",
          ]},
          { heading: "Programar Contenido", type: "steps", body: [
            "1. Ve a Calendario en el menú lateral.",
            "2. Haz clic en el día donde quieres programar una publicación.",
            "3. Selecciona contenido existente (de Contenido IA) o crea uno nuevo.",
            "4. Elige la hora de publicación y las redes sociales destino.",
            "5. Haz clic en «Programar» — el contenido se publicará automáticamente.",
          ]},
          { heading: "Vista del Calendario", body: [
            "📅 Vista Mensual — Panorama general del mes con indicadores de contenido por día.",
            "📋 Vista Semanal — Detalle de cada día con preview del contenido programado.",
            "📊 Vista Lista — Todas las publicaciones en formato tabla con filtros por red social, estado y fecha.",
          ]},
          { heading: "Horarios Óptimos de Publicación", type: "tip", body: [
            "La IA de Petunia analiza cuándo tu audiencia está más activa y sugiere horarios óptimos:",
            "• Facebook/Instagram: Martes a Jueves, 10:00-12:00 y 19:00-21:00.",
            "• TikTok: Lunes a Viernes, 7:00-9:00 y 17:00-19:00.",
            "• LinkedIn: Martes a Jueves, 8:00-10:00.",
            "Estos horarios se ajustan automáticamente según la zona horaria de tu audiencia.",
          ]},
        ],
      },
      {
        title: "Landing Pages",
        description: "Crea páginas de captura",
        time: "10 min",
        difficulty: "Medio",
        content: [
          { heading: "¿Para qué sirven las Landing Pages?", body: [
            "Las Landing Pages son páginas web dedicadas a una propiedad o campaña específica, diseñadas para captar datos de contacto de personas interesadas.",
            "A diferencia de tu sitio web general, una landing page tiene un solo objetivo: convertir visitantes en leads.",
          ]},
          { heading: "Crear una Landing Page", type: "steps", body: [
            "1. Ve a Landing Pages → Nueva Landing Page.",
            "2. Selecciona un template: Propiedad Individual, Desarrollo Nuevo, Captación General, Open House.",
            "3. La IA genera automáticamente el contenido basado en los datos de tu propiedad.",
            "4. Personaliza: textos, imágenes, colores, formulario de contacto.",
            "5. Publica con un solo clic — Petunia genera una URL única.",
          ]},
          { heading: "Templates Disponibles", body: [
            "🏡 Propiedad Individual — Galería de fotos, descripción, mapa, formulario. Ideal para cada listado.",
            "🏗️ Desarrollo Nuevo — Masterplan, renders, avance de obra, tabla de precios, apartado en línea.",
            "📋 Captación General — Para campañas que promocionan tu servicio como agente/inmobiliaria.",
            "🎉 Open House — Fecha del evento, dirección, RSVP, galería previa de la propiedad.",
          ]},
          { heading: "Optimización y Métricas", type: "info", body: [
            "Cada landing page incluye tracking automático de: visitas, tasa de conversión, tiempo en página, fuente de tráfico.",
            "Petunia te muestra qué propiedades generan más interés y sugiere optimizaciones en el copy y diseño.",
          ]},
          { heading: "Consejo", type: "tip", body: [
            "Comparte el link de tu landing page en el copy de tus anuncios de Facebook/Instagram/TikTok para captar leads con más información que un simple formulario de lead ad.",
          ]},
        ],
      },
    ],
  },

  /* ==================== 7. Voice AI ==================== */
  {
    title: "Voice AI",
    description: "Llamadas automáticas con IA",
    icon: Phone,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    articles: [
      {
        title: "Setup Twilio",
        description: "Configura telefonía",
        time: "15 min",
        difficulty: "Avanzado",
        content: [
          { heading: "Requisitos Previos", type: "info", body: [
            "• Cuenta de Twilio activa con saldo o plan pagado.",
            "• Número de teléfono de Twilio con capacidad de voz (Voice).",
            "• Plan Petunia Enterprise (Voice AI es una función premium).",
          ]},
          { heading: "Paso 1 — Crear Cuenta de Twilio", type: "steps", body: [
            "1. Ve a twilio.com y crea una cuenta.",
            "2. Verifica tu identidad y método de pago.",
            "3. Compra un número de teléfono en la región de tus leads (ej: +52 para México, +1 para USA).",
            "4. En la consola de Twilio, anota tu Account SID y Auth Token.",
          ]},
          { heading: "Paso 2 — Configurar en Petunia", type: "steps", body: [
            "1. Ve a Configuración → Integraciones → Voice AI / Twilio.",
            "2. Ingresa tu Account SID, Auth Token y número de teléfono de Twilio.",
            "3. Haz clic en «Verificar Conexión» — deberías escuchar un beep de confirmación en el número.",
            "4. Configura la URL del webhook de Twilio apuntando a Petunia (automático si usas el botón de configuración).",
          ]},
          { heading: "Paso 3 — Configurar Voice AI", type: "steps", body: [
            "1. Selecciona la voz del asistente IA (español neutro, español MX, español ES).",
            "2. Configura el script base de conversación (Petunia incluye templates para inmobiliarias).",
            "3. Define las reglas: cuándo llamar, cuántas veces intentar, horario permitido.",
            "4. Realiza una llamada de prueba a tu propio número para verificar la calidad.",
          ]},
          { heading: "Costos Aproximados", type: "info", body: [
            "• Twilio cobra por minuto de llamada: ~$0.02 USD/min para llamadas locales, ~$0.15 USD/min internacionales.",
            "• El procesamiento de IA de Petunia está incluido en tu plan Enterprise.",
            "• Una llamada promedio de calificación dura 2-3 minutos → ~$0.06 USD por lead contactado.",
          ]},
        ],
      },
      {
        title: "Scripts de Voz",
        description: "Personaliza conversaciones",
        time: "8 min",
        difficulty: "Medio",
        content: [
          { heading: "¿Qué es un Script de Voz?", body: [
            "Un script de voz es el guión que sigue la IA durante una llamada telefónica con un lead. Define el flujo de la conversación, las preguntas a hacer y cómo responder a distintos escenarios.",
            "Petunia usa IA conversacional avanzada, así que el script es una guía flexible, no un guión rígido.",
          ]},
          { heading: "Templates de Script Incluidos", body: [
            "📞 Calificación de Lead Nuevo — Saludo personalizado, confirma interés, pregunta presupuesto y timeline de compra, ofrece agendar visita.",
            "🏠 Confirmación de Visita — Confirma fecha/hora, envía dirección por WhatsApp, pregunta si tiene preguntas previas.",
            "🔄 Re-engagement — Para leads inactivos, ofrece nuevas propiedades, pregunta si cambió algo en sus necesidades.",
            "⭐ Post-Visita — Recoge feedback de la visita, pregunta interés de compra, ofrece opciones adicionales.",
          ]},
          { heading: "Personalizar un Script", type: "steps", body: [
            "1. Ve a Voice AI → Scripts → selecciona un template o crea uno nuevo.",
            "2. Define el «persona» del asistente: nombre, tono, velocidad de habla.",
            "3. Configura el flujo de conversación con bloques de: saludo, preguntas, respuestas a objeciones, cierre.",
            "4. Agrega variables dinámicas: {nombre_lead}, {propiedad}, {precio}, {dirección}.",
            "5. Prueba el script con una llamada de prueba antes de activarlo.",
          ]},
          { heading: "Mejores Prácticas", type: "tip", body: [
            "• Mantén las llamadas bajo 3 minutos para calificación y bajo 5 para seguimiento.",
            "• El primer saludo es crucial: «Hola {nombre}, soy Laura de {empresa}, te llamo porque vi tu interés en {propiedad}».",
            "• Configura la IA para transferir a un agente humano si el lead muestra alto interés.",
            "• Nunca llames antes de 9am o después de 8pm — Petunia respeta estos horarios automáticamente.",
          ]},
        ],
      },
      {
        title: "Routing de Llamadas",
        description: "Configura transferencias",
        time: "10 min",
        difficulty: "Avanzado",
        content: [
          { heading: "¿Qué es el Call Routing?", body: [
            "El Call Routing define cómo se manejan las llamadas entrantes y cuándo la IA debe transferir la llamada a un agente humano.",
            "Esto asegura que los leads más calientes hablen con un agente real cuando están listos para tomar una decisión.",
          ]},
          { heading: "Reglas de Transferencia Automática", body: [
            "La IA transfiere la llamada a un agente cuando detecta:",
            "• El lead dice que quiere agendar una visita presencial.",
            "• El lead pregunta por detalles legales o financieros específicos.",
            "• El lead menciona que quiere hacer una oferta.",
            "• El lead pide hablar con una persona real.",
            "• El lead scoring supera 80 puntos durante la conversación.",
          ]},
          { heading: "Configurar Routing", type: "steps", body: [
            "1. Ve a Voice AI → Routing → Reglas de Transferencia.",
            "2. Define los agentes disponibles y sus horarios de atención.",
            "3. Configura la prioridad: Round-robin (turnos), Por zona geográfica, Por tipo de propiedad.",
            "4. Define qué hacer si no hay agente disponible: dejar voicemail, programar callback, enviar WhatsApp.",
          ]},
          { heading: "Cola de Llamadas", type: "info", body: [
            "Cuando la IA transfiere una llamada y el agente no contesta en 30 segundos:",
            "1. Intenta con el siguiente agente en la cola.",
            "2. Si ningún agente contesta, la IA retoma la conversación y ofrece programar una llamada.",
            "3. El lead recibe un WhatsApp automático con la confirmación del callback.",
            "4. El agente recibe una notificación prioritaria para devolver la llamada.",
          ]},
        ],
      },
    ],
  },

  /* ==================== 8. Video Avatar ==================== */
  {
    title: "Video Avatar",
    description: "Videos personalizados con IA",
    icon: Video,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    articles: [
      {
        title: "Setup HeyGen",
        description: "Conecta tu avatar de video",
        time: "10 min",
        difficulty: "Medio",
        content: [
          { heading: "¿Qué es HeyGen?", body: [
            "HeyGen es la plataforma de avatares de video IA que Petunia usa para generar videos profesionales sin necesidad de cámara, estudio o equipo de grabación.",
            "Con HeyGen puedes crear un avatar digital que se ve y habla como una persona real, ideal para presentaciones de propiedades, bienvenidas personalizadas y marketing inmobiliario.",
          ]},
          { heading: "Paso 1 — Obtener API Key de HeyGen", type: "steps", body: [
            "1. Ve a heygen.com y crea una cuenta (necesitas plan Creator o superior para acceso a la API).",
            "2. En tu dashboard de HeyGen, ve a Settings → API.",
            "3. Genera una nueva API Key y cópiala.",
          ]},
          { heading: "Paso 2 — Configurar en Petunia", type: "steps", body: [
            "1. Opción A (Admin): Ve a /admin → Platform AI Config → pega la HeyGen API Key.",
            "2. Opción B (Env): Agrega HEYGEN_API_KEY=tu_clave en tu archivo .env.",
            "3. Verifica la conexión en Contenido IA → Video IA → Las voces deberían cargar automáticamente.",
          ]},
          { heading: "Paso 3 — Seleccionar o Crear Avatar", type: "steps", body: [
            "1. HeyGen ofrece avatares públicos gratuitos que puedes usar inmediatamente.",
            "2. Para un avatar personalizado: graba un video de 2 minutos tuyo hablando y súbelo a HeyGen.",
            "3. HeyGen creará un avatar digital con tu apariencia y voz en 24-48 horas.",
            "4. El avatar personalizado estará disponible automáticamente en Petunia.",
          ]},
          { heading: "Nota", type: "info", body: [
            "HeyGen cobra por minuto de video generado. Consulta los precios actuales en heygen.com/pricing. Los créditos se consumen al generar videos, no al crear el avatar.",
          ]},
        ],
      },
      {
        title: "Generar Videos",
        description: "Crea videos personalizados",
        time: "5 min",
        difficulty: "Fácil",
        content: [
          { heading: "Proceso de Generación", body: [
            "Petunia simplifica la creación de videos con IA a un proceso de 3 pasos: seleccionar propiedad, elegir tipo de video y generar.",
            "La IA escribe el guión, selecciona el avatar y la voz, y genera el video — todo automáticamente.",
          ]},
          { heading: "Paso a Paso", type: "steps", body: [
            "1. Ve a Contenido IA → Video IA.",
            "2. Selecciona el tipo de video: Presentación de Propiedad, Bienvenida a Lead, Tour Virtual Narrado, o Personalizado.",
            "3. Si es para una propiedad, selecciónala del listado — la IA usará sus datos y fotos.",
            "4. Elige la voz (español MX, español ES, inglés) — las voces se cargan desde HeyGen.",
            "5. Revisa el guión generado por la IA y edítalo si deseas.",
            "6. Haz clic en «Generar Video» — el proceso toma entre 2-5 minutos.",
            "7. Descarga el video o compártelo directamente por WhatsApp/Email al lead.",
          ]},
          { heading: "Tipos de Video", body: [
            "🏠 Presentación de Propiedad — El avatar presenta las características, precio y ubicación de una propiedad específica. Duración: 30-60 segundos.",
            "👋 Bienvenida Personalizada — Video de bienvenida para leads nuevos mencionando su nombre y la propiedad de interés. Duración: 15-30 segundos.",
            "🎥 Tour Virtual Narrado — El avatar narra un tour virtual con las fotos de la propiedad de fondo. Duración: 1-2 minutos.",
            "📊 Reporte de Mercado — Presenta datos del mercado inmobiliario local con gráficas y estadísticas. Duración: 1-3 minutos.",
          ]},
          { heading: "Consejo", type: "tip", body: [
            "Los videos personalizados con el nombre del lead tienen 3x más engagement que los videos genéricos. Usa la función de personalización masiva para enviar videos únicos a cada lead automáticamente.",
          ]},
        ],
      },
      {
        title: "Casos de Uso",
        description: "Ideas para usar video avatar",
        time: "5 min",
        difficulty: "Fácil",
        content: [
          { heading: "Marketing de Propiedades", body: [
            "🎬 Video de presentación para cada nueva propiedad listada — comparte en redes sociales y portales inmobiliarios.",
            "📱 Stories/Reels con avatar presentando «La propiedad de la semana».",
            "🌐 Video embebido en cada landing page de propiedad para aumentar tiempo en página y conversión.",
          ]},
          { heading: "Seguimiento de Leads", body: [
            "👋 Video de bienvenida automático cuando un nuevo lead llena un formulario: «Hola María, soy Carlos de Inmobiliaria ABC. Vi que te interesó el departamento en Polanco...»",
            "📅 Recordatorio de visita con video personalizado: «María, te esperamos mañana a las 3pm en Av. Reforma 500...»",
            "🔄 Re-engagement para leads fríos con nuevas opciones: «María, tenemos 3 nuevas propiedades en tu zona de interés...»",
          ]},
          { heading: "Branding Personal", body: [
            "🏆 Presentación de agente: crea un video donde tu avatar se presenta, habla de tu experiencia y especialización.",
            "📊 Reportes mensuales de mercado con tu avatar presentando estadísticas del sector inmobiliario local.",
            "🎓 Videos educativos: «5 errores al comprar tu primera vivienda», «Cómo funciona un crédito hipotecario».",
          ]},
          { heading: "Automatización Completa", body: [
            "El flujo completo automatizado de Petunia:",
            "1. Lead llena formulario en Facebook → Llega a Petunia CRM.",
            "2. Petunia genera video personalizado con avatar: «Hola {nombre}, gracias por tu interés en {propiedad}».",
            "3. El video se envía automáticamente por WhatsApp al lead.",
            "4. Si el lead responde, se activa la secuencia de follow-up.",
            "5. Resultado: leads atendidos en menos de 1 minuto, 24/7, con contenido personalizado.",
          ]},
          { heading: "ROI del Video Avatar", type: "tip", body: [
            "Agentes que usan video personalizado reportan: 40% más tasa de respuesta en follow-up, 25% más visitas agendadas y 15% más cierres de venta. El video construye confianza y conexión emocional que un texto no logra.",
          ]},
        ],
      },
    ],
  },

  /* ==================== 9. Email Marketing ==================== */
  {
    title: "Email Marketing",
    description: "Secuencias y campañas de email",
    icon: Mail,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    articles: [
      {
        title: "Setup SendGrid",
        description: "Configura tu servicio de email",
        time: "10 min",
        difficulty: "Medio",
        content: [
          { heading: "¿Por qué SendGrid?", body: [
            "SendGrid es el servicio de email que Petunia usa para enviar correos de marketing, follow-up y notificaciones transaccionales.",
            "SendGrid asegura alta tasa de entrega (deliverability) y cumplimiento con regulaciones anti-spam.",
          ]},
          { heading: "Paso 1 — Crear Cuenta de SendGrid", type: "steps", body: [
            "1. Ve a sendgrid.com y crea una cuenta (el plan gratuito permite 100 emails/día).",
            "2. Completa la verificación de identidad del remitente.",
            "3. En Settings → API Keys, crea una nueva API Key con permisos de «Full Access» o «Mail Send».",
            "4. Copia la API Key — solo se muestra una vez.",
          ]},
          { heading: "Paso 2 — Configurar en Petunia", type: "steps", body: [
            "1. Ve a Configuración → Integraciones → Email Marketing.",
            "2. Selecciona «SendGrid» como proveedor.",
            "3. Pega tu API Key de SendGrid.",
            "4. Configura el remitente: nombre (ej: «Carlos | Tu Inmobiliaria»), email (ej: carlos@tuinmobiliaria.com).",
            "5. Envía un email de prueba para verificar la configuración.",
          ]},
          { heading: "Paso 3 — Verificar Remitente", type: "steps", body: [
            "1. SendGrid requiere verificar tu dirección de email o dominio antes de poder enviar.",
            "2. Para verificación de email: revisa tu bandeja de entrada y haz clic en el enlace de verificación.",
            "3. Para verificación de dominio (recomendado): sigue la guía de «Verificación de Dominio» en esta Knowledge Base.",
          ]},
          { heading: "Planes de SendGrid", type: "info", body: [
            "• Free: 100 emails/día — suficiente para empezar.",
            "• Essentials ($19.95/mes): 50,000 emails/mes — recomendado para la mayoría.",
            "• Pro ($89.95/mes): 100,000 emails/mes — para equipos grandes.",
          ]},
        ],
      },
      {
        title: "Verificación de Dominio",
        description: "DNS records necesarios",
        time: "15 min",
        difficulty: "Avanzado",
        content: [
          { heading: "¿Por qué Verificar el Dominio?", body: [
            "Verificar tu dominio (ej: tuinmobiliaria.com) con SendGrid mejora drásticamente la tasa de entrega de tus emails.",
            "Sin verificación, tus emails tienen más probabilidad de caer en spam. Con verificación, tu dominio es reconocido como legítimo por Gmail, Outlook y otros proveedores.",
          ]},
          { heading: "Paso 1 — Iniciar Verificación en SendGrid", type: "steps", body: [
            "1. En SendGrid → Settings → Sender Authentication → Authenticate Your Domain.",
            "2. Selecciona tu proveedor de DNS (GoDaddy, Cloudflare, Namecheap, etc.).",
            "3. Ingresa tu dominio (ej: tuinmobiliaria.com).",
            "4. SendGrid generará 3-5 registros DNS que necesitas agregar.",
          ]},
          { heading: "Paso 2 — Agregar Registros DNS", type: "steps", body: [
            "Los registros que SendGrid te proporcionará son:",
            "• CNAME 1 — Para SendGrid Domain Authentication (em.tuinmobiliaria.com → sendgrid.net).",
            "• CNAME 2 — Para Link Branding (url.tuinmobiliaria.com → sendgrid.net).",
            "• CNAME 3 — Segundo registro de autenticación.",
            "Agrega estos registros en el panel de tu proveedor de dominio (GoDaddy, Cloudflare, etc.).",
          ]},
          { heading: "Paso 3 — Verificar", type: "steps", body: [
            "1. Los registros DNS pueden tardar hasta 48 horas en propagarse (generalmente 1-4 horas).",
            "2. Regresa a SendGrid → Sender Authentication y haz clic en «Verify».",
            "3. Si todo está correcto, verás un check verde en cada registro.",
          ]},
          { heading: "Registros Adicionales Recomendados", type: "info", body: [
            "• SPF (Sender Policy Framework) — Autoriza a SendGrid a enviar emails en nombre de tu dominio.",
            "• DKIM (DomainKeys Identified Mail) — Firma digital para autenticar tus emails.",
            "• DMARC — Política que indica qué hacer con emails no autenticados.",
            "SendGrid configura SPF y DKIM automáticamente. Para DMARC, agrega un registro TXT: _dmarc.tudominio.com → v=DMARC1; p=none; rua=mailto:tu@email.com",
          ]},
          { heading: "Nota", type: "warning", body: [
            "No modifiques ni elimines los registros DNS una vez verificados. Si cambias de proveedor de hosting, necesitarás recrear los registros. Contacta soporte si necesitas ayuda.",
          ]},
        ],
      },
      {
        title: "Crear Templates con IA",
        description: "Diseña emails profesionales",
        time: "8 min",
        difficulty: "Fácil",
        content: [
          { heading: "Templates Incluidos", body: [
            "Petunia incluye templates de email profesionales diseñados para el sector inmobiliario:",
            "🏠 Nueva Propiedad — Presenta una propiedad con galería de fotos, precio y call-to-action para agendar visita.",
            "👋 Bienvenida — Email de bienvenida para leads nuevos con presentación del agente y servicios.",
            "📊 Reporte de Mercado — Newsletter mensual con estadísticas del mercado inmobiliario local.",
            "📅 Recordatorio de Visita — Confirmación con dirección, hora y datos del agente.",
            "🎉 Open House — Invitación a evento de casa abierta con RSVP.",
            "💰 Oferta Especial — Promoción limitada con urgencia y escasez.",
          ]},
          { heading: "Personalizar un Template", type: "steps", body: [
            "1. Ve a Contenido IA → Email → Templates.",
            "2. Selecciona un template base y haz clic en «Personalizar».",
            "3. Edita los bloques arrastrando y soltando: encabezado, texto, imagen, botón, divisor.",
            "4. Agrega tu logotipo, colores de marca y datos de contacto.",
            "5. Usa variables dinámicas: {nombre}, {propiedad}, {precio}, {agente}, {empresa}.",
            "6. Guarda como nuevo template para usarlo en futuras campañas.",
          ]},
          { heading: "Crear Template con IA", type: "steps", body: [
            "1. En vez de partir de un template, haz clic en «Generar con IA».",
            "2. Describe lo que necesitas: «Email para presentar departamento de lujo en Polanco a leads de alto poder adquisitivo».",
            "3. La IA genera el template completo: asunto, preview text, cuerpo con imágenes y CTA.",
            "4. Revisa, ajusta y guarda.",
          ]},
          { heading: "Mejores Prácticas de Email", type: "tip", body: [
            "• Asunto: máximo 50 caracteres, crear curiosidad. Ej: «La propiedad que buscabas acaba de salir».",
            "• Preview text: complementa el asunto con urgencia. Ej: «Solo 3 unidades disponibles a este precio».",
            "• Una sola acción por email: no compitas con múltiples botones.",
            "• Incluye siempre opción de desuscribirse (Petunia lo agrega automáticamente).",
            "• Envía en horario laboral: Martes a Jueves, 10:00-11:00 tiene las mejores tasas de apertura.",
          ]},
        ],
      },
    ],
  },

  /* ==================== 10. IA con Aprendizaje Continuo ==================== */
  {
    title: "IA con Aprendizaje Continuo",
    description: "Haz que Petunia mejore con el tiempo",
    icon: Brain,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    articles: [
      {
        title: "¿Cómo aprende Petunia?",
        description: "Estrategias para una IA más inteligente",
        time: "8 min",
        difficulty: "Medio",
        tag: "Avanzado",
        content: [
          { heading: "El problema: Claude no tiene memoria nativa", body: [
            "Claude (el modelo de IA que impulsa a Petunia) no recuerda conversaciones anteriores entre sesiones. Cada vez que le hablas, empieza desde cero.",
            "Pero esto no significa que no pueda «aprender». La clave está en construir un sistema que inyecte contexto acumulado al inicio de cada conversación.",
            "Petunia implementa tres estrategias para simular aprendizaje continuo y hacer que la IA sea cada vez más precisa para tu negocio.",
          ]},
          { heading: "Estrategia 1 — System Prompt Dinámico", type: "info", body: [
            "En lugar de un prompt genérico, Petunia construye el contexto de la IA con datos reales de tu negocio antes de cada respuesta:",
            "• Personalidad base del asistente",
            "• Propiedades activas (títulos, precios, zonas)",
            "• Historial de campañas: qué funcionó y qué no",
            "• Métricas recientes de Meta Ads (CPL, CTR, conversiones)",
            "• Aprendizajes acumulados guardados en tu base de datos",
            "Cuanto más datos tenga Petunia sobre tu negocio, más precisas y personalizadas serán sus respuestas.",
          ]},
          { heading: "Estrategia 2 — Base de Conocimiento Viva", type: "info", body: [
            "Petunia mantiene tablas en la base de datos que se enriquecen con el tiempo:",
            "📊 Campañas → resultados, CTR, CPC, conversiones por audiencia",
            "📱 Contenido → qué posts tuvieron más engagement y en qué plataforma",
            "🏠 Propiedades → cuáles se vendieron rápido y qué las hacía atractivas",
            "🧠 Aprendizajes → notas manuales del agente o generadas automáticamente por la IA",
            "Antes de generar contenido o campañas, Petunia consulta esta base y adapta su respuesta.",
          ]},
          { heading: "Estrategia 3 — Feedback Loop Automático", type: "info", body: [
            "El ciclo completo de aprendizaje funciona así:",
            "1. Petunia genera una campaña o contenido.",
            "2. Se ejecuta y acumula resultados (Meta Ads API, engagement).",
            "3. Petunia guarda automáticamente qué funcionó en la base de datos.",
            "4. El próximo prompt incluye esos aprendizajes: «La última campaña con video tuvo CTR 3x mayor que con imagen estática».",
            "5. La IA ajusta sus recomendaciones basándose en datos reales de tu negocio.",
          ]},
          { heading: "Estado actual de Petunia", body: [
            "✅ Personalidad experta inmobiliaria — Configurado",
            "✅ Contexto de propiedades activas — Configurado",
            "✅ Historial de contenido generado — Disponible",
            "🔄 Aprendizaje de campañas — En desarrollo",
            "🔄 Conexión Meta Ads API para métricas — En desarrollo",
            "🔄 Base de conocimiento con feedback automático — En desarrollo",
          ]},
          { heading: "Recomendación", type: "tip", body: [
            "Lo más impactante y rápido de implementar: configurar bien tu perfil de negocio en Ajustes y agregar notas de aprendizaje después de cada campaña. Petunia los usará automáticamente en futuras generaciones.",
          ]},
        ],
      },
      {
        title: "System Prompt Dinámico",
        description: "Cómo Petunia construye el contexto de IA",
        time: "6 min",
        difficulty: "Avanzado",
        content: [
          { heading: "¿Qué es un System Prompt?", body: [
            "El system prompt es la instrucción base que recibe Claude antes de responder. Define quién es, qué sabe y cómo debe comportarse.",
            "En Petunia, este prompt no es estático — se construye dinámicamente en el servidor antes de cada llamada a la IA, inyectando datos reales de tu negocio.",
          ]},
          { heading: "Estructura del System Prompt de Petunia", type: "code", body: [
            "System Prompt = [Personalidad base]",
            "              + [Datos de la organización]",
            "              + [Propiedades activas + precios]",
            "              + [Historial de campañas recientes]",
            "              + [Métricas de rendimiento]",
            "              + [Aprendizajes acumulados]",
            "              + [Instrucción específica de la tarea]",
          ]},
          { heading: "Qué incluye cada bloque", body: [
            "🏢 Datos de la organización — Nombre de la empresa, zona geográfica, tipo de propiedades que maneja, tono de comunicación preferido.",
            "🏠 Propiedades activas — Las últimas 10-20 propiedades disponibles con título, precio, zona y características clave.",
            "📊 Campañas recientes — Las últimas 5 campañas con su objetivo, copy usado y resultados (CTR, CPL, leads generados).",
            "📈 Métricas de rendimiento — Promedio de CPL, tasas de conversión por fuente, contenido con mejor engagement.",
            "🧠 Aprendizajes — Notas guardadas por el agente o generadas automáticamente después de analizar resultados.",
          ]},
          { heading: "Cómo configurarlo en Petunia", type: "steps", body: [
            "1. Ve a Configuración → Mi Empresa y completa todos los campos: zona, tipo de propiedades, mercado objetivo.",
            "2. En Configuración → Asistente IA, define el tono de comunicación y especialización.",
            "3. Mantén tus propiedades actualizadas en la sección Propiedades — la IA las usa como contexto.",
            "4. Agrega notas de aprendizaje en Configuración → Base de Conocimiento después de cada campaña.",
          ]},
          { heading: "Resultado", type: "tip", body: [
            "Un agente que ha configurado bien su perfil y tiene 3 meses de historial en Petunia obtiene sugerencias de contenido y campañas hasta 60% más relevantes que uno que usa la configuración por defecto.",
          ]},
        ],
      },
      {
        title: "Base de Conocimiento",
        description: "Guarda lo que funciona en tu mercado",
        time: "5 min",
        difficulty: "Fácil",
        content: [
          { heading: "¿Qué es la Base de Conocimiento?", body: [
            "La Base de Conocimiento es una colección de aprendizajes, observaciones y datos que Petunia acumula sobre tu negocio y mercado específico.",
            "Cada vez que generas contenido, lanzas una campaña o cierras una venta, Petunia puede guardar qué funcionó para usarlo como contexto en futuras decisiones.",
          ]},
          { heading: "Tipos de aprendizajes que puedes guardar", body: [
            "📝 Aprendizajes de campaña — «La campaña de video para departamentos en Polanco tuvo CPL 40% menor que la de imagen.»",
            "🏠 Insights de propiedades — «Las propiedades con terraza se venden 2x más rápido en esta zona.»",
            "👥 Perfil del comprador — «Mi cliente típico es familia de 30-45 años, busca 3 recámaras, presupuesto $400K-$600K USD.»",
            "📱 Contenido que funciona — «Los posts de lunes en la mañana tienen 3x más engagement que los de viernes.»",
            "🎯 Audiencias efectivas — «La audiencia de 35-50 años con interés en inversiones convierte mejor que la general.»",
          ]},
          { heading: "Cómo agregar aprendizajes", type: "steps", body: [
            "1. Ve a Configuración → Base de Conocimiento.",
            "2. Haz clic en «+ Nuevo Aprendizaje».",
            "3. Selecciona la categoría: Campaña, Propiedad, Audiencia, Contenido u Otro.",
            "4. Escribe el aprendizaje en lenguaje natural — no necesita formato especial.",
            "5. Petunia lo incluirá automáticamente en el contexto de la IA en futuras sesiones.",
          ]},
          { heading: "Aprendizajes automáticos", type: "info", body: [
            "Petunia también genera aprendizajes automáticamente cuando detecta patrones significativos:",
            "• Una campaña supera o cae por debajo del promedio de CPL en más del 30%.",
            "• Un tipo de contenido recibe consistentemente más o menos engagement.",
            "• Una zona geográfica muestra mayor o menor tasa de conversión.",
            "Estos se guardan como «Aprendizajes IA» y los puedes editar o eliminar en cualquier momento.",
          ]},
          { heading: "Consejo", type: "tip", body: [
            "Dedica 5 minutos cada semana a revisar y agregar aprendizajes después de analizar tus resultados. Es la inversión más pequeña con el mayor impacto en la calidad de las recomendaciones de Petunia.",
          ]},
        ],
      },
      {
        title: "Feedback Loop de Campañas",
        description: "Cómo la IA aprende de tus resultados",
        time: "7 min",
        difficulty: "Medio",
        content: [
          { heading: "El ciclo de mejora continua", body: [
            "El feedback loop es el proceso por el que Petunia toma los resultados de tus acciones y los convierte en contexto para mejorar las próximas decisiones.",
            "Sin este ciclo, la IA siempre empieza desde cero. Con él, cada campaña hace que la siguiente sea mejor.",
          ]},
          { heading: "Cómo funciona el ciclo", type: "steps", body: [
            "1. 🚀 Petunia genera una campaña o contenido con la IA.",
            "2. 📊 La campaña se ejecuta y acumula datos (impresiones, clics, leads, conversiones).",
            "3. 🔄 Petunia sincroniza los resultados automáticamente desde Meta Ads o los registras manualmente.",
            "4. 🧠 El sistema analiza los resultados y genera un aprendizaje: «Esta audiencia + este copy = CPL $X».",
            "5. 💡 La próxima vez que generes una campaña similar, Petunia incluye ese aprendizaje en su contexto.",
            "6. 📈 Con el tiempo, las campañas se vuelven más precisas y eficientes para tu mercado específico.",
          ]},
          { heading: "Registrar resultados manualmente", type: "steps", body: [
            "Mientras la conexión automática con Meta Ads está en desarrollo, puedes registrar resultados manualmente:",
            "1. Ve a Campañas → selecciona la campaña.",
            "2. Haz clic en «Registrar Resultados».",
            "3. Ingresa: impresiones, clics, leads generados, costo total.",
            "4. Petunia calcula automáticamente CPL, CTR y ROI.",
            "5. Opcionalmente, agrega una nota: «Funcionó bien para compradores primerizos, no tanto para inversionistas.»",
          ]},
          { heading: "Métricas que Petunia aprende a optimizar", body: [
            "📉 CPL (Costo por Lead) — Aprende qué tipo de creatividad y audiencia reduce el costo por lead.",
            "📈 CTR (Click-Through Rate) — Aprende qué copy y visuales generan más clics.",
            "🎯 Tasa de conversión lead→visita — Aprende qué propiedades y mensajes generan más visitas agendadas.",
            "⏱️ Tiempo de respuesta — Aprende en qué horario los leads responden más rápido.",
            "🏆 Tasa de cierre — Aprende qué perfil de lead tiene mayor probabilidad de comprar.",
          ]},
          { heading: "Proyección de mejora", type: "tip", body: [
            "Basado en patrones observados: agentes con 3 meses de feedback loop activo reportan una reducción promedio del 25-35% en CPL y un incremento del 20-30% en tasa de conversión lead→visita, simplemente porque la IA aprende a replicar lo que funciona en su mercado específico.",
          ]},
        ],
      },
      {
        title: "Conexión Meta Ads API",
        description: "Métricas reales en tiempo real",
        time: "10 min",
        difficulty: "Avanzado",
        content: [
          { heading: "¿Por qué conectar Meta Ads API?", body: [
            "Conectar la API de Meta Ads permite a Petunia importar automáticamente los resultados de tus campañas sin que tengas que registrarlos manualmente.",
            "Con datos en tiempo real, el feedback loop se vuelve completamente automático: lanzas una campaña, los resultados se importan solos y la IA aprende sin intervención manual.",
          ]},
          { heading: "Datos que se importan automáticamente", body: [
            "📊 Por campaña — Impresiones, clics, leads generados, costo total, CPL, CTR, frecuencia.",
            "👥 Por audiencia — Qué segmentos de audiencia convirtieron mejor (edad, género, intereses, ubicación).",
            "🎨 Por creatividad — Qué imágenes, videos o copys tuvieron mejor rendimiento.",
            "⏰ Por horario — A qué horas del día y días de la semana hubo más conversiones.",
            "📍 Por ubicación — Qué zonas geográficas generaron leads de mayor calidad.",
          ]},
          { heading: "Cómo conectar Meta Ads API", type: "steps", body: [
            "1. Ve a Configuración → Integraciones → Meta Ads.",
            "2. Si ya conectaste Meta Ads para Lead Forms, la API ya está parcialmente configurada.",
            "3. Activa el permiso adicional «ads_read» en la reconexión de OAuth.",
            "4. En Campañas → Sincronización, haz clic en «Importar desde Meta».",
            "5. Selecciona el rango de fechas y las campañas a importar.",
            "6. Activa «Sincronización automática diaria» para mantener los datos al día.",
          ]},
          { heading: "Permisos necesarios", type: "warning", body: [
            "Para la sincronización automática, Petunia necesita los siguientes permisos de Meta:",
            "• ads_read — Leer estadísticas de campañas y anuncios.",
            "• ads_management — Necesario para algunos endpoints de reportes.",
            "• leads_retrieval — Ya configurado si usas Lead Forms.",
            "Si ya tienes Meta conectado, ve a Configuración → Integraciones → Meta Ads → Actualizar Permisos para agregar ads_read.",
          ]},
          { heading: "Resultado esperado", type: "tip", body: [
            "Una vez conectada la API, Petunia construirá automáticamente un historial de rendimiento que enriquece el contexto de la IA. En 4-6 semanas con datos suficientes, notarás que las sugerencias de campaña son significativamente más precisas para tu mercado.",
          ]},
        ],
      },
    ],
  },
];

const difficultyColors: Record<string, string> = {
  "Fácil": "bg-green-500/10 text-green-400",
  "Medio": "bg-yellow-500/10 text-yellow-400",
  "Avanzado": "bg-red-500/10 text-red-400",
};

/* ------------------------------------------------------------------ */
/*  Helper: render section with type-based styling                     */
/* ------------------------------------------------------------------ */

function SectionBlock({ section }: { section: ContentSection }) {
  const iconMap: Record<string, React.ReactNode> = {
    warning: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
    info:    <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
    tip:     <Lightbulb className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />,
  };

  const bgMap: Record<string, string> = {
    warning: "bg-amber-500/5 border border-amber-500/20",
    info:    "bg-blue-500/5 border border-blue-500/20",
    tip:     "bg-yellow-500/5 border border-yellow-500/20",
    code:    "bg-muted/50 border border-border/50 font-mono",
    steps:   "bg-primary/[0.03] border border-primary/10",
  };

  const bg = section.type ? bgMap[section.type] ?? "" : "";

  return (
    <div className={`rounded-xl p-4 ${bg}`}>
      <div className="flex items-start gap-2 mb-2">
        {section.type && iconMap[section.type]}
        <h4 className="text-sm font-semibold">{section.heading}</h4>
      </div>
      <div className="space-y-2 text-[13px] text-muted-foreground leading-relaxed">
        {section.body.map((line, i) => (
          <p key={i} className={line === "" ? "h-1" : ""}>{line}</p>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function DocsPage() {
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<{ article: DocArticle; category: string } | null>(null);

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      articles: cat.articles.filter(
        (a) =>
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          a.description.toLowerCase().includes(search.toLowerCase()) ||
          cat.title.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.articles.length > 0);

  const totalArticles = categories.reduce((sum, cat) => sum + cat.articles.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-8 text-white" style={{ background: 'linear-gradient(135deg, #4A154B 0%, #350d36 60%, #1a0a1a 100%)' }}>
        <div className="absolute inset-0 opacity-50" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='0.03'%3E%3Cpath d='M36 18c0-9.94-8.06-18-18-18S0 8.06 0 18 18 36 36 18'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-white/10 backdrop-blur-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50 mb-1">Documentación</p>
              <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
            </div>
          </div>
          <p className="text-white/70 text-sm mb-2">
            Guías paso a paso, tutoriales en video y documentación completa para sacar el máximo de Petunia AI.
          </p>
          <p className="text-white/40 text-xs mb-6">
            {categories.length} categorías · {totalArticles} artículos
          </p>
          <div className="relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Buscar en la documentación..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus-visible:ring-white/30"
            />
          </div>
        </div>
      </div>

      {/* Categories grid */}
      <div className="space-y-8">
        {filteredCategories.map((category) => (
          <div key={category.title}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-xl ${category.bgColor}`}>
                <category.icon className={`h-5 w-5 ${category.color}`} />
              </div>
              <div>
                <h2 className="text-base font-semibold">{category.title}</h2>
                <p className="text-xs text-muted-foreground">{category.description} · {category.articles.length} artículos</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {category.articles.map((article) => (
                <Card
                  key={article.title}
                  onClick={() => setSelectedArticle({ article, category: category.title })}
                  className="rounded-2xl border border-border/40 hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer group"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {article.title}
                      </h3>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {article.description}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={`text-[10px] rounded-full ${difficultyColors[article.difficulty]}`}>
                        {article.difficulty}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {article.time}
                      </span>
                      {article.tag && (
                        <Badge variant="secondary" className="text-[10px] rounded-full bg-primary/10 text-primary">
                          {article.tag}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] rounded-full bg-muted/50 text-muted-foreground ml-auto">
                        {article.content.length} secciones
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Help footer */}
      <Card className="rounded-2xl border border-border/50">
        <CardContent className="p-6 text-center">
          <p className="text-sm font-medium mb-1">¿No encuentras lo que buscas?</p>
          <p className="text-xs text-muted-foreground mb-4">
            Pregúntale a Petunia Helper usando el chat en la esquina inferior derecha.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5" />
            <span>O contáctanos en soporte@petunia.ai</span>
          </div>
        </CardContent>
      </Card>

      {/* Article Detail Dialog — now with full content */}
      <Dialog open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] p-0 gap-0">
          {selectedArticle && (
            <>
              {/* Sticky header */}
              <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/40 px-6 pt-6 pb-4 rounded-t-2xl">
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setSelectedArticle(null)}>
                      <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                      Volver
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] rounded-full bg-primary/10 text-primary">
                      {selectedArticle.category}
                    </Badge>
                    <Badge variant="secondary" className={`text-[10px] rounded-full ${difficultyColors[selectedArticle.article.difficulty]}`}>
                      {selectedArticle.article.difficulty}
                    </Badge>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {selectedArticle.article.time} de lectura
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      · {selectedArticle.article.content.length} secciones
                    </span>
                  </div>
                  <DialogTitle className="text-lg">{selectedArticle.article.title}</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{selectedArticle.article.description}</p>
                </DialogHeader>
              </div>

              {/* Scrollable content */}
              <ScrollArea className="max-h-[calc(85vh-160px)]">
                <div className="space-y-4 px-6 py-4">
                  {/* Table of contents */}
                  <div className="rounded-xl bg-muted/30 p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contenido</h4>
                    <div className="space-y-1.5">
                      {selectedArticle.article.content.map((section, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[13px]">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="text-muted-foreground">{section.heading}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sections */}
                  {selectedArticle.article.content.map((section, idx) => (
                    <SectionBlock key={idx} section={section} />
                  ))}

                  {/* Footer CTA */}
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-3">
                      ¿Tienes dudas sobre esta guía? Petunia Helper puede ayudarte en tiempo real.
                    </p>
                    <Button size="sm" className="rounded-xl gold-gradient text-white border-0" onClick={() => setSelectedArticle(null)}>
                      <Star className="h-3.5 w-3.5 mr-1.5" />
                      Preguntar a Petunia
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
