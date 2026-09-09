// SaveTheDateHost.jsx — mismo patrón que SideEventHost, apuntando a /save-the-date-host
import { useEffect, useMemo, useRef } from "react";

const EVENTS_URL = import.meta.env.VITE_IATTEND_EVENTS_URL || "https://www.iattend.events";
// const EVENTS_URL = "http://localhost:3000";


// Dominios permitidos del remoto (Next)
const ALLOWED_ORIGINS = new Set([
    "https://www.iattend.events",
    "https://iattend.events",
    "http://localhost:3000",
    new URL(EVENTS_URL).origin,
]);

export default function SaveTheDateHost({
    config
}) {
    const iframeRef = useRef(null);
    const lastSentHashRef = useRef("");
    // El remoto acusa recibo con REMOTE_HEIGHT: mientras no llegue, se
    // reintenta el envío (el handshake se puede perder si el remoto todavía
    // está hidratando y el preview se queda en blanco).
    const ackRef = useRef(false);

    const url = useMemo(() => {
        return new URL("/save-the-date-host", EVENTS_URL).toString();
    }, []);

    // Origin destino calculado desde la URL (soporta prod/local)
    const targetOrigin = useMemo(() => new URL(url).origin, [url]);

    // Función segura para postMessage
    const postProps = (reason = "manual") => {
        const win = iframeRef.current?.contentWindow;
        if (!win) return;

        // hash simple para evitar re-envíos idénticos; el handshake y sus
        // reintentos siempre se mandan (el remoto puede montar después del
        // load y perderse el primer envío, dejando el preview en blanco).
        const hash = JSON.stringify(config);
        const forced = reason === "ready" || reason === "retry";
        if (hash === lastSentHashRef.current && !forced) return;
        lastSentHashRef.current = hash;

        win.postMessage(
            {
                type: "HOST_PROPS",
                payload: {
                    saveTheDateConfig: config,
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
            if (ev.data?.type === "REMOTE_REQUEST_LATEST") {
                postProps("request-latest");
            }
            if (ev.data?.type === "REMOTE_HEIGHT") {
                ackRef.current = true;
            }
        }
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [targetOrigin, config]);

    // 2) Re-enviar cada que cambie `config`
    useEffect(() => {
        postProps("config-change");
    }, [config, targetOrigin]);

    // 3) Al cargar/navegar el iframe, vuelve a enviar
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        // El primer `load` es el about:blank del iframe y el remoto tarda en
        // hidratar, así que se reintenta en intervalo hasta que acuse recibo.
        let ticker;
        const onLoad = () => {
            ackRef.current = false;
            postProps("iframe-load");
            clearInterval(ticker);
            let tries = 0;
            ticker = setInterval(() => {
                if (ackRef.current || ++tries > 20) return clearInterval(ticker);
                postProps("retry");
            }, 700);
        };
        iframe.addEventListener("load", onLoad);
        return () => {
            iframe.removeEventListener("load", onLoad);
            clearInterval(ticker);
        };
    }, [url, targetOrigin, config]);

    return (
        <iframe
            ref={iframeRef}
            src={url}
            title="I attend Save the Date Preview"
            className="iframe_class"
            style={{ width: "100%", height: "100%" }}
            allow="clipboard-write; clipboard-read"
        />
    );
}
