// Helpers para la hora de eventos (side events / pop events) que NO dependen
// de la zona horaria del navegador de quien los use. Ver iattend-events
// (src/helpers/functions.ts) para la contraparte que lee estos mismos datos.
//
// Formato guardado en Supabase (body.hour / information.date):
//  - Nuevo:  "YYYY-MM-DD HH:mm:00" — hora de pared del venue, tal cual la
//            escribió el organizador. Nunca se convierte, ni al guardar ni
//            al mostrar: por eso no hay bug de timezone posible.
//  - Legado: instante UTC real ("...Z" o con offset), de antes de este
//            cambio. Hay que reconvertirlo con la zona horaria del venue.

// Estados cuyo huso horario real difiere del de Ciudad de México.
const STATE_TIMEZONES = {
  "baja california": "America/Tijuana",
  "baja california sur": "America/Mazatlan",
  "sonora": "America/Hermosillo",
  "sinaloa": "America/Mazatlan",
  "quintana roo": "America/Cancun",
};

function normalizeStateKey(state) {
  return state
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function getTimezoneForState(state) {
  if (!state) return "America/Mexico_City";
  return STATE_TIMEZONES[normalizeStateKey(state)] ?? "America/Mexico_City";
}

function isAbsoluteInstant(raw) {
  return /[Zz]$|[+-]\d{2}:?\d{2}$/.test(raw.trim());
}

function getWeekdayAndMonth(y, m, d) {
  const anchor = new Date(Date.UTC(y, m - 1, d));
  return {
    weekday: new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: "UTC" }).format(anchor),
    month: new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(anchor),
  };
}

function formatAbsoluteInstant(raw, timeZone) {
  const normalized = raw.trim().replace(" ", "T");
  const date = new Date(/[Zz]$|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
  if (isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).formatToParts(date);

  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");

  return `${get("weekday")}. ${get("day")} de ${get("month")}, ${hour}:${get("minute")}`;
}

function formatWallClock(raw) {
  const match = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return "";

  const [, yStr, mStr, dStr, hh, mm] = match;
  const { weekday, month } = getWeekdayAndMonth(Number(yStr), Number(mStr), Number(dStr));

  return `${weekday}. ${Number(dStr)} de ${month}, ${hh}:${mm}`;
}

// Formatea fecha + hora de un side/pop event para el preview del organizador.
// Soporta ambos formatos (ver comentario de arriba) mientras se migran los
// eventos ya guardados.
export function formatEventDateTime(raw, opts = {}) {
  if (!raw) return "";

  if (isAbsoluteInstant(raw)) {
    return formatAbsoluteInstant(raw, opts.timezone || getTimezoneForState(opts.state));
  }

  return formatWallClock(raw);
}

// Convierte el objeto dayjs que entrega el AntD DatePicker a la hora de
// pared que el organizador seleccionó, como string plano — sin ninguna
// conversión de timezone. Los números que ves en el picker son los números
// que se guardan, punto.
export function dayjsToWallClock(value) {
  if (!value) return null;
  return value.format("YYYY-MM-DD HH:mm:00");
}

// Fecha "absoluta" en español (día en UTC, sin conversión de timezone) — para
// el {{3}} del template `reminder` de WhatsApp y las barras de fecha límite.
// Contraparte en inglés: formatAbsoluteDate, inline en GuestsPage (envío inicial).
export function formatAbsoluteDateEs(isoString) {
  const d = new Date(isoString);
  const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  return `${d.getUTCDate()} de ${months[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
}
