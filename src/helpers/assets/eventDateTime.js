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

// Eventos Flash con varias fechas (ej. 14 y 15 de octubre, cada una con su
// hora): `body.dates` es la lista de horas de pared, ordenada, y `body.hour`
// siempre es la primera. Todo lo que lee una sola fecha (tope para confirmar,
// dashboard del planner, side events de bodas) sigue leyendo `body.hour`.
// Contraparte en iattend-events: `fechasDelEvento` en src/helpers/functions.ts.
export function fechasDelEvento(body) {
  const lista = Array.isArray(body?.dates) ? body.dates.filter(Boolean) : [];
  if (lista.length) return lista;
  return body?.hour ? [body.hour] : [];
}

// Renglones de fecha de un evento: si varias fechas comparten mes y hora, se
// juntan en uno ("26 y 27 de noviembre, 18:00"; con tres, "14, 15 y 16 de
// …"). Si cambian el mes o la hora, cada una va en su renglón con su día de la
// semana, como una sola fecha.
export function lineasDeFechas(body, opts = {}) {
  const fechas = fechasDelEvento(body);
  const partes = fechas.map((raw) => raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/));
  if (fechas.length < 2 || fechas.some(isAbsoluteInstant) || partes.some((p) => !p)) {
    return fechas.map((raw) => formatEventDateTime(raw, opts)).filter(Boolean);
  }

  const grupos = [];
  partes.forEach((p, i) => {
    const clave = `${p[1]}-${p[2]} ${p[4]}:${p[5]}`;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.clave === clave) ultimo.items.push({ p, raw: fechas[i] });
    else grupos.push({ clave, items: [{ p, raw: fechas[i] }] });
  });

  return grupos.map(({ items }) => {
    if (items.length === 1) return formatWallClock(items[0].raw);
    const [, y, m, , hh, mm] = items[0].p;
    const { month } = getWeekdayAndMonth(Number(y), Number(m), Number(items[0].p[3]));
    const dias = items.map(({ p }) => Number(p[3]));
    const lista = `${dias.slice(0, -1).join(", ")} y ${dias[dias.length - 1]}`;
    return `${lista} de ${month}, ${hh}:${mm}`;
  });
}

// Mini itinerario de un Flash (`body.itinerary`: { id, name, time "HH:mm",
// icon, date "YYYY-MM-DD" si hay varias fechas }), en el orden en que el
// organizador lo acomodó (drag and drop en el editor).
// Con varias fechas se agrupa por día, cada grupo con su título ("jue. 26 de
// noviembre"); con una sola fecha va un solo grupo sin título (con su día). Los momentos
// sin nombre no se muestran. Contraparte: `itinerarioPorDia` en iattend-events.
export function itinerarioPorDia(body) {
  const momentos = (Array.isArray(body?.itinerary) ? body.itinerary : []).filter((m) => String(m?.name ?? "").trim());
  if (!momentos.length) return [];
  const dias = [...new Set(fechasDelEvento(body).map((f) => String(f).slice(0, 10)))];
  if (dias.length < 2) return [{ dia: dias[0] ?? null, titulo: null, momentos }];

  return dias
    .map((dia) => {
      const [y, m, d] = dia.split("-").map(Number);
      const { weekday, month } = getWeekdayAndMonth(y, m, d);
      return {
        dia,
        titulo: `${weekday}. ${d} de ${month}`,
        // Un momento sin día (o de un día que ya no está) va en el primero.
        momentos: momentos.filter((x) => (dias.includes(x.date) ? x.date : dias[0]) === dia),
      };
    })
    .filter((g) => g.momentos.length);
}

// Lo que se guarda en `body` a partir de una lista de fechas: ordenadas, sin
// repetir, `hour` = la primera y `dates` solo si hay más de una.
export function cuerpoConFechas(lista) {
  const dates = [...new Set((lista ?? []).filter(Boolean))].sort();
  return { hour: dates[0] ?? null, dates: dates.length > 1 ? dates : null };
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
