// ReactHost.jsx
import { useEffect, useMemo, useRef } from "react";

// Dominios permitidos del remoto (Next)
const ALLOWED_ORIGINS = new Set([
  "https://www.iattend.site",
  "https://iattend.site",
  "http://localhost:3000",
]);


export default function ReactHost({
  config
}) {
  const iframeRef = useRef(null);
  const lastSentHashRef = useRef("");

  // URL del componente remoto: /shared/[invitation_label]/[invitation_name]
  const url = useMemo(() => {
    return new URL("https://www.iattend.site/host/").toString();
  }, []);

  // Origin destino calculado desde la URL (soporta prod/local)
  const targetOrigin = useMemo(() => new URL(url).origin, [url]);

  // Función segura para postMessage
  const postProps = (reason = "manual") => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    // hash simple para evitar re-envíos idénticos
    const hash = JSON.stringify(config);
    if (hash === lastSentHashRef.current && reason !== "ready") return;
    lastSentHashRef.current = hash;

    win.postMessage(
      {
        type: "HOST_PROPS",
        payload: {
          invitationConfig: config,
          sentAt: Date.now(),
          reason,
        },
      },
      targetOrigin
    );
  };

  // 1) Handshake: cuando el remoto avisa que está listo, manda la versión actual
  useEffect(() => {
    function onMessage(ev) {
      if (!ALLOWED_ORIGINS.has(ev.origin)) return;
      if (ev.data?.type === "REMOTE_READY") {
        postProps("ready");
      }
      // (Opcional) si implementas un ping en el remoto:
      if (ev.data?.type === "REMOTE_REQUEST_LATEST") {
        postProps("request-latest");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [targetOrigin, config]);

  // 2) Re-enviar cada que cambie `config`
  useEffect(() => {
    postProps("config-change");
  }, [config, targetOrigin]);

  // 3) (Opcional) al cargar/navegar el iframe, vuelve a enviar
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => postProps("iframe-load");
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [url, targetOrigin, config]);

  return (
    <iframe
      ref={iframeRef}
      src={url}
      title="I attend Remote Component"
      className="iframe_class"
      style={{ width: "100%", height: '100%'}}
      allow="clipboard-write; clipboard-read"
    />
  );
}