export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Condiciones del Servicio</h1>
          <p className="text-sm text-gray-500 mt-2">Última actualización: 29 de marzo de 2026</p>
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Aceptación de los términos</h2>
            <p>
              Al acceder y usar Petunia AI ("el Servicio"), usted acepta estar vinculado por estos Términos de
              Servicio. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder al Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Descripción del servicio</h2>
            <p>
              Petunia AI es una plataforma de automatización de marketing inmobiliario que permite a las
              inmobiliarias gestionar campañas publicitarias, leads, contenido y comunicaciones mediante
              inteligencia artificial.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Uso aceptable</h2>
            <p>Usted se compromete a no:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Usar el Servicio para actividades ilegales o no autorizadas</li>
              <li>Transmitir contenido dañino, ofensivo o spam</li>
              <li>Intentar acceder a cuentas de otros usuarios</li>
              <li>Interferir con el funcionamiento del Servicio</li>
              <li>Revender o redistribuir el Servicio sin autorización</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Cuentas y responsabilidad</h2>
            <p>
              Usted es responsable de mantener la confidencialidad de sus credenciales de acceso y de todas las
              actividades que ocurran bajo su cuenta. Notifíquenos inmediatamente sobre cualquier uso no
              autorizado de su cuenta.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Facturación y pagos</h2>
            <p>
              Los servicios de pago están sujetos a las tarifas publicadas en el sitio. Los cobros se realizan
              mensualmente. Puede cancelar en cualquier momento; no se realizan reembolsos por períodos
              parciales ya facturados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Propiedad intelectual</h2>
            <p>
              El Servicio y su contenido original, características y funcionalidades son propiedad de Petunia AI
              y están protegidos por leyes de propiedad intelectual. Usted retiene la propiedad de los datos que
              ingresa al Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitación de responsabilidad</h2>
            <p>
              Petunia AI no será responsable por daños indirectos, incidentales, especiales o consecuentes
              derivados del uso o la imposibilidad de usar el Servicio. Nuestra responsabilidad total no
              excederá el monto pagado por el Servicio en los últimos 12 meses.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Terminación</h2>
            <p>
              Podemos terminar o suspender su acceso al Servicio inmediatamente, sin previo aviso, si viola
              estos Términos. Tras la terminación, su derecho a usar el Servicio cesará inmediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cambios a los términos</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Le notificaremos
              sobre cambios significativos por correo electrónico o mediante un aviso en el Servicio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Contacto</h2>
            <p>
              Para preguntas sobre estos términos, contáctenos en:{" "}
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
