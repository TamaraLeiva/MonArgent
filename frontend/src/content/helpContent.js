import { getLanguage } from '../utils/preferencesStore';

/**
 * Contextual help content. Language-aware via Proxy so existing HELP.x.title/body usage keeps working.
 */
const ES = {
  goals: {
    title: 'Objetivos de ahorro',
    body: [
      'Un objetivo es algo que querés juntar: un monto y, si querés, una fecha.',
      'Vas depositando a medida que ahorrás y ves el avance. Cuando llegás al 100%, el objetivo queda completado.',
      'Cada depósito se anota como un egreso en la categoría de ahorro y cuenta para el balance del mes.',
    ],
  },
  mood: {
    title: 'Salud financiera',
    body: [
      'El puntaje va de 0 a 100. Se arma con 4 partes de 25 puntos cada una (mirando el mes actual):',
      '• Ritmo de gasto: cuánto del ingreso ya gastaste según en qué punto del mes estás. Si a mitad de mes ya se fue el 70% y te queda 30%, va mal. Gastarte más de lo que entró suma cero: ¿con qué plata?',
      '• Gastos grupales: 25 puntos si no debés nada; baja si tenés deudas pendientes en liquidaciones (se toma en cuenta si el monto es bajo, menos de $15.000).',
      '• Objetivos: según cuánto avanzaste en tus objetivos activos (cerca del final = más puntos).',
      '• Límites de gasto: mejor si no te pasás de los tope del mes (o si no armaste ninguno).',
      'Carita: 0–39 ojo · 40–69 en camino · 70–100 bien. Si el mes cierra en rojo o te pasaste de 2 o más límites, no puede quedar en “bien”.',
    ],
  },
  groups: {
    title: 'Gastos grupales',
    body: [
      'Creá un grupo, cargá gastos y sumá gente (con app o invitados sin cuenta).',
      'Cuando todos los que tienen app confirman los movimientos, se arma la liquidación: quién debe y quién cobra según lo que cada uno gastó frente a la cuota pareja.',
      'Si le debés a alguien con app: transferí por Mercado Pago, subí el comprobante y esa persona confirma. También podés marcar efectivo.',
      'Si le debés a un invitado sin app: copiá el alias, pagale y marcá como pagado. No pide comprobante ni confirmación.',
      'Dejá tu alias en esta pantalla para que te puedan pagar.',
    ],
  },
  groupsSettlement: {
    title: 'Liquidación del grupo',
    body: [
      'La cuota por persona es el total del grupo dividido por la cantidad de integrantes.',
      'Si gastaste más que la cuota, te deben; si gastaste menos, debés la diferencia.',
      'Entre usuarios de la app, el cobrador confirma el pago. Si el cobrador no tiene cuenta, alcanza con marcar Pagar.',
    ],
  },
  scan: {
    title: 'Importar desde ticket',
    body: [
      'Sacá una foto o subí el ticket y la app te arma los ítems para revisar.',
      'Chequeá monto, categoría y fecha de cada uno. Si algo salió mal, corregilo antes de aceptar.',
      'Al tocar Aceptar se guardan como gastos o ingresos del mes. Por defecto la fecha es hoy, para que los veas en Movimientos del mes actual.',
    ],
  },
  limits: {
    title: 'Límites de gasto',
    body: [
      'Un límite es el tope de cuánto podés gastar en una categoría durante el mes.',
      'Cada vez que cargás un egreso de esa categoría, suma. Si te pasás, la app te avisa y eso también baja tu salud financiera.',
      'No es lo mismo que un objetivo: el límite frena un gasto; el objetivo junta plata para algo que querés.',
    ],
  },
  transactions: {
    title: 'Movimientos',
    body: [
      'Acá ves ingresos y gastos del período. Podés filtrar por mes, categoría y tipo.',
      'Cada movimiento muestra título, categoría, fecha y monto. Los ingresos van en verde y los gastos en rojo.',
    ],
  },
  calendar: {
    title: 'Avisos del calendario',
    body: [
      'La app te avisa unos días antes para que no se te pase.',
      'Gastos fijos: te llega un recordatorio 5 días antes y otro 3 días antes.',
      'Eventos: también a los 5 y a los 3 días, y además unas 12 horas antes de la hora que cargaste.',
    ],
  },
};

const EN = {
  goals: {
    title: 'Savings goals',
    body: [
      'A goal is something you want to save for: an amount and, optionally, a date.',
      'You deposit as you save and track progress. When you reach 100%, the goal is completed.',
      'Each deposit is recorded as an expense in the savings category and counts toward the month balance.',
    ],
  },
  mood: {
    title: 'Financial health',
    body: [
      'The score goes from 0 to 100. It is made of 4 parts worth 25 points each (looking at the current month):',
      '• Spending pace: how much of your income you already spent based on where you are in the month. If by mid-month 70% is gone and you have 30% left, that is bad. Spending more than you earned scores zero: what money is left?',
      '• Group expenses: 25 points if you owe nothing; it drops if you have pending settlement debts (small amounts under $15,000 are considered).',
      '• Goals: based on how much you progressed on active goals (closer to the end = more points).',
      '• Spending limits: better if you stay under monthly caps (or if you set none).',
      'Face: 0–39 watch out · 40–69 on track · 70–100 good. If the month closes in the red or you exceeded 2+ limits, it cannot stay “good”.',
    ],
  },
  groups: {
    title: 'Group expenses',
    body: [
      'Create a group, add expenses and invite people (with app or guests without account).',
      'When everyone with the app confirms movements, settlement is calculated: who owes and who collects based on what each person spent versus an equal share.',
      'If you owe someone with the app: transfer via Mercado Pago, upload proof and that person confirms. You can also mark cash.',
      'If you owe a guest without app: copy the alias, pay them and mark as paid. No proof or confirmation required.',
      'Set your alias on this screen so others can pay you.',
    ],
  },
  groupsSettlement: {
    title: 'Group settlement',
    body: [
      'The share per person is the group total divided by number of members.',
      'If you spent more than the share, they owe you; if you spent less, you owe the difference.',
      'Between app users, the collector confirms payment. If the collector has no account, marking as paid is enough.',
    ],
  },
  scan: {
    title: 'Import from receipt',
    body: [
      'Take a photo or upload the receipt and the app builds items for you to review.',
      'Check amount, category and date for each one. If something is wrong, fix it before accepting.',
      'When you tap Accept, they are saved as expenses or income for the month. By default date is today so you see them in current month transactions.',
    ],
  },
  limits: {
    title: 'Spending limits',
    body: [
      'A limit is how much you can spend in a category during the month.',
      'Every time you add an expense in that category, it adds up. If you go over, the app alerts you and it also lowers your financial health.',
      'It is not the same as a goal: a limit controls spending; a goal saves money for something you want.',
    ],
  },
  transactions: {
    title: 'Transactions',
    body: [
      'Here you see income and expenses for the period. You can filter by month, category and type.',
      'Each transaction shows title, category, date and amount. Income is green and expenses are red.',
    ],
  },
  calendar: {
    title: 'Calendar alerts',
    body: [
      'The app notifies you a few days before so you don\'t miss anything.',
      'Fixed expenses: you get a reminder 5 days before and another 3 days before.',
      'Events: also at 5 and 3 days, and about 12 hours before the time you set.',
    ],
  },
};

export function getHelp(lang = getLanguage()) {
  return lang === 'en' ? EN : ES;
}

export const HELP = new Proxy({}, {
  get(_, key) {
    return getHelp(getLanguage())[key];
  },
});
