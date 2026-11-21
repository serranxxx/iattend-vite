/*
  Subir / reemplazar el PDF desde cualquier lado del editor (barra de la capa
  PDF, panel Mi PDF) y usar uno ya subido. El progreso se comparte con un
  evento de ventana para que la barra y el panel enseñen lo mismo aunque la
  subida empezara en el otro.
*/

import { useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import { mejorarPdf, subirPdf } from './convertirPdf'
import { zonasDeLinks } from './botonesPdf'
import { carpetaDePdf } from './pdfsSubidos'

const EVENTO = 'iattend-pdf-progreso'
let progresoActual = null
const avisar = (p) => {
    progresoActual = p
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: p }))
}

// Pone una ficha (de una subida o de la lista de Mi PDF) como el PDF de la
// invitación. Reemplaza `data.pdf` completo. Al pasar del diseño a PDF se
// quita la textura (`generals.texture = null`): encima del PDF estorba. Si ya
// era PDF (cambiar de PDF) no se toca, y al volver al diseño no se restaura.
// Los links que trae el PDF (`ficha.links`) llegan como zonas transparentes
// (`zonasDeLinks`); las de un PDF anterior (`origen: 'pdf'`) se quitan. Con el
// mismo PDF de antes no se toca nada (pueden estar movidas o editadas).
export const usarFichaPdf = (setInvitation, setSaved, ficha) => {
    setInvitation((prev) => {
        const antes = carpetaDePdf(prev?.pdf)
        const mismo = Boolean(antes) && antes === carpetaDePdf(ficha)
        const actuales = prev?.decorations?.pdf ?? []
        const propios = actuales.filter((it) => it.origen !== 'pdf')
        const zonas = mismo ? [] : zonasDeLinks(ficha, prev, propios)
        const cambiaCapa = !mismo && (zonas.length > 0 || propios.length !== actuales.length)
        return {
            ...prev,
            formato: 'pdf',
            pdf: { ...ficha },
            ...(cambiaCapa ? { decorations: { ...(prev?.decorations ?? {}), pdf: [...propios, ...zonas] } } : {}),
            ...(prev?.formato !== 'pdf' && prev?.generals?.texture != null
                ? { generals: { ...prev.generals, texture: null } }
                : {}),
        }
    })
    setSaved(false)
}

// Agrega las zonas de los links del PDF cuando se leyeron después (un PDF
// subido antes de leer links: `completarLinks` baja su original y tarda), o al
// volver a ponerlas desde Botones. Solo si sigue siendo el mismo PDF; se salta
// los links que ya tienen un botón (zonasDeLinks).
// Guarda también `pdf.links`.
export const agregarZonasDeLinks = (setInvitation, setSaved, ficha) => {
    setInvitation((prev) => {
        if (!prev?.pdf || carpetaDePdf(prev.pdf) !== carpetaDePdf(ficha)) return prev
        const actuales = prev?.decorations?.pdf ?? []
        const pdf = { ...prev.pdf, links: ficha.links ?? [] }
        const zonas = zonasDeLinks(ficha, prev, actuales)
        return {
            ...prev,
            pdf,
            ...(zonas.length ? { decorations: { ...(prev?.decorations ?? {}), pdf: [...actuales, ...zonas] } } : {}),
        }
    })
    setSaved(false)
}

// "N links del PDF ya funcionan": para el aviso al subir o elegir un PDF.
export const avisoLinks = (ficha) => {
    const n = (ficha?.links ?? []).filter((z) => z.url).length
    return n ? ` ${n === 1 ? 'Su link ya funciona' : `Sus ${n} links ya funcionan`} (zonas transparentes en Botones).` : ''
}

export const useSubirPdf = ({ invitationID, setInvitation, setSaved }) => {
    const [progreso, setProgreso] = useState(progresoActual)
    const inputRef = useRef(null)

    useEffect(() => {
        const on = (e) => setProgreso(e.detail)
        window.addEventListener(EVENTO, on)
        return () => window.removeEventListener(EVENTO, on)
    }, [])

    const cargar = async (file) => {
        if (!file || progresoActual) return
        if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
            message.error('Sube un archivo PDF')
            return
        }
        try {
            const ficha = await subirPdf({ file, invitationID, onProgreso: avisar })
            if (!ficha) return
            usarFichaPdf(setInvitation, setSaved, ficha)
            message.success(`${ficha.paginas} ${ficha.paginas === 1 ? 'página lista' : 'páginas listas'}.${avisoLinks(ficha)} Publica para que lo vean tus invitados.`)
        } catch (error) {
            console.error('Error al subir el PDF:', error)
            message.error(error?.message || 'No se pudo leer el PDF')
        } finally {
            avisar(null)
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    // Conversión vieja (solo 1440 px, borrosa en escritorio): se vuelve a
    // convertir en alta resolución desde su original. Si sigue siendo el PDF
    // del editor, se cambia su `data.pdf` (los elementos sobre él no se mueven:
    // la proporción de las páginas es la misma).
    const mejorar = async (ficha) => {
        if (!ficha || progresoActual) return
        try {
            const nueva = await mejorarPdf({ ficha, invitationID, onProgreso: avisar })
            if (!nueva) return
            setInvitation((prev) => {
                const actual = carpetaDePdf(prev?.pdf)
                if (actual !== carpetaDePdf(ficha) && actual !== carpetaDePdf(nueva)) return prev
                return { ...prev, pdf: { ...nueva } }
            })
            setSaved(false)
            message.success('Listo: tu PDF ya está en alta resolución. Publica para que lo vean tus invitados.')
        } catch (error) {
            console.error('Error al mejorar el PDF:', error)
            message.error(error?.message || 'No se pudo mejorar el PDF')
        } finally {
            avisar(null)
        }
    }

    const elegir = () => inputRef.current?.click()

    const input = (
        <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            onChange={(e) => cargar(e.target.files?.[0])}
        />
    )

    const textoProgreso = progreso
        ? progreso.fase === 'convirtiendo'
            ? `Preparando página ${progreso.hecho + 1} de ${progreso.total}…`
            : progreso.fase === 'guardando' ? 'Guardando…' : 'Leyendo el PDF…'
        : null

    return { cargar, elegir, mejorar, input, progreso, textoProgreso }
}
