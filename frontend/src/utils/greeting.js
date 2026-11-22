import { getLanguage } from './preferencesStore';

export function getTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  const en = getLanguage() === 'en';
  if (hour >= 5 && hour < 12) return en ? 'Good morning' : 'Buenos días';
  if (hour >= 12 && hour < 20) return en ? 'Good afternoon' : 'Buenas tardes';
  return en ? 'Good evening' : 'Buenas noches';
}

