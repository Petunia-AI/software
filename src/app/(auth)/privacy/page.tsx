export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Política de Privacidad</h1>
          <p className="text-sm text-gray-500 mt-2">Última actualización: 29 de marzo de 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Información que recopilamos</h2>
            <p>
              Petunia AI ("nosotros", "nuestro") recopila información que usted nos proporciona directamente al
              registrarse, incluyendo nombre, correo electrónico, nombre de la empresa y datos de pago. También
              recopilamos automáticamente datos de uso, registros del servidor e información del dispositivo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Uso de la información</h2>
            <p>Usamos su información para:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Proveer, operar y mejorar nuestros servicios</li>
              <li>Procesar transacciones y enviar avisos relacionados</li>
              <li>Enviar comunicaciones técnicas, actualizaciones y alertas de soporte</li>
              <li>Responder a comentarios y preguntas</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Integración con Meta (Facebook)</h2>
            <p>
              Si conecta su cuenta de Meta Ads, accedemos a su token de acceso, páginas de Facebook y cuentas
              publicitarias únicamente para crear y gestionar campañas en su nombre. No compartimos sus datos de
              Meta con terceros. Puede desconectar su cuenta en cualquier momento desde Configuración.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Compartir información</h2>
            <p>
              No vendemos, intercambiamos ni transferimos su información personal a terceros, excepto a
              proveedores de servicios que nos asisten en la operación del sistema (procesamiento de pagos,
              hosting, análisis), quienes están obligados a mantener la confidencialidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Seguridad</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger su información contra
              acceso no autorizado, alteración, divulgación o destrucción. Todos los datos se transmiten mediante
              HTTPS y se almacenan en servidores cifrados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Retención de datos</h2>
            <p>
              Conservamos su información mientras su cuenta esté activa o según sea necesario para prestar
              servicios. Puede solicitar la eliminación de su cuenta y datos en cualquier momento contactándonos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Sus derechos</h2>
            <p>Usted tiene derecho a:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Acceder a sus datos personales</li>
              <li>Corregir datos inexactos</li>
              <li>Solicitar la eliminación de sus datos</li>
              <li>Oponerse al procesamiento de sus datos</li>
              <li>Portabilidad de datos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Contacto</h2>
            <p>
              Para preguntas sobre esta política de privacidad, contáctenos en:{" "}
              <a href="mailto:contacto@aipetunia.com" className="text-purple-700 underline">
                contacto@aipetunia.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
