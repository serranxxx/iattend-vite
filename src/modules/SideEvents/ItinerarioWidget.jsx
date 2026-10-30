import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getTimezoneForState, itinerarioPorDia } from "../../helpers/assets/eventDateTime";
import { IconoMomento } from "./IconoMomento";
import styles from "./ItinerarioWidget.module.css";

/*
  Itinerario de un Evento Flash (handoff "Itinerario del Evento Flash", opción
  6c: barra del día + lista). Funciona igual con 2 momentos (Llegada / Salida)
  que con 5 o más:
  · Barra del día: de la primera a la última hora, un punto por momento y el
    avance en vivo (con la hora de pared del lugar). Con un solo momento no
    hay barra.
  · Lista: orbe · título (+ detalle) · chip de hora, unidos por una línea
    (punteada con 2 momentos). Estados: pasado, ahora y siguiente.
  · Varios días: selector de días arriba; abre en el de hoy si cae en el
    evento.
  Los blancos son las variables del estilo de bloques (estilosBloque.js) con
  el vidrio de respaldo. Pieza del editor; contraparte de
  components/SideEvent/ItinerarioWidget.tsx en iattend-events (la página del
  invitado). Si cambias uno, cambia el otro.
*/

const CURVA = "cubic-bezier(0.22, 1, 0.36, 1)";

const partes = (dia) => {
  const [y, m, d] = dia.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  const dow = new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: "UTC" }).format(fecha).replace(".", "");
  return { d, dow: dow.charAt(0).toUpperCase() + dow.slice(1) };
};

// "YYYY-MM-DD HH:mm" de ahora en la zona del evento.
const ahoraEn = (timeZone) => {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
};

// "16:30" → 990 (minutos del día); sin hora, null.
const minutos = (t) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t ?? ""));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// 240 → "4 h", 270 → "4 h 30 min", 45 → "45 min".
const duracion = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
};

const recortar = (n) => Math.max(0, Math.min(100, n));

// El último momento cuenta como "ahora" esta hora después de empezar.
const DURACION_ULTIMO = 60;

export const ItinerarioWidget = ({ body, sinTitulo }) => {
  const grupos = useMemo(() => itinerarioPorDia(body), [body]);
  const dias = grupos.map((g) => g.dia ?? "");
  const zona = body?.timezone || getTimezoneForState(body?.address?.state);

  // La hora se lee en el navegador (no en el render del servidor, que no
  // coincidiría) y se refresca cada minuto.
  const [ahora, setAhora] = useState(null);
  useEffect(() => {
    setAhora(ahoraEn(zona));
    const t = setInterval(() => setAhora(ahoraEn(zona)), 60_000);
    return () => clearInterval(t);
  }, [zona]);

  const hoy = ahora?.slice(0, 10) ?? null;
  const ahoraMin = ahora ? minutos(ahora.slice(11)) : null;
  const [diaSel, setDiaSel] = useState(0);
  // Abre en el día de hoy si cae dentro del evento (hasta que elijan otro).
  const eligio = useRef(false);
  useEffect(() => {
    if (eligio.current || !hoy) return;
    const i = dias.indexOf(hoy);
    if (i > 0) setDiaSel(i);
  }, [hoy]);
  const sel = Math.min(diaSel, Math.max(0, grupos.length - 1));
  const grupo = grupos[sel];

  // Momentos del día elegido, en orden de hora (los que no tienen hora, al final).
  const momentos = useMemo(() => {
    const lista = [...(grupo?.momentos ?? [])];
    return lista.sort((a, b) => (minutos(a.time) ?? 24 * 60) - (minutos(b.time) ?? 24 * 60));
  }, [grupo]);

  // Dónde va el día: antes, durante (con la hora) o después.
  const dia = grupo?.dia ?? null;
  const momento =
    !dia || !hoy || hoy < dia ? "antes" : hoy > dia ? "despues" : "hoy";

  // Estados por hora de pared: "ahora" es el último que ya empezó (hasta que
  // empieza el siguiente; el último, una hora); antes de él, pasados.
  const estados = useMemo(() => {
    if (momento !== "hoy" || ahoraMin == null) return momentos.map(() => "siguiente");
    let actual = -1;
    momentos.forEach((m, i) => {
      const t = minutos(m.time);
      if (t != null && t <= ahoraMin) actual = i;
    });
    const ultimo = momentos.length - 1;
    const ultimoTerminado = actual === ultimo && (minutos(momentos[ultimo].time) ?? 0) + DURACION_ULTIMO <= ahoraMin;
    return momentos.map((_, i) => (i < actual || (ultimoTerminado && i === actual) ? "pasado" : i === actual ? "ahora" : "siguiente"));
  }, [momentos, momento, ahoraMin]);

  // Barra: de la primera a la última hora del día.
  const horas = momentos.map((m) => minutos(m.time)).filter((t) => t != null);
  const inicio = horas.length ? Math.min(...horas) : null;
  const fin = horas.length ? Math.max(...horas) : null;
  const conBarra = inicio != null && fin != null && fin > inicio && momentos.length > 1;
  const avance = !conBarra
    ? 0
    : momento === "despues" ? 100
    : momento === "antes" || ahoraMin == null ? 0
    : recortar(((ahoraMin - inicio) / (fin - inicio)) * 100);
  const empezo = (t) =>
    t != null && (momento === "despues" || (momento === "hoy" && ahoraMin != null && t <= ahoraMin));
  const dos = momentos.length <= 2;

  // Al cambiar de día: la lista anima su altura y las filas entran escalonadas
  // desde el lado hacia el que se avanza.
  const listaRef = useRef(null);
  const altoPrevio = useRef(null);
  const diaPrevio = useRef(sel);
  const elegir = (i) => {
    eligio.current = true;
    if (i === sel) return;
    altoPrevio.current = listaRef.current?.getBoundingClientRect().height ?? null;
    setDiaSel(i);
  };
  useLayoutEffect(() => {
    const el = listaRef.current;
    const antes = altoPrevio.current;
    const dir = sel > diaPrevio.current ? 1 : -1;
    diaPrevio.current = sel;
    altoPrevio.current = null;
    if (antes == null || !el || !el.animate) return;
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const despues = el.getBoundingClientRect().height;
    if (!reducir && Math.abs(despues - antes) > 1) {
      el.animate([{ height: `${antes}px` }, { height: `${despues}px` }], { duration: 420, easing: CURVA });
    }
    el.querySelectorAll("[data-fila]").forEach((fila, i) => {
      fila.animate(
        reducir
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: `translateX(${dir * 24}px)`, filter: "blur(3px)" },
              { opacity: 1, transform: "none", filter: "blur(0)" },
            ],
        { duration: 380, delay: reducir ? 0 : i * 35, easing: CURVA, fill: "backwards" }
      );
    });
  }, [sel]);

  if (!grupos.length) return null;

  return (
    <div className={styles.panel}>
      {!sinTitulo && <span className={styles.titulo}>Itinerario</span>}

      {/* Varios días: selector segmentado. */}
      {grupos.length > 1 && (
        <div className={styles.dias} role="tablist">
          {grupos.map((g, i) => {
            const p = partes(g.dia ?? "");
            return (
              <button
                type="button"
                role="tab"
                aria-selected={i === sel}
                key={g.dia}
                className={`${styles.dia} ${i === sel ? styles.diaActivo : ""}`}
                onClick={() => elegir(i)}
              >
                {p.dow} {p.d}
              </button>
            );
          })}
        </div>
      )}

      {/* Barra del día: de la primera a la última hora, con el avance en vivo. */}
      {conBarra && (
        <div className={styles.barra}>
          <div
            className={styles.pista}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(avance)}
            aria-label="Avance del evento"
          >
            <span className={styles.riel} />
            <span className={styles.avance} style={{ width: `${avance}%` }} />
            {momentos.map((m) => {
              const t = minutos(m.time);
              if (t == null) return null;
              return (
                <span
                  key={m.id}
                  className={`${styles.punto} ${empezo(t) ? styles.puntoLleno : ""}`}
                  style={{ left: `${((t - inicio) / (fin - inicio)) * 100}%` }}
                />
              );
            })}
          </div>
          <div className={styles.etiquetas}>
            <b>{momentos.find((m) => minutos(m.time) === inicio)?.time}</b>
            <span>{duracion(fin - inicio)}</span>
            <b>{momentos.find((m) => minutos(m.time) === fin)?.time}</b>
          </div>
        </div>
      )}

      <ol ref={listaRef} className={styles.lista}>
        {momentos.map((m, i) => {
          const estado = estados[i];
          const detalle = String(m.desc ?? m.place ?? "").trim();
          return (
            <li
              data-fila
              key={m.id}
              aria-current={estado === "ahora" ? "time" : undefined}
              className={`${styles.fila} ${estado === "pasado" ? styles.filaPasada : ""} ${estado === "ahora" ? styles.filaAhora : ""}`}
            >
              <div className={styles.nodo}>
                {i > 0 && <span className={`${styles.tramo} ${styles.tramoEntrada} ${dos ? styles.tramoPunteado : ""}`} />}
                <span className={styles.orbe}>
                  <IconoMomento icon={m.icon} size={19} />
                </span>
                {i < momentos.length - 1 && <span className={`${styles.tramo} ${styles.tramoSalida} ${dos ? styles.tramoPunteado : ""}`} />}
              </div>
              <div className={styles.texto} style={{ minHeight: dos ? 72 : 60 }}>
                <span className={styles.nombre}>{m.name}</span>
                {detalle && <span className={styles.detalle}>{detalle}</span>}
              </div>
              {m.time && <span className={styles.hora}>{m.time}</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
