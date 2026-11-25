import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { AnimacionNuevoPopVista, ToastNuevoPop } from './AnimacionNuevoPopVista'
import { FIN_MS, P, TOAST_MS } from './nuevoPopTiempos'

/*
  Animación al crear un Pop (handoff "Animaciones de Nuevo Pop", fiesta de
  stickers): velo, 5 stickers al centro y 16 dispersos que aparecen y flotan;
  en P (1.4 s) salen disparados con un anillo y 72 piezas de confeti, y el
  editor se abre con un círculo desde el centro (View Transitions; sin
  soporte, cambia directo) mientras el confeti sigue cayendo encima. El aviso
  sale 0.4 s después y la capa se desmonta 1.8 s después del pop.

  La petición que crea el Pop sale al empezar (`esperar`): si tarda más que
  P, los stickers se quedan flotando hasta que llega y entonces hace pop. Si
  falla, la capa se va sin abrir nada (el que llama enseña el error).

  Vive en su propia raíz de React montada en <body>, fuera del router, para
  que siga viva al cambiar de ruta. Con "reducir movimiento" no se anima:
  espera la respuesta, abre el editor y enseña el aviso.

  lanzarAnimacionNuevoPop({ esperar, alAbrir, toast })
  · esperar: promesa (opcional) con los datos del Pop creado.
  · alAbrir(datos): navega al editor (se llama dentro de la transición).
  · toast: { icono, fondoIcono, titulo, texto } o una función (datos) → eso.
*/

// Abre el editor con el círculo desde el centro (View Transitions).
const abrirConCirculo = (alAbrir) => {
    if (!document.startViewTransition) { alAbrir(); return }
    const html = document.documentElement
    html.setAttribute('data-nuevo-pop-vt', '')
    const vt = document.startViewTransition(() => flushSync(alAbrir))
    vt.finished.finally(() => html.removeAttribute('data-nuevo-pop-vt'))
}

// Raíz propia en <body> (sobrevive al cambio de ruta).
const montar = (nodo) => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const raiz = createRoot(host)
    raiz.render(nodo)
    return {
        pintar: (n) => raiz.render(n),
        quitar: () => { raiz.unmount(); host.remove() },
    }
}

/**
 * Aviso abajo al centro, ~4.5 s (o hasta su ✕). `retraso` en ms.
 * { icono, fondoIcono, titulo, texto }
 */
export const mostrarToastNuevoPop = (datos, { retraso = 0, duracion = 4500 } = {}) => {
    setTimeout(() => {
        let raiz = null
        const cerrar = () => { if (raiz) { raiz.quitar(); raiz = null } }
        raiz = montar(<ToastNuevoPop {...datos} onCerrar={cerrar} />)
        setTimeout(cerrar, duracion)
    }, retraso)
}

const esperaMinima = (ms) => new Promise((ok) => setTimeout(ok, ms))

export const lanzarAnimacionNuevoPop = ({ esperar = null, alAbrir, toast = null }) => {
    const respuesta = Promise.resolve(esperar)
    const avisar = (datos, retraso) => {
        const aviso = typeof toast === 'function' ? toast(datos) : toast
        if (aviso) mostrarToastNuevoPop(aviso, { retraso })
    }

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        respuesta.then((datos) => { alAbrir(datos); avisar(datos, 0) }).catch(() => {})
        return
    }

    const capa = montar(<AnimacionNuevoPopVista />)
    Promise.all([respuesta, esperaMinima(P * 1000)])
        .then(([datos]) => {
            capa.pintar(<AnimacionNuevoPopVista pop />)
            abrirConCirculo(() => alAbrir(datos))
            avisar(datos, TOAST_MS)
            setTimeout(capa.quitar, FIN_MS)
        })
        .catch(() => capa.quitar())
}

export default lanzarAnimacionNuevoPop
