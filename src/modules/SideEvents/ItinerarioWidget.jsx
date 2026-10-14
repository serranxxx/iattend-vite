import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getTimezoneForState, itinerarioPorDia } from "../../helpers/assets/eventDateTime";
import { IconoMomento } from "./IconoMomento";
import styles from "./ItinerarioWidget.module.css";

/*
  Widget de itinerario de un Evento Flash (handoff design_handoff_itinerario_widget).
  Línea de tiempo por día: pestañas si el evento tiene varios días con
  actividades (pill que se desliza, altura y filas animadas al cambiar), y
  "En curso" / "Siguiente" durante los días del evento con la hora del lugar.
  Vista previa del editor; contraparte de components/SideEvent/ItinerarioWidget.tsx
  en iattend-events (la página del invitado).
*/

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const CURVA = "cubic-bezier(0.22, 1, 0.36, 1)";

const partes = (dia) => {
  const [y, m, d] = dia.split("-").map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  const dow = new Intl.DateTimeFormat("es-MX", { weekday: "short", timeZone: "UTC" }).format(fecha).replace(".", "");
  return { y, m, d, dow };
};

// "26 – 28 nov", "30 nov – 1 dic" o "26 nov".
const rango = (dias) => {
  if (!dias.length) return "";
  const a = partes(dias[0]);
  const b = partes(dias[dias.length - 1]);
  if (dias.length === 1) return `${a.d} ${MESES[a.m - 1]}`;
  return a.m === b.m ? `${a.d} – ${b.d} ${MESES[b.m - 1]}` : `${a.d} ${MESES[a.m - 1]} – ${b.d} ${MESES[b.m - 1]}`;
};

const actividades = (n) => `${n} ${n === 1 ? "actividad" : "actividades"}`;

// "YYYY-MM-DD HH:mm" de ahora en la zona del evento.
const ahoraEn = (timeZone) => {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t)?.value ?? "";
  return `${g("year")}-${g("month")}-${g("day")} ${g("hour")}:${g("minute")}`;
};

export const ItinerarioWidget = ({ body }) => {
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
  const [diaSel, setDiaSel] = useState(0);
  // Abre en el día de hoy si cae dentro del evento (hasta que elijan otro).
  const eligio = useRef(false);
  useEffect(() => {
    if (eligio.current || !hoy) return;
    const i = dias.indexOf(hoy);
    if (i > 0) setDiaSel(i);
  }, [hoy]);
  const sel = Math.min(diaSel, Math.max(0, grupos.length - 1));
  const conPestanas = grupos.length > 1;

  // En curso: la última actividad que ya empezó; siguiente: la primera que no.
  // Solo durante los días del evento (antes o después no hay progreso).
  const progreso = useMemo(() => {
    if (!ahora || !hoy || !dias.includes(hoy)) return null;
    const todas = grupos.flatMap((g) => g.momentos.map((m) => ({ id: m.id, cuando: `${g.dia} ${m.time ?? "00:00"}` })));
    let actual = null;
    let siguiente = null;
    for (const x of todas) {
      if (x.cuando <= ahora) actual = x.id;
      else if (!siguiente) siguiente = x.id;
    }
    const pasadas = new Set(todas.filter((x) => x.cuando <= ahora && x.id !== actual).map((x) => x.id));
    return { actual, siguiente, pasadas };
  }, [grupos, dias, hoy, ahora]);

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
  const total = grupos.reduce((n, g) => n + g.momentos.length, 0);
  const visibles = conPestanas ? [grupos[sel]] : grupos;
  const n = grupos.length;

  return (
    <div className={styles.panel}>
      <div className={styles.cabecera}>
        <span className={styles.titulo}>Itinerario</span>
        <span className={styles.resumen}>{rango(dias)} · {actividades(total)}</span>
      </div>

      {conPestanas && (
        <div className={styles.pestanas} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
          <span
            className={styles.pill}
            style={{
              width: `calc((100% - 8px - ${(n - 1) * 6}px) / ${n})`,
              transform: `translateX(calc(${sel * 100}% + ${sel * 6}px))`,
            }}
          />
          {grupos.map((g, i) => {
            const p = partes(g.dia ?? "");
            return (
              <button
                type="button"
                key={g.dia}
                className={`${styles.pestana} ${i === sel ? styles.pestanaActiva : ""}`}
                onClick={() => elegir(i)}
              >
                <span className={styles.pestanaDow}>{p.dow}</span>
                <span className={styles.pestanaNum}>{p.d}</span>
                <span className={styles.pestanaConteo}>{actividades(g.momentos.length)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div ref={listaRef} className={styles.lista}>
        {visibles.map((g) => (
          <div className={styles.dia} key={g.dia ?? "unico"}>
            {g.momentos.map((m, i) => {
              const enCurso = progreso?.actual === m.id;
              const siguiente = progreso?.siguiente === m.id;
              const pasada = progreso?.pasadas.has(m.id);
              return (
                <div
                  data-fila
                  key={m.id}
                  className={`${styles.fila} ${enCurso ? styles.filaEnCurso : ""} ${pasada ? styles.filaPasada : ""}`}
                >
                  <div className={styles.hora}>{m.time ?? ""}</div>
                  <div className={styles.nodo}>
                    <span className={styles.linea} style={{ height: 8, flex: "none", visibility: i === 0 ? "hidden" : undefined }} />
                    <span className={styles.circulo}>
                      <IconoMomento icon={m.icon} size={18} />
                    </span>
                    <span className={styles.linea} style={{ visibility: i === g.momentos.length - 1 ? "hidden" : undefined }} />
                  </div>
                  <div className={styles.contenido}>
                    <div className={styles.tituloFila}>
                      <span className={styles.nombre}>{m.name}</span>
                      {(enCurso || siguiente) && <span className={styles.badge}>{enCurso ? "En curso" : "Siguiente"}</span>}
                    </div>
                    {m.place && <div className={styles.lugar}>{m.place}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
