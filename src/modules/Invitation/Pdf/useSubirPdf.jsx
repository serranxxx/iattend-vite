/*
  Subir / reemplazar el PDF desde cualquier lado del editor (barra de la capa
  PDF, panel Mi PDF) y usar uno ya subido. El progreso se comparte con un
  evento de ventana para que la barra y el panel enseñen lo mismo aunque la
  subida empezara en el otro.
*/

import { useEffect, useRef, useState } from 'react'
import { message } from 'antd'
import { subirPdf } from './convertirPdf'

const EVENTO = 'iattend-pdf-progreso'
let progresoActual = null
const avisar = (p) => {
    progresoActual = p
    window.dispatchEvent(new CustomEvent(EVENTO, { detail: p }))
}

// Pone una ficha (de una subida o de la lista de Mi PDF) como el PDF de la
// invitación. Reemplaza `data.pdf` completo.
export const usarFichaPdf = (setInvitation, setSaved, ficha) => {
    setInvitation((prev) => ({ ...prev, formato: 'pdf', pdf: { ...ficha } }))
    setSaved(false)
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
            message.success(`${ficha.paginas} ${ficha.paginas === 1 ? 'página lista' : 'páginas listas'}. Publica para que lo vean tus invitados.`)
        } catch (error) {
            console.error('Error al subir el PDF:', error)
            message.error(error?.message || 'No se pudo leer el PDF')
        } finally {
            avisar(null)
            if (inputRef.current) inputRef.current.value = ''
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

    return { cargar, elegir, input, progreso, textoProgreso }
}
