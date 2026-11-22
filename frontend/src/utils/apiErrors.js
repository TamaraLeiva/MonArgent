import { getLanguage } from './preferencesStore';

const MESSAGES = {
  es: {
    'The requested resource was not found': 'No se encontró el recurso solicitado.',
    'Malformed request body or invalid value': 'El cuerpo de la solicitud es inválido o tiene un valor incorrecto.',
    'An unexpected error occurred': 'Ocurrió un error inesperado. Intentá de nuevo.',
    'Invalid or expired JWT token': 'Token de sesión inválido o vencido.',
    'Unauthorized': 'No autorizado.',
    'Invalid email or password': 'Correo o contraseña incorrectos. Verificá que el email esté bien escrito.',
    'Correo o contraseña incorrectos': 'Correo o contraseña incorrectos. Verificá que el email esté bien escrito.',
    'Email is already registered': 'El correo ya está registrado.',
    'Invalid verification code': 'Código de verificación inválido.',
    'Verification code expired': 'El código de verificación venció.',
    'Passwords do not match': 'Las contraseñas no coinciden.',
    'No account found for this email': 'No hay una cuenta asociada a este correo.',
    'Transaction not found': 'Movimiento no encontrado.',
    'Category not found': 'Categoría no encontrada.',
    'Notification not found': 'Notificación no encontrada.',
  },
  en: {
    'The requested resource was not found': 'The requested resource was not found.',
    'Malformed request body or invalid value': 'The request body is invalid or has an incorrect value.',
    'An unexpected error occurred': 'An unexpected error occurred. Please try again.',
    'Invalid or expired JWT token': 'Invalid or expired session token.',
    'Unauthorized': 'Unauthorized.',
    'Invalid email or password': 'Incorrect email or password. Check that the email is correct.',
    'Correo o contraseña incorrectos': 'Incorrect email or password. Check that the email is correct.',
    'Email is already registered': 'Email is already registered.',
    'Invalid verification code': 'Invalid verification code.',
    'Verification code expired': 'Verification code expired.',
    'Passwords do not match': 'Passwords do not match.',
    'No account found for this email': 'No account found for this email.',
    'Transaction not found': 'Transaction not found.',
    'Category not found': 'Category not found.',
    'Notification not found': 'Notification not found.',
  },
};

const FALLBACKS = {
  es: {
    default: 'Ocurrió un error. Intentá de nuevo.',
    404: 'No se encontró el recurso solicitado.',
    401: 'Tu sesión expiró. Volvé a iniciar sesión.',
    403: 'No tenés permiso para realizar esta acción.',
    429: 'Demasiados intentos. Probá de nuevo más tarde.',
    500: 'El servidor no está disponible. Intentá más tarde.',
  },
  en: {
    default: 'An error occurred. Please try again.',
    404: 'The requested resource was not found.',
    401: 'Your session expired. Please log in again.',
    403: 'You don\'t have permission to perform this action.',
    429: 'Too many attempts. Please try again later.',
    500: 'The server is unavailable. Try again later.',
  },
};

export function getErrorMessage(error, fallback) {
  const lang = getLanguage() === 'en' ? 'en' : 'es';
  const message = error?.response?.data?.message;
  if (message) {
    return MESSAGES[lang][message] || MESSAGES.es[message] || MESSAGES.en[message] || message;
  }
  const status = error?.response?.status;
  const fb = FALLBACKS[lang];
  if (status === 404) return fb[404];
  if (status === 401) return fb[401];
  if (status === 403) return fb[403];
  if (status === 429) return fb[429];
  if (status >= 500) return fb[500];
  return fallback || fb.default;
}
