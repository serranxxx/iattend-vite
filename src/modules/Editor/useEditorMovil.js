import { useEffect, useState } from 'react'

/*
  Lo común de los editores del celular (Pop: SideEvents/Movil/EditorMovil,
  invitación: Editor/EditorMovilShell):
  · marca `body[data-editor-movil]`: con ella, los popovers de las barras
    (contenido con `data-text-bar`: Estilo, Sombra, Velo, fuentes…) salen
    como tarjeta flotante a lo ancho arriba de la barra, en vez de anclados
    al botón (se cortaban fuera de la pantalla). Reglas en
    SideEvents/Movil/EditorMovil.module.css.
  · mide el teclado (visualViewport): regresa `{ teclado, vvTop }` (su alto
    y cuánto bajó iOS la vista al abrirlo) y deja el alto en `--teclado-movil`, para que la barra y esas tarjetas suban encima de él
    (en iOS lo fijo se queda detrás del teclado).
*/

export const useEditorMovil = () => {
    const [teclado, setTeclado] = useState(0)
    const [vvTop, setVvTop] = useState(0)
    useEffect(() => {
        document.body.dataset.editorMovil = ''
        const vv = window.visualViewport
        const medir = () => {
            // Contra el alto de la vista de diseño (clientHeight, donde viven
            // las capas fijas), no innerHeight: en iOS innerHeight cambia con
            // el teclado y el desplazamiento, y la barra quedaba a media
            // pantalla.
            const alto0 = document.documentElement.clientHeight || window.innerHeight
            const kb = vv ? Math.max(0, Math.round(alto0 - vv.height - vv.offsetTop)) : 0
            // visualViewport ya descuenta lo que iOS pone flotando arriba del
            // teclado (barra ^ v ✓ y la píldora de la dirección).
            const alto = kb
            setTeclado(alto)
            setVvTop(vv ? Math.max(0, Math.round(vv.offsetTop)) : 0)
            document.documentElement.style.setProperty('--teclado-movil', `${alto}px`)
        }
        medir()
        vv?.addEventListener('resize', medir)
        vv?.addEventListener('scroll', medir)
        return () => {
            delete document.body.dataset.editorMovil
            document.documentElement.style.removeProperty('--teclado-movil')
            vv?.removeEventListener('resize', medir)
            vv?.removeEventListener('scroll', medir)
        }
    }, [])
    return { teclado, vvTop }
}
