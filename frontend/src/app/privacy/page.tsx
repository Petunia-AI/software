export const metadata = {
  title: "Política de Privacidad — Petunia AI",
  description: "Política de privacidad de Petunia AI, plataforma de agentes de ventas con inteligencia artificial.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-violet-700">Política de Privacidad</h1>
      <p className="text-sm text-gray-500 mb-10">Última actualización: 25 de abril de 2026</p>

      <section className="space-y-8 text-sm leading-relaxed">

        <div>
          <h2 className="text-lg font-semibold mb-2">1. Quiénes somos</h2>
          <p>
            Petunia AI es una plataforma de agentes de ventas con inteligencia artificial que permite a negocios
            automatizar la atención en WhatsApp, Instagram y Facebook Messenger, y generar contenido para redes
            sociales. Somos responsables del tratamiento de los datos personales que se procesan a través de
            nuestra plataforma.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Datos que recopilamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Datos de registro:</strong> nombre, correo electrónico y contraseña de los usuarios que crean una cuenta en Petunia AI.</li>
            <li><strong>Datos del negocio:</strong> nombre, industria, descripción, número de WhatsApp y páginas de redes sociales configuradas por el usuario.</li>
            <li><strong>Datos de conversaciones:</strong> mensajes intercambiados entre los agentes de IA y los clientes finales de nuestros usuarios, a través de WhatsApp, Instagram DMs y Facebook Messenger.</li>
            <li><strong>Datos de leads:</strong> nombre, teléfono, correo electrónico y comentarios de personas que contactan a los negocios a través de los canales integrados.</li>
            <li><strong>Datos de uso:</strong> registros de actividad, preferencias de configuración de agentes e historial de contenido generado.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Cómo usamos los datos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Operar y mejorar los servicios de Petunia AI.</li>
            <li>Procesar mensajes entrantes y generar respuestas automáticas mediante IA.</li>
            <li>Enviar comunicaciones de servicio (actualizaciones, alertas de cuenta).</li>
            <li>Generar análisis y reportes de desempeño para los usuarios de la plataforma.</li>
            <li>Cumplir con obligaciones legales y de seguridad.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. Integraciones con Meta (Facebook / Instagram / WhatsApp)</h2>
          <p>
            Petunia AI se integra con la API de Meta para recibir y enviar mensajes en nombre de los negocios
            que usan nuestra plataforma. Al conectar tu página de Facebook, cuenta de Instagram o número de
            WhatsApp Business, otorgas a Petunia AI permiso para acceder a los mensajes de dichos canales
            con el único fin de operar el servicio de agente de ventas. No almacenamos tokens de acceso de
            forma permanente más allá de lo necesario para operar el servicio. No compartimos datos de
            conversaciones con terceros salvo obligación legal.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">5. Integración con Gmail (Google OAuth2)</h2>
          <p>
            Petunia AI permite conectar una cuenta de Gmail mediante el protocolo OAuth 2.0 de Google para
            gestionar el correo electrónico de ventas directamente desde la plataforma CRM. Al conectar tu
            cuenta de Gmail, otorgas a Petunia AI los siguientes permisos:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Leer correos</strong> (<code>gmail.readonly</code>): para mostrar tu bandeja de entrada en Petunia AI.</li>
            <li><strong>Enviar correos</strong> (<code>gmail.send</code>): para enviar emails a tus leads desde la plataforma.</li>
            <li><strong>Modificar correos</strong> (<code>gmail.modify</code>): para marcar mensajes como leídos.</li>
          </ul>
          <p className="mt-2">
            El uso que Petunia AI hace de la información obtenida a través de las APIs de Google se limita
            estrictamente a proporcionar las funciones de CRM de email descritas. Petunia AI{" "}
            <strong>no transfiere, vende ni usa datos de Gmail para entrenar modelos de IA</strong>.
            Los tokens de acceso se cifran con AES-256 antes de ser almacenados. Puedes revocar el acceso
            en cualquier momento desde{" "}
            <a href="https://myaccount.google.com/permissions" className="text-violet-600 underline" target="_blank" rel="noopener noreferrer">
              myaccount.google.com/permissions
            </a>{" "}
            o desde la sección <strong>Email CRM → Cuentas conectadas</strong> en Petunia AI.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            El uso de las APIs de Google cumple con la{" "}
            <a href="https://developers.google.com/terms/api-services-user-data-policy" className="underline" target="_blank" rel="noopener noreferrer">
              Política de datos de usuario de los servicios de API de Google
            </a>
            , incluyendo los requisitos de Uso Limitado.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">7. Compartición de datos</h2>
          <p>No vendemos ni alquilamos datos personales. Podemos compartir datos con:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Proveedores de infraestructura</strong> (Railway, Vercel) para el alojamiento de la plataforma.</li>
            <li><strong>Anthropic (Claude)</strong> para el procesamiento de lenguaje natural de los agentes.</li>
            <li><strong>fal.ai</strong> para la generación de imágenes de contenido.</li>
            <li><strong>Autoridades competentes</strong> cuando sea legalmente requerido.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">8. Retención de datos</h2>
          <p>
            Los datos de conversaciones y leads se conservan mientras la cuenta esté activa. Al cancelar la
            suscripción, los datos se eliminan dentro de los 30 días siguientes, salvo obligación legal de
            conservarlos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">9. Derechos del usuario</h2>
          <p>Tienes derecho a:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Acceder, rectificar o eliminar tus datos personales.</li>
            <li>Exportar tus datos en formato legible.</li>
            <li>Revocar el acceso de Petunia AI a tus canales de Meta en cualquier momento desde la configuración de tu cuenta.</li>
          </ul>
          <p className="mt-2">Para ejercer estos derechos, escríbenos a <strong>privacidad@petunia.ai</strong></p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">10. Seguridad</h2>
          <p>
            Implementamos medidas técnicas y organizativas para proteger los datos: cifrado en tránsito (HTTPS/TLS),
            almacenamiento cifrado, control de acceso por roles y revisión periódica de seguridad.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">11. Cambios a esta política</h2>
          <p>
            Podemos actualizar esta política periódicamente. Notificaremos cambios significativos por correo
            electrónico o mediante aviso en la plataforma con al menos 15 días de anticipación.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">12. Contacto</h2>
          <p>
            Si tienes preguntas sobre esta política, contáctanos en:
            <br />
            <strong>Email:</strong> privacidad@petunia.ai
          </p>
        </div>

      </section>
    </main>
  );
}
