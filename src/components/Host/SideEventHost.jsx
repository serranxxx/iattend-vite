// SideEventHost.jsx — preview remoto del side event (Next, /side-event-host)
import { useEffect, useMemo, useRef } from "react";

const EVENTS_URL = import.meta.env.VITE_IATTEND_EVENTS_URL || "https://www.iattend.events";

// Dominios permitidos del remoto (Next). Se aceptan las dos variantes del
// dominio configurado porque `iattend.events` y `www.iattend.events` se
// redirigen entre sí según la ruta, y postMessage descarta el mensaje sin
// avisar cuando el origen no coincide exacto.
const originVariants = (url) => {
  try {
    const { protocol, host } = new URL(url);
    const bare = host.replace(/^www\./, "");
    return [`${protocol}//${bare}`, `${protocol}//www.${bare}`];
  } catch {
    return [];
  }
};

const ALLOWED_ORIGINS = new Set([
  ...originVariants(EVENTS_URL),
  "https://www.iattend.events",
  "https://iattend.events",
  "http://localhost:3000",
  "http://localhost:3001",
]);

export default function SideEventHost({
  config
}) {
  const iframeRef = useRef(null);
  const lastSentHashRef = useRef("");

  // URL del componente remoto
  const url = useMemo(() => {
    return new URL("/side-event-host", EVENTS_URL).toString();
  }, []);

  // Origen destino: arranca con el configurado y se corrige en cuanto el
  // remoto habla (es él quien sabe con qué origen está sirviendo)
  const targetOriginRef = useRef(new URL(url).origin);

  // Función segura para postMessage
  const postProps = (reason = "manual") => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    // Mientras el iframe sigue en su `about:blank` inicial es same-origin, y
    // mandarle los props solo deja un warning en consola: todavía no hay a
    // quién avisarle. En cuanto el remoto carga, leer su origin lanza y ahí
    // sí se envía.
    let blank = false;
    try {
      blank = win.location.origin === window.location.origin;
    } catch { /* cross-origin: el remoto ya cargó */ }
    if (blank) return;

    // hash simple para evitar re-envíos idénticos; el handshake y la carga
    // del iframe se mandan siempre (el envío al about:blank no cuenta).
    const hash = JSON.stringify(config);
    const forced = reason === "ready" || reason === "iframe-load";
    if (hash === lastSentHashRef.current && !forced) return;
    lastSentHashRef.current = hash;

    win.postMessage(
      {
        type: "HOST_PROPS",
        payload: {
          // OJO: el typo `sideEventCondif` es el contrato con
          // iattend-events/src/app/side-event-host/page.tsx — no renombrar
          // aquí sin cambiarlo allá.
          sideEventCondif: config,
          sentAt: Date.now(),
          reason,
        },
      },
      targetOriginRef.current
    );
  };

  // 1) Handshake: cuando el remoto avisa que está listo, manda la versión actual
  useEffect(() => {
    function onMessage(ev) {
      if (!ALLOWED_ORIGINS.has(ev.origin)) return;
      // El origen con el que de verdad responde el iframe
      targetOriginRef.current = ev.origin;
      if (ev.data?.type === "REMOTE_READY") {
        postProps("ready");
      }
      if (ev.data?.type === "REMOTE_REQUEST_LATEST") {
        postProps("request-latest");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [config]);

  // 2) Re-enviar cada que cambie `config`
  useEffect(() => {
    postProps("config-change");
  }, [config]);

  // 3) Al cargar el iframe, vuelve a enviar. El primer `load` es el
  // about:blank (postProps lo ignora) y el segundo es el remoto ya cargado.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => {
      lastSentHashRef.current = "";
      postProps("iframe-load");
    };
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [url, config]);

  return (
    <iframe
      ref={iframeRef}
      src={url}
      title="I attend Side Event Preview"
      className="iframe_class"
      style={{ width: "100%", height: '100%' }}
      allow="clipboard-write; clipboard-read"
    />
  );
}
