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

// Pops con varias fechas (ej. 14 y 15 de octubre, cada una con su
// hora): `body.dates` es la lista de horas de pared, ordenada, y `body.hour`
// siempre es la primera. Todo lo que lee una sola fecha (tope para confirmar,
// dashboard del planner, side events de bodas) sigue leyendo `body.hour`.
// Contraparte en iattend-events: `fechasDelEvento` en src/helpers/functions.ts.
export function fechasDelEvento(body) {
  const lista = Array.isArray(body?.dates) ? body.dates.filter(Boolean) : [];
  if (lista.length) return lista;
  return body?.hour ? [body.hour] : [];
}

// Renglones de fecha de un evento. Las fechas seguidas del mismo mes se
// juntan: con la misma hora en un renglón ("26 y 27 de noviembre, 18:00");
// con horas distintas, en dos ("26, 27 y 28 de noviembre" y abajo
// "jue 18:00 · vie 10:00 · sáb 08:00"). Una fecha sola de su mes va como
// siempre, con su día de la semana.
export function lineasDeFechas(body, opts = {}) {
  const fechas = fechasDelEvento(body);
  const partes = fechas.map((raw) => raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/));
  // Hora de fin de cada fecha ("21:00 – 01:00"), si la tiene.
  const fin = (raw) => {
    const h = isAbsoluteInstant(raw) ? null : horaFinDe(body, raw);
    return h ? ` – ${h}` : "";
  };
  if (fechas.length < 2 || fechas.some(isAbsoluteInstant) || partes.some((p) => !p)) {
    return fechas.map((raw) => { const t = formatEventDateTime(raw, opts); return t ? t + fin(raw) : ""; }).filter(Boolean);
  }

  // Se agrupan las fechas seguidas del mismo mes.
  const grupos = [];
  partes.forEach((p, i) => {
    const clave = `${p[1]}-${p[2]}`;
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.clave === clave) ultimo.items.push({ p, raw: fechas[i] });
    else grupos.push({ clave, items: [{ p, raw: fechas[i] }] });
  });

  return grupos.flatMap(({ items }) => {
    if (items.length === 1) return [formatWallClock(items[0].raw) + fin(items[0].raw)];
    const [, y, m] = items[0].p;
    const { month } = getWeekdayAndMonth(Number(y), Number(m), Number(items[0].p[3]));
    const dias = items.map(({ p }) => Number(p[3]));
    const lista = `${dias.slice(0, -1).join(", ")} y ${dias[dias.length - 1]} de ${month}`;
    const horas = items.map(({ p }) => `${p[4]}:${p[5]}`);
    // Misma hora: un renglón. Horas distintas: los días juntos y abajo cada
    // hora con su día de la semana ("jue 18:00 · vie 10:00 · sáb 08:00").
    const finales = items.map(({ raw }) => fin(raw));
    if (horas.every((h) => h === horas[0]) && finales.every((f) => f === finales[0])) return [`${lista}, ${horas[0]}${finales[0]}`];
    const semana = items.map(({ p }) => getWeekdayAndMonth(Number(p[1]), Number(p[2]), Number(p[3])).weekday.replace(".", ""));
    // Si un día de la semana se repite (el 20 y el 27 son viernes), va también
    // el número para saber cuál es cuál.
    const repetido = new Set(semana).size < semana.length;
    const conDia = items.map(({ p }, i) => `${semana[i]}${repetido ? ` ${Number(p[3])}` : ""} ${horas[i]}${finales[i].replace(" – ", "–")}`);
    return [lista, conDia.join(" · ")];
  });
}

// Mini itinerario de un Pop (`body.itinerary`: { id, name, time "HH:mm",
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
// `horasFin` (opcional, alineada con `lista`): la hora de fin "HH:mm" de cada
// fecha; se vuelve `ends` (ver `finDe`). Sin ella, `ends` no se toca.
export function cuerpoConFechas(lista, horasFin) {
  const pares = (lista ?? []).map((f, i) => [f, horasFin?.[i] ?? null]).filter(([f]) => f);
  const vistos = new Set();
  const unicos = pares.filter(([f]) => (vistos.has(f) ? false : vistos.add(f))).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const dates = unicos.map(([f]) => f);
  const cuerpo = { hour: dates[0] ?? null, dates: dates.length > 1 ? dates : null };
  if (horasFin) {
    const ends = {};
    unicos.forEach(([f, h]) => {
      const fin = finDesdeHora(f, h);
      if (fin) ends[String(f).slice(0, 10)] = fin;
    });
    cuerpo.ends = Object.keys(ends).length ? ends : null;
  }
  return cuerpo;
}

/* ── Hora de fin y eventos que cruzan la medianoche ──
   `body.ends = { "YYYY-MM-DD" (día de inicio): "YYYY-MM-DD HH:mm:00" }`: la
   hora de fin (opcional) de cada fecha del evento, en hora de pared como
   `hour` / `dates`. El organizador elige solo la hora: si es menor o igual
   que la de inicio, cae al día siguiente (21:00 → 01:00 del día siguiente).
   Contraparte en iattend-events: los mismos nombres en src/helpers/functions.ts. */

// "HH:mm" (o la hora de una hora de pared) → minutos del día; sin hora, null.
export function minutosDeHora(t) {
  const m = /(?:^|[ T])(\d{1,2}):(\d{2})/.exec(String(t ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const z2 = (n) => String(n).padStart(2, "0");
const sumarDia = (dia, n) => {
  const [y, m, d] = String(dia).slice(0, 10).split("-").map(Number);
  const f = new Date(Date.UTC(y, m - 1, d + n));
  return `${f.getUTCFullYear()}-${z2(f.getUTCMonth() + 1)}-${z2(f.getUTCDate())}`;
};

// Hora de fin completa a partir de la de inicio (hora de pared) y la hora
// "HH:mm" que eligió el organizador: el mismo día o, si no es mayor, el siguiente.
export function finDesdeHora(inicio, hhmm) {
  const ini = minutosDeHora(inicio);
  const fin = minutosDeHora(hhmm);
  const dia = /^\d{4}-\d{2}-\d{2}/.exec(String(inicio ?? ""))?.[0];
  if (fin == null || ini == null || !dia) return null;
  const hora = `${z2(Math.floor(fin / 60))}:${z2(fin % 60)}`;
  return `${fin > ini ? dia : sumarDia(dia, 1)} ${hora}:00`;
}

// Hora de fin (hora de pared) de la fecha que empieza ese día; sin día, la
// de la primera fecha.
export function finDe(body, dia) {
  const ends = body?.ends;
  if (!ends || typeof ends !== "object") return null;
  const clave = dia ? String(dia).slice(0, 10) : String(fechasDelEvento(body)[0] ?? "").slice(0, 10);
  return ends[clave] ?? null;
}

// "HH:mm" de la hora de fin de una fecha (raw = su hora de pared de inicio).
export function horaFinDe(body, raw) {
  const fin = finDe(body, String(raw ?? "").slice(0, 10));
  const m = /[ T](\d{2}:\d{2})/.exec(String(fin ?? ""));
  return m ? m[1] : null;
}

// Hora de inicio (hora de pared) del día `dia` del evento; sin ella, la primera.
export function inicioDe(body, dia) {
  const fechas = fechasDelEvento(body);
  return (dia && fechas.find((f) => String(f).slice(0, 10) === dia)) || fechas[0] || null;
}

// Minutos desde las 00:00 del día de inicio hasta el fin (1500 = 1:00 del día
// siguiente); sin hora de fin, null.
export function minutosDelFin(body, dia) {
  const fin = finDe(body, dia);
  const inicio = inicioDe(body, dia);
  const t = minutosDeHora(fin);
  if (t == null || !inicio) return null;
  const dias = Math.round((Date.parse(`${String(fin).slice(0, 10)}T00:00Z`) - Date.parse(`${String(inicio).slice(0, 10)}T00:00Z`)) / 86_400_000);
  return dias * 1440 + t;
}

// Minutos de un momento del itinerario contados desde las 00:00 de su día,
// con la medianoche resuelta: una hora menor que la de inicio del evento es
// del día siguiente (21:00 → 01:00 = 1500). Con hora de fin, solo cuenta como
// del día siguiente si cae antes de ese fin; sin ella, si es más de 2 h antes
// del inicio (para que "Llegada 20:30" de un evento a las 21:00 siga antes).
export function minutosDelMomento(body, dia, time) {
  const t = minutosDeHora(time);
  if (t == null) return null;
  const ini = minutosDeHora(inicioDe(body, dia));
  if (ini == null || t >= ini) return t;
  const fin = minutosDelFin(body, dia);
  if (fin != null) return fin >= 1440 && t + 1440 <= fin ? t + 1440 : t;
  return t < ini - 120 ? t + 1440 : t;
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
