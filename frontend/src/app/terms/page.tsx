export const metadata = {
  title: "Términos y Condiciones — Petunia AI",
  description: "Términos y condiciones de uso de Petunia AI, plataforma de agentes de ventas con inteligencia artificial.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 px-6 py-16 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-violet-700">Términos y Condiciones de Uso</h1>
      <p className="text-sm text-gray-500 mb-10">Última actualización: 25 de abril de 2026</p>

      <section className="space-y-8 text-sm leading-relaxed">

        <div>
          <h2 className="text-lg font-semibold mb-2">1. Aceptación de los términos</h2>
          <p>
            Al acceder o utilizar Petunia AI (&quot;la Plataforma&quot;), aceptas quedar vinculado por estos Términos
            y Condiciones de Uso (&quot;Términos&quot;). Si no estás de acuerdo con alguno de ellos, no debes utilizar
            la Plataforma. El uso continuado de Petunia AI tras la publicación de cambios a estos Términos
            implica la aceptación de dichos cambios.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">2. Descripción del servicio</h2>
          <p>
            Petunia AI es una plataforma SaaS que proporciona agentes de ventas con inteligencia artificial
            capaces de gestionar conversaciones con leads en canales como WhatsApp, Instagram, Facebook
            Messenger, LinkedIn y TikTok, así como herramientas para la generación de contenido para redes
            sociales y la gestión de relaciones con clientes (CRM), incluyendo integración de correo
            electrónico con Gmail y Outlook.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">3. Cuentas de usuario</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Debes proporcionar información veraz y completa al registrarte.</li>
            <li>Eres responsable de mantener la confidencialidad de tus credenciales de acceso.</li>
            <li>Notificarás a Petunia AI inmediatamente si detectas uso no autorizado de tu cuenta.</li>
            <li>No puedes crear cuentas de forma automatizada ni en nombre de terceros sin su consentimiento.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">4. Uso permitido</h2>
          <p>Puedes utilizar Petunia AI exclusivamente para fines comerciales legítimos. Queda expresamente prohibido:</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Enviar spam, mensajes masivos no solicitados o comunicaciones engañosas.</li>
            <li>Usar la IA para generar contenido ilegal, ofensivo, discriminatorio o que infrinja derechos de terceros.</li>
            <li>Intentar acceder a cuentas, sistemas o datos de otros usuarios.</li>
            <li>Realizar ingeniería inversa, descompilar o intentar extraer el código fuente de la Plataforma.</li>
            <li>Revender o sublicenciar el acceso a la Plataforma sin autorización previa por escrito.</li>
            <li>Usar la Plataforma para actividades que violen la legislación aplicable en tu país.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">5. Integraciones con terceros</h2>
          <p>
            Al conectar plataformas de terceros (Meta, Google, Microsoft, LinkedIn, TikTok, Ayrshare, Twilio,
            entre otros) a Petunia AI, autorizas a la Plataforma a actuar en tu nombre conforme a los permisos
            que otorgues. Eres el único responsable del contenido publicado y los mensajes enviados a través
            de tus cuentas conectadas.
          </p>
          <p className="mt-2">
            El uso de las APIs de Google por parte de Petunia AI —incluyendo Gmail— se limita estrictamente
            a las funciones declaradas y cumple con la{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="text-violet-600 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Política de datos de usuario de los servicios de API de Google
            </a>
            , incluyendo los requisitos de Uso Limitado. Petunia AI no transfiere ni usa datos obtenidos
            de Gmail para publicidad ni para entrenar modelos de IA.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">6. Planes, pagos y cancelación</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Los planes de suscripción y sus precios se detallan en la página de precios de Petunia AI.</li>
            <li>Los pagos se procesan a través de Stripe. Al suscribirte, aceptas también los términos de uso de Stripe.</li>
            <li>Las suscripciones se renuevan automáticamente al inicio de cada período.</li>
            <li>Puedes cancelar tu suscripción en cualquier momento desde la configuración de tu cuenta. La cancelación entra en vigor al final del período de facturación en curso; no se realizan reembolsos por el período no consumido, salvo error de facturación.</li>
            <li>Petunia AI se reserva el derecho de modificar precios con un aviso previo de 30 días.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">7. Propiedad intelectual</h2>
          <p>
            Petunia AI y todo su contenido, diseño, logotipos, código y documentación son propiedad exclusiva
            de sus creadores y están protegidos por las leyes de propiedad intelectual. Al usar la Plataforma,
            no adquieres ningún derecho de propiedad sobre ella.
          </p>
          <p className="mt-2">
            El contenido que generes utilizando las herramientas de IA de Petunia AI es de tu propiedad.
            Sin embargo, otorgas a Petunia AI una licencia limitada para procesar dicho contenido
            exclusivamente con el fin de prestar el servicio.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">8. Privacidad de datos</h2>
          <p>
            El tratamiento de datos personales se rige por nuestra{" "}
            <a href="/privacy" className="text-violet-600 underline">
              Política de Privacidad
            </a>
            , que forma parte integral de estos Términos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">9. Limitación de responsabilidad</h2>
          <p>
            Petunia AI se proporciona &quot;tal cual&quot; y &quot;según disponibilidad&quot;. En la máxima medida permitida por
            la ley aplicable, Petunia AI no será responsable de:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Pérdidas de datos, ingresos o beneficios derivadas del uso o la imposibilidad de uso del servicio.</li>
            <li>Errores, inexactitudes o resultados producidos por los agentes de IA.</li>
            <li>Interrupciones del servicio por mantenimiento, fallas de terceros o causas de fuerza mayor.</li>
            <li>Contenido generado por IA que resulte inadecuado o incorrecto.</li>
          </ul>
          <p className="mt-2">
            La responsabilidad total de Petunia AI frente a ti no excederá el importe pagado en los
            últimos 3 meses por el uso de la Plataforma.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">10. Suspensión y terminación</h2>
          <p>
            Petunia AI se reserva el derecho de suspender o cancelar tu cuenta sin previo aviso si:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Incumples estos Términos.</li>
            <li>Tu uso pone en riesgo la seguridad o disponibilidad de la Plataforma.</li>
            <li>Se detecta actividad fraudulenta o abusiva.</li>
            <li>Existen pagos pendientes no regularizados tras 7 días de aviso.</li>
          </ul>
          <p className="mt-2">
            Tras la terminación, tus datos serán eliminados dentro de los 30 días, salvo obligación
            legal de conservarlos.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">11. Modificaciones al servicio</h2>
          <p>
            Petunia AI puede modificar, suspender o discontinuar funcionalidades en cualquier momento.
            Para cambios significativos, se notificará con al menos 15 días de anticipación por correo
            electrónico o mediante aviso en la Plataforma.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">12. Ley aplicable y jurisdicción</h2>
          <p>
            Estos Términos se rigen por la ley aplicable en la jurisdicción donde opera Petunia AI.
            Cualquier disputa se resolverá mediante arbitraje o ante los tribunales competentes de dicha
            jurisdicción. Si una cláusula de estos Términos resulta inválida, las demás permanecerán
            en plena vigencia.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">13. Contacto</h2>
          <p>
            Para cualquier consulta sobre estos Términos:
            <br />
            <strong>Email:</strong>{" "}
            <a href="mailto:hola@petunia.ai" className="text-violet-600 underline">
              hola@petunia.ai
            </a>
          </p>
        </div>

      </section>
    </main>
  );
}
