import * as XLSX from 'xlsx'
import { fechaCorta, valorCelda } from './modelo'

/*
  Descarga de las respuestas de un formulario (lo filtrado en la tabla):
  Folio, Invitado, Estado, una columna por pregunta (con su texto actual) y
  Enviado. Excel con XLSX; CSV con BOM para que Excel respete los acentos.
*/

export const columnasDe = (snapshot) => (snapshot?.sections ?? []).flatMap((s) => s.fields)

const filasDe = ({ filas, snapshot, t, lang }) => {
    const campos = columnasDe(snapshot)
    return (filas ?? []).map((r) => {
        const fila = {
            [t('side_events.frm_col_folio')]: r.folio ?? '',
            [t('side_events.frm_col_guest')]: r.nombre,
            [t('side_events.frm_col_state')]: r.estado === 'completo' ? t('side_events.frm_complete') : t('side_events.frm_pending'),
        }
        // Mismo texto en dos preguntas: la segunda lleva su número para no pisar la columna.
        campos.forEach((f, i) => {
            const clave = fila[f.label] !== undefined ? `${f.label} (${i + 1})` : f.label
            fila[clave] = valorCelda(r.answers?.[f.id], f.kind ?? f.type, t)
        })
        fila[t('side_events.frm_col_sent')] = r.estado === 'completo' ? fechaCorta(r.actualizado, lang) : ''
        return fila
    })
}

const nombreArchivo = (snapshot, eventoId, ext) => {
    const base = String(snapshot?.title || 'formulario').normalize('NFD').replace(/[̀-ͯ]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'formulario'
    return `${base}-${eventoId}.${ext}`
}

export const descargarRespuestas = ({ formato, filas, snapshot, eventoId, t, lang }) => {
    const datos = filasDe({ filas, snapshot, t, lang })
    const hoja = XLSX.utils.json_to_sheet(datos)
    if (formato === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(hoja)
        const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = nombreArchivo(snapshot, eventoId, 'csv')
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
    } else {
        const libro = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(libro, hoja, 'Respuestas')
        XLSX.writeFile(libro, nombreArchivo(snapshot, eventoId, 'xlsx'))
    }
    return datos.length
}
