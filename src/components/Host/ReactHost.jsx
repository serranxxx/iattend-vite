// ReactHost.jsx
import { useEffect, useMemo, useRef } from "react";

// Remoto (Next): producción por defecto; en local, VITE_IATTEND_EVENTS_URL
// (http://localhost:3000 en .env.local) — igual que SideEventHost y
// SaveTheDateHost.
const EVENTS_URL = import.meta.env.VITE_IATTEND_EVENTS_URL || "https://www.iattend.events";

// Dominios permitidos del remoto (Next)
const ALLOWED_ORIGINS = new Set([
  "https://www.iattend.events",
  "https://iattend.events",
  "http://localhost:3000",
  new URL(EVENTS_URL).origin,
]);


export default function ReactHost({
  config, onHide, screens, scrollToSection, onSectionChange, textureOverride, fontOverride, activeLang,
  // Se llama una vez cuando el remoto avisa que ya cargó (REMOTE_READY). El
  // onboarding lo usa para quitar la portada de carga.
  onReady,
  // Modo edición (EditCanvas): la pieza marca cada módulo como zona tocable y
  // avisa cuál se eligió (REMOTE_SELECT_SECTION) y qué texto se escribió
  // encima (REMOTE_FIELD_CHANGE). Ver docs/entorno-edicion.md.
  editMode = false,
  selectedSection = null,
  // Editor de escritorio con barra de texto: la pieza no muestra sus "T".
  textBar = false,
  onSelectSection,
  onFieldChange,
  // La pieza pidió abrir la herramienta de una parte (tipografía del título)
  // y dice dónde está su botón, en px de la pieza.
  onFieldTool,
  // La pieza soltó la parte elegida de la portada sin elegir otra cosa.
  onClearField,
  // Se tocó cualquier parte de la pieza (para cerrar popovers del editor).
  onPiecePointerDown,
  // Sube cada vez que se toca el tablero fuera de la pieza: la pieza suelta
  // los bloques elegidos (título, fecha…).
  deselectSignal = 0,
  // { section, n }: lleva la pieza a esa sección aunque ya sea la actual
  // (p. ej. después de mover un módulo en la lista de orden). `n` cambia en
  // cada pedido para que se repita.
  scrollRequest = null,
}) {
  const iframeRef = useRef(null);
  const lastSentHashRef = useRef("");
  const lastSentSectionRef = useRef(null);
  const lastReceivedSectionRef = useRef(null);
  const onSectionChangeRef = useRef(onSectionChange);
  const isFirstScrollRef = useRef(true);

  const onReadyRef = useRef(onReady);
  const onSelectSectionRef = useRef(onSelectSection);
  const onFieldChangeRef = useRef(onFieldChange);
  const onFieldToolRef = useRef(onFieldTool);
  useEffect(() => { onFieldToolRef.current = onFieldTool; }, [onFieldTool]);
  const onClearFieldRef = useRef(onClearField);
  useEffect(() => { onClearFieldRef.current = onClearField; }, [onClearField]);
  const onPiecePointerDownRef = useRef(onPiecePointerDown);
  useEffect(() => { onPiecePointerDownRef.current = onPiecePointerDown; }, [onPiecePointerDown]);
  useEffect(() => { onSelectSectionRef.current = onSelectSection; }, [onSelectSection]);
  useEffect(() => { onFieldChangeRef.current = onFieldChange; }, [onFieldChange]);

  useEffect(() => {
    onSectionChangeRef.current = onSectionChange;
  }, [onSectionChange]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  // URL del componente remoto: /shared/[invitation_label]/[invitation_name]
  const url = useMemo(() => {
    return new URL("/host/", EVENTS_URL).toString();
  }, []);

  // Origin destino calculado desde la URL (soporta prod/local)
  const targetOrigin = useMemo(() => new URL(url).origin, [url]);

  // Función segura para postMessage
  const postProps = (reason = "manual") => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;

    // hash simple para evitar re-envíos idénticos
    const hash = JSON.stringify({ config, textureOverride, fontOverride, activeLang, editMode, selectedSection, textBar });
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
          editMode,
          selectedSection,
          textBar,
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
        onReadyRef.current?.();
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
      // Modo edición: el organizador tocó un módulo o escribió sobre la pieza.
      if (ev.data?.type === "REMOTE_SELECT_SECTION" && ev.data?.payload?.section) {
        // La zona ya está a la vista: no hay que pedirle al remoto que scrollee.
        lastReceivedSectionRef.current = ev.data.payload.section;
        onSelectSectionRef.current?.(ev.data.payload.section, ev.data.payload.field ?? null);
      }
      if (ev.data?.type === "REMOTE_POINTER_DOWN") {
        onPiecePointerDownRef.current?.();
      }
      if (ev.data?.type === "REMOTE_CLEAR_FIELD") {
        onClearFieldRef.current?.();
      }
      if (ev.data?.type === "REMOTE_FIELD_TOOL" && ev.data?.payload?.field) {
        onFieldToolRef.current?.(ev.data.payload.field, ev.data.payload.rect, ev.data.payload.section ?? 'cover');
      }
      // Texto con el foco ({ rect } en px de la pieza, o null): el editor sube
      // la pieza si el teclado de pantalla lo tapa (iPad).
      if (ev.data?.type === "REMOTE_TEXT_FOCUS") {
        window.dispatchEvent(new CustomEvent("iattend-text-focus", { detail: { rect: ev.data.payload?.rect ?? null, source: ev.source } }));
      }
      // Texto de un bloque elegido ({ path, kind } o null): barra de texto.
      if (ev.data?.type === "REMOTE_TEXT_FIELD") {
        window.dispatchEvent(new CustomEvent("iattend-text-field", { detail: ev.data.payload ?? null }));
      }
      // Elemento suelto elegido en la pieza ({ section, id } o null): el
      // editor de escritorio muestra su barra de propiedades (ElementBar).
      if (ev.data?.type === "REMOTE_LAYER_SELECT") {
        window.dispatchEvent(new CustomEvent("iattend-layer-selection", { detail: ev.data.payload ?? null }));
      }
      // ⌘C / ⌘X / ⌘V con el foco dentro de la pieza (useElementClipboard).
      if (ev.data?.type === "REMOTE_ELEMENT_KEY" && ev.data?.payload?.action) {
        window.dispatchEvent(new CustomEvent("iattend-element-key", { detail: { action: ev.data.payload.action } }));
      }
      // ⌘V con una imagen dentro de la pieza: el editor la sube como sticker.
      if (ev.data?.type === "REMOTE_PASTE_IMAGE" && ev.data?.payload?.file) {
        window.dispatchEvent(new CustomEvent("iattend-layer-paste", { detail: ev.data.payload }));
      }
      if (ev.data?.type === "REMOTE_FIELD_CHANGE" && ev.data?.payload?.path) {
        onFieldChangeRef.current?.(ev.data.payload.path, ev.data.payload.value ?? "");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [targetOrigin, config, textureOverride, fontOverride, activeLang, editMode, selectedSection]);

  // 2) Re-enviar cada que cambie `config`, `textureOverride` o el idioma activo
  useEffect(() => {
    postProps("config-change");
  }, [config, textureOverride, fontOverride, activeLang, editMode, selectedSection, textBar, targetOrigin]);

  // 2·) Elementos sueltos arrastrados desde los paneles del editor
  // (layerItems.js): el punto llega en px de la ventana y la pieza lo quiere
  // en px de su documento (el lienzo está escalado por el zoom).
  useEffect(() => {
    if (!editMode) return;
    const post = (type, payload) => iframeRef.current?.contentWindow?.postMessage({ type, payload }, targetOrigin);
    const toLocal = (p) => {
      const iframe = iframeRef.current;
      if (!iframe || !p) return null;
      const r = iframe.getBoundingClientRect();
      if (p.x < r.left || p.x > r.right || p.y < r.top || p.y > r.bottom) return null;
      const scale = r.width / (iframe.clientWidth || r.width);
      return { x: (p.x - r.left) / scale, y: (p.y - r.top) / scale };
    };
    let hovering = false;
    const onHover = (e) => {
      const local = toLocal(e.detail);
      if (local) { hovering = true; post("HOST_LAYER_HOVER", local); }
      else if (hovering) { hovering = false; post("HOST_LAYER_HOVER", null); }
    };
    const onDrop = (e) => {
      hovering = false;
      const local = toLocal(e.detail);
      if (local) post("HOST_LAYER_DROP", { ...local, item: e.detail.item });
      else post("HOST_LAYER_HOVER", null);
    };
    const onAdd = (e) => post("HOST_LAYER_ADD", e.detail);
    // Capas: elegir un elemento suelto desde el panel ({ section, id }).
    const onPick = (e) => post("HOST_LAYER_SELECT", e.detail);
    window.addEventListener("iattend-host-layer-select", onPick);
    window.addEventListener("iattend-layer-hover", onHover);
    window.addEventListener("iattend-layer-drop", onDrop);
    window.addEventListener("iattend-layer-add", onAdd);
    return () => {
      window.removeEventListener("iattend-layer-hover", onHover);
      window.removeEventListener("iattend-layer-drop", onDrop);
      window.removeEventListener("iattend-layer-add", onAdd);
      window.removeEventListener("iattend-host-layer-select", onPick);
    };
  }, [editMode, targetOrigin]);

  // 2a) Tocar fuera de la pieza: soltar lo elegido adentro.
  useEffect(() => {
    if (!editMode || !deselectSignal) return;
    iframeRef.current?.contentWindow?.postMessage({ type: "HOST_DESELECT" }, targetOrigin);
  }, [deselectSignal, editMode, targetOrigin]);

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

  useEffect(() => {
    if (!scrollRequest?.section) return;
    lastSentSectionRef.current = scrollRequest.section;
    postScrollTo(scrollRequest.section);
  }, [scrollRequest?.n]);

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