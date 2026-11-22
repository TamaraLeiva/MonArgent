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

const PrivacyPage = () => {
  const { language } = usePreferences();
  const en = language === 'en';

  return (
    <LegalLayout title={en ? 'Privacy and security policy' : 'Política de privacidad y seguridad'}>
      <p>
        {en ? 'This policy explains what data we use, why, who we share it with and how we protect it. App usage rules are in the ' : 'Esta política explica qué datos usamos, para qué, con quién los compartimos y cómo los cuidamos. Las reglas de uso de la app están en los '}
        <Link to="/terminos" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
          {en ? 'Terms of service' : 'Términos de servicio'}
        </Link>
        {en ? ' (minimum age, account and usage limits).' : ' (edad mínima, cuenta y límites de uso).'}
      </p>

      <Section title={en ? '1. Data we collect' : '1. Datos que recopilamos'}>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-slate-200">{en ? 'Account:' : 'Cuenta:'}</strong> {en ? 'name, email and password (stored encrypted).' : 'nombre, correo y contraseña (guardada cifrada).'}</li>
          <li><strong className="text-slate-200">{en ? 'Financial:' : 'Financieros:'}</strong> {en ? 'transactions, categories, goals, limits and profile.' : 'movimientos, categorías, objetivos, límites y perfil.'}</li>
          <li><strong className="text-slate-200">{en ? 'Groups:' : 'Grupos:'}</strong> {en ? 'groups, members, shared expenses and settlement proofs.' : 'grupos, integrantes, gastos compartidos y comprobantes de liquidación.'}</li>
          <li><strong className="text-slate-200">{en ? 'Receipts:' : 'Tickets:'}</strong> {en ? 'photos or files you upload to import expenses.' : 'fotos o archivos que subís para importar gastos.'}</li>
          <li><strong className="text-slate-200">{en ? 'Group payments:' : 'Pagos en grupos:'}</strong> {en ? 'the public Mercado Pago alias you configure (we do not ask for or store your MP password).' : 'el alias público de Mercado Pago que configurás (no pedimos ni guardamos tu contraseña de MP).'}</li>
          <li><strong className="text-slate-200">{en ? 'Technical:' : 'Técnicos:'}</strong> {en ? 'basic usage and error logs to keep the service running.' : 'registros básicos de uso y errores para mantener el servicio.'}</li>
        </ul>
      </Section>

      <Section title={en ? '2. How we use it' : '2. Para qué los usamos'}>
        <p>{en ? 'To make the app work: sign in, show your information, build group balances, charts, verification codes and, when you request it, recommendations or receipt reading.' : 'Para que la app funcione: iniciar sesión, mostrar tu información, armar balances de grupos, gráficos, códigos de verificación y, cuando lo pedís, recomendaciones o lectura de tickets.'}</p>
      </Section>

      <Section title={en ? '3. Who we share it with' : '3. Con quién se comparten'}>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-slate-200">{en ? 'AI provider:' : 'Proveedor de IA:'}</strong> {en ? 'only when you request recommendations or import a receipt; only the minimum needed for that feature is sent.' : 'solo cuando pedís recomendaciones o importar un ticket; se envía lo mínimo necesario para esa función.'}</li>
          <li><strong className="text-slate-200">Mercado Pago:</strong> {en ? 'we do not share full banking data; in groups the alias you provided is shown.' : 'no compartimos datos bancarios completos; en grupos se muestra el alias que vos cargaste.'}</li>
          <li><strong className="text-slate-200">{en ? 'Email:' : 'Correo:'}</strong> {en ? 'SMTP provider for verification and password recovery codes.' : 'proveedor SMTP para códigos de verificación y recuperación de contraseña.'}</li>
        </ul>
        <p className="mt-2">{en ? 'We do not sell your personal information.' : 'No vendemos tu información personal.'}</p>
      </Section>

      <Section title={en ? '4. Security' : '4. Seguridad'}>
        <p>{en ? 'We apply reasonable security measures: encrypted passwords, HTTPS traffic, restricted database access and expiring session tokens. No system is infallible: use a unique password and do not share it.' : 'Aplicamos medidas razonables de seguridad: contraseñas cifradas, tráfico por HTTPS, acceso restringido a la base de datos y tokens de sesión con vencimiento. Ningún sistema es infalible: usá una contraseña única y no la compartas.'}</p>
      </Section>

      <Section title={en ? '5. Retention' : '5. Conservación'}>
        <p>{en ? 'We keep your data while your account is active. You can request account closure and deletion of associated data by contacting us.' : 'Guardamos tus datos mientras tu cuenta esté activa. Podés pedir el cierre de cuenta y la eliminación de datos asociados escribiéndonos.'}</p>
      </Section>

      <Section title={en ? '6. Your rights' : '6. Tus derechos'}>
        <p>{en ? 'Under applicable Argentine law, you can access, rectify, update or request deletion of your personal data, and object to processing in cases provided by law.' : 'Según la normativa argentina aplicable, podés acceder, rectificar, actualizar o pedir la eliminación de tus datos personales, y oponerte al tratamiento en los casos que la ley prevé.'}</p>
      </Section>

      <Section title={en ? '7. Changes' : '7. Cambios'}>
        <p>{en ? 'We may update this policy. The current version is published in the app with the last updated date.' : 'Podemos actualizar esta política. La versión vigente queda publicada en la app con la fecha de última actualización.'}</p>
      </Section>

      <Section title={en ? '8. Contact' : '8. Contacto'}>
        <p>
          {en ? 'To exercise rights or ask about privacy and security: ' : 'Para ejercer derechos o consultar sobre privacidad y seguridad: '}
          <a href="mailto:monargent2026@gmail.com" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">monargent2026@gmail.com</a>.
        </p>
      </Section>
    </LegalLayout>
  );
};

export default PrivacyPage;
