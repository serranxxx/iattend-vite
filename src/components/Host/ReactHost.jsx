// ReactHost.jsx
import { useEffect, useMemo, useRef } from "react";

// Dominios permitidos del remoto (Next)
const ALLOWED_ORIGINS = new Set([
  "https://www.iattend.events",
  "https://iattend.events",
  "http://localhost:3000",
]);


export default function ReactHost({
  config, onHide, screens, scrollToSection, onSectionChange, textureOverride, fontOverride, activeLang
}) {
  const iframeRef = useRef(null);
  const lastSentHashRef = useRef("");
  const lastSentSectionRef = useRef(null);
  const lastReceivedSectionRef = useRef(null);
  const onSectionChangeRef = useRef(onSectionChange);
  const isFirstScrollRef = useRef(true);

  useEffect(() => {
    onSectionChangeRef.current = onSectionChange;
  }, [onSectionChange]);

  // URL del componente remoto: /shared/[invitation_label]/[invitation_name]
  const url = useMemo(() => {
    return new URL("https://www.iattend.events/host/").toString();
  }, []);

  // Origin destino calculado desde la URL (soporta prod/local)
  const targetOrigin = useMemo(() => new URL(url).origin, [url]);

  // Función segura para postMessage
  const postProps = (reason = "manual") => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    // hash simple para evitar re-envíos idénticos
    const hash = JSON.stringify({ config, textureOverride, fontOverride, activeLang });
    if (hash === lastSentHashRef.current && reason !== "ready") return;
    lastSentHashRef.current = hash;

    win.postMessage(
      {
        type: "HOST_PROPS",
        payload: {
          invitationConfig: config,
          textureOverride: textureOverride ?? null,
          fontOverride: fontOverride ?? null,
          lang: activeLang ?? null,
          sentAt: Date.now(),
          reason,
        },
      },
      targetOrigin
    );
  };

  // Función segura para pedir auto-scroll a una sección
  const postScrollTo = (section) => {
    const win = iframeRef.current?.contentWindow;
    if (!win || !section) return;

    win.postMessage(
      { type: "HOST_SCROLL_TO", payload: { section } },
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
      // El invitado scrolleó dentro del iframe: avisar al builder qué sección quedó activa
      if (ev.data?.type === "REMOTE_SCROLL_SECTION" && ev.data?.payload?.section) {
        lastReceivedSectionRef.current = ev.data.payload.section;
        onSectionChangeRef.current?.(ev.data.payload.section);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [targetOrigin, config, textureOverride, fontOverride, activeLang]);

  // 2) Re-enviar cada que cambie `config`, `textureOverride` o el idioma activo
  useEffect(() => {
    postProps("config-change");
  }, [config, textureOverride, fontOverride, activeLang, targetOrigin]);

  // 2b) Pedir auto-scroll cada que cambie la sección activa en el builder.
  // El primer mount no debe reenviar la sección inicial ("cover"): el remoto ya abre
  // ahí, y ese scrollIntoView redundante es lo que traba el primer swipe del usuario.
  useEffect(() => {
    if (isFirstScrollRef.current) {
      isFirstScrollRef.current = false;
      lastSentSectionRef.current = scrollToSection;
      return;
    }

    if (!scrollToSection || scrollToSection === lastSentSectionRef.current) return;

    // Si este valor llegó como eco del propio scroll del invitado, no hay que reenviarlo
    if (scrollToSection === lastReceivedSectionRef.current) {
      lastSentSectionRef.current = scrollToSection;
      lastReceivedSectionRef.current = null;
      return;
    }

    lastSentSectionRef.current = scrollToSection;
    postScrollTo(scrollToSection);
  }, [scrollToSection, targetOrigin]);

  // 3) (Opcional) al cargar/navegar el iframe, vuelve a enviar
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const onLoad = () => postProps("iframe-load");
    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [url, targetOrigin, config, textureOverride, fontOverride, activeLang]);

  return (
    <iframe
      ref={iframeRef}
      src={url}
      title="I attend Remote Component"
      className="iframe_class"
      style={{ width: "100%", minHeight:'620px', height: '100%', pointerEvents: screens ? onHide ? 'auto' : 'none' : 'auto', border:'none'}}
      allow="clipboard-write; clipboard-read"
    />
  );
}