import React from 'react';
import { Link } from 'react-router-dom';
import LegalLayout from '../../components/legal/LegalLayout';
import { usePreferences } from '../../context/PreferencesContext';

const Section = ({ title, children }) => (
  <section>
    <h2 className="text-base font-semibold text-white mb-2">{title}</h2>
    {children}
  </section>
);

const TermsPage = () => {
  const { language } = usePreferences();
  const en = language === 'en';

  return (
    <LegalLayout title={en ? 'Terms of service' : 'Términos de servicio'}>
      <p>
        {en
          ? 'Welcome to MonArgent. By creating an account or using the app, you accept these terms. If you do not agree, do not use the service.'
          : 'Bienvenido a MonArgent. Al crear una cuenta o usar la app, aceptás estos términos. Si no estás de acuerdo, no uses el servicio.'}
      </p>
      <p>
        {en ? 'Personal data, security and privacy are covered in the ' : 'Lo relacionado con datos personales, seguridad y privacidad está en la '}
        <Link to="/privacidad" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
          {en ? 'Privacy Policy' : 'Política de privacidad'}
        </Link>
        {en ? '; here we only cover usage rules.' : '; acá solo hablamos de las reglas de uso.'}
      </p>

      <Section title={en ? '1. What is MonArgent' : '1. Qué es MonArgent'}>
        <p>
          {en
            ? 'MonArgent is a personal finance app: you record income and expenses, set savings goals, limit categories, share group expenses, import receipts and receive guidance recommendations. It also helps transfers between members by showing Mercado Pago aliases, but it does not process payments or hold money.'
            : 'MonArgent es una app de finanzas personales: registrás ingresos y gastos, armás objetivos de ahorro, limitás categorías, compartís gastos en grupos, importás tickets y recibís recomendaciones orientativas. También facilita transferencias entre miembros mostrando alias de Mercado Pago, pero no procesa pagos ni custodia plata.'}
        </p>
      </Section>

      <Section title={en ? '2. Account and eligibility' : '2. Cuenta y elegibilidad'}>
        <p>
          {en
            ? 'You must be over 18 and provide truthful information when registering. You are responsible for what happens in your account (including keeping your password safe).'
            : 'Tenés que ser mayor de 18 años y dar información veraz al registrarte. Sos responsable de lo que pase en tu cuenta (incluyendo el cuidado de tu contraseña).'}
        </p>
      </Section>

      <Section title={en ? '3. Allowed use' : '3. Uso permitido'}>
        <p>
          {en
            ? 'Use MonArgent lawfully and personally. You may not access other accounts, break or overload the service, or use it for fraud or other illegal activities.'
            : 'Usá MonArgent de forma lícita y personal. No podés entrar a cuentas ajenas, romper o sobrecargar el servicio, ni usarlo para fraude u otras actividades ilegales.'}
        </p>
      </Section>

      <Section title={en ? '4. Content you upload' : '4. Contenido que cargás'}>
        <p>
          {en
            ? 'Amounts, categories and other data you enter are yours and your responsibility. MonArgent is an organization tool: it is not financial, accounting or legal advice. Assisted recommendations are guidance only.'
            : 'Los montos, categorías y demás datos que ingresás son tuyos y bajo tu responsabilidad. MonArgent es una herramienta de organización: no es asesoramiento financiero, contable ni legal. Las recomendaciones asistidas son orientativas.'}
        </p>
      </Section>

      <Section title={en ? '5. Groups and payments between users' : '5. Grupos y pagos entre usuarios'}>
        <p>
          {en
            ? 'In shared expenses, agreements between participants are your responsibility. The app may show a Mercado Pago alias to facilitate transfer; payments are made outside MonArgent.'
            : 'En gastos compartidos, los acuerdos entre participantes son responsabilidad de ustedes. La app puede mostrar un alias de Mercado Pago para facilitar la transferencia; el pago lo hacen ustedes por fuera de MonArgent.'}
        </p>
      </Section>

      <Section title={en ? '6. Availability and changes' : '6. Disponibilidad y cambios'}>
        <p>
          {en
            ? 'We may update, suspend or remove features. We will notify relevant changes when reasonable. Continuing to use the app after a change implies accepting the new terms.'
            : 'Podemos actualizar, suspender o sacar funciones. Avisamos cambios relevantes cuando sea razonable. Seguir usando la app después de un cambio implica aceptar los términos nuevos.'}
        </p>
      </Section>

      <Section title={en ? '7. Limitation of liability' : '7. Limitación de responsabilidad'}>
        <p>
          {en
            ? 'MonArgent is provided "as is". We do not guarantee the service is free of errors or outages. To the extent permitted by law, we are not liable for indirect losses arising from app use.'
            : 'MonArgent se ofrece "tal cual". No garantizamos que el servicio esté libre de errores o cortes. En la medida que permita la ley, no respondemos por pérdidas indirectas derivadas del uso de la app.'}
        </p>
      </Section>

      <Section title={en ? '8. Contact' : '8. Contacto'}>
        <p>
          {en ? 'Questions about these terms: ' : 'Consultas sobre estos términos: '}
          <a href="mailto:monargent2026@gmail.com" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
            monargent2026@gmail.com
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
};

export default TermsPage;
