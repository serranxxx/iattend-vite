/*
  Capas en modo PDF: el grupo "PDF" con sus elementos sueltos
  (decorations.pdf: stickers, íconos, textos, formas…), igual que un módulo de
  la invitación normal (ModuleLayers): elegir, ocultar con el ojo y reordenar
  arrastrando. El de hasta arriba de la lista es el que va encima.
  Elegir el grupo (o tocar el PDF en la pieza) enseña la barra del PDF.
*/

import { arrayMove } from '@dnd-kit/sortable'
import { FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LayersPanel } from '../../Editor/LayersPanel'
import { MiniaturaElemento } from '../../Editor/Elemento'
import { etiquetaElemento } from '../../Editor/elementoInfo'
import { SECCION_PDF } from './pdfInvitacion'

const textEvent = (detail) => window.dispatchEvent(new CustomEvent('iattend-text-field', { detail }))

export const PdfLayers = ({ invitation, selected, onSelect, selectedLayer, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const pdf = invitation?.pdf ?? {}
    const items = invitation?.decorations?.[SECCION_PDF] ?? []

    const setItems = (fn) => {
        setInvitation((prev) => ({ ...prev, decorations: { ...(prev.decorations ?? {}), [SECCION_PDF]: fn(prev.decorations?.[SECCION_PDF] ?? []) } }))
        setSaved(false)
    }

    // El último del arreglo va encima: la lista va al revés.
    const lista = [...items].reverse()
    const groups = [{
        id: SECCION_PDF,
        header: {
            label: pdf.paginas ? `PDF · ${pdf.paginas} ${pdf.paginas === 1 ? 'página' : 'páginas'}` : 'PDF',
            icon: <FileText size={16} strokeWidth={2} />,
            selected: selected && !(selectedLayer?.section === SECCION_PDF && selectedLayer?.id),
            onSelect: () => { textEvent(null); onSelect() },
        },
        segments: [{
            kind: 'items',
            id: `${SECCION_PDF}-items`,
            rows: lista.map((it) => ({
                id: it.id,
                label: etiquetaElemento(it, t),
                icon: <MiniaturaElemento s={it} />,
                selected: selectedLayer?.section === SECCION_PDF && selectedLayer?.id === it.id,
                hidden: Boolean(it.hidden),
                onSelect: () => {
                    textEvent(null)
                    if (it.kind === 'dibujo') {
                        window.dispatchEvent(new CustomEvent('iattend-abrir-dibujo', { detail: { section: SECCION_PDF, id: it.id } }))
                        return
                    }
                    onSelect()
                    window.dispatchEvent(new CustomEvent('iattend-host-layer-select', { detail: { section: SECCION_PDF, id: it.id } }))
                },
                onToggleHidden: () => setItems((arr) => arr.map((o) => (o.id === it.id ? { ...o, hidden: !o.hidden || undefined } : o))),
            })),
            onReorder: (activeId, overId) => setItems((arr) => {
                const alReves = [...arr].reverse()
                return arrayMove(alReves, alReves.findIndex((x) => x.id === activeId), alReves.findIndex((x) => x.id === overId)).reverse()
            }),
        }].filter((s) => s.rows.length),
    }]

    return (
        <LayersPanel
            title={t('build_editor.layers_title')}
            groups={groups}
            showLabel={t('build_editor.layers_show')}
            hideLabel={t('build_editor.layers_hide')}
        />
    )
}
