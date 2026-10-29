import { useTranslation } from 'react-i18next'
import { arrayMove } from '@dnd-kit/sortable'
import { CalendarDays, ClipboardList, CloudSun, Image as ImageIcon, ListOrdered, Map as MapIcon, MapPin, Music, ScanHeart, StickyNote, Type, Users } from 'lucide-react'
import { conModificador, alternar } from '../stickersFlashData'
import { MiniaturaElemento } from '../../Editor/Elemento'
import { etiquetaElemento } from '../../Editor/elementoInfo'
import { LayersPanel } from '../../Editor/LayersPanel'
import { parcheMoverTarjeta, parcheOcultarPortada, parcheOcultarTarjeta, portadaOculta, tarjetasDe } from '../tarjetasSide'

/*
  Panel "Capas" de un side event / Flash (LayersPanel, el de todos los
  editores), con la forma del de la invitación:
  · Portada (fija): canción, título, fecha y lugar (los tres se pueden
    ocultar con el ojo), los elementos que se agregaron (PNG, vectores,
    textos, íconos…; se arrastran para cambiar el orden —el último del
    arreglo va encima—, ⌘ / Shift + clic suma a la selección, el ojo los
    oculta) y hasta abajo el fondo.
  · Debajo, las tarjetas (Asistentes, Itinerario, Cómo llegar, Notas, Clima):
    se arrastran para acomodarlas y se ocultan con el ojo (tarjetasSide.js).
*/

const TARJETAS = {
    registration: { label: 'lp_registration', Icon: ClipboardList, section: 'registration' },
    attendees: { label: 'lp_attendees', Icon: Users, section: 'attendees' },
    itinerary: { label: 'lp_itinerary', Icon: ListOrdered, section: 'itinerary' },
    map: { label: 'lp_map', Icon: MapIcon, section: 'map' },
    notes: { label: 'lp_notes', Icon: StickyNote, section: 'extras' },
    weather: { label: 'lp_weather', Icon: CloudSun, section: 'weather' },
}

export const SideLayers = ({ stickers, selected, onSelect, onChange, section, onZone, conCancion, esFlash, body, setBody }) => {
    const { t } = useTranslation()
    // La lista va al revés del arreglo: la de hasta arriba primero.
    const enLista = [...stickers].reverse()
    const zona = (key, label, icono) => ({
        id: key,
        label: t(`build_editor.${label}`),
        icon: icono,
        selected: section === key,
        onSelect: () => onZone(key),
    })
    // Título, fecha y lugar: con ojo (se ocultan de la portada).
    const ocultable = (key, label, icono) => ({
        ...zona(key, label, icono),
        hidden: portadaOculta(body, key),
        onToggleHidden: () => setBody(parcheOcultarPortada(body, key, !portadaOculta(body, key))),
    })

    const elementos = {
        kind: 'items',
        id: 'elementos',
        rows: enLista.map((s) => ({
            id: s.id,
            label: etiquetaElemento(s, t),
            icon: <MiniaturaElemento s={s} />,
            selected: selected.includes(s.id),
            hidden: Boolean(s.hidden),
            onSelect: (e) => onSelect(conModificador(e) ? alternar(selected, s.id) : [s.id]),
            onToggleHidden: () => onChange(stickers.map((o) => (o.id === s.id ? { ...o, hidden: !o.hidden || undefined } : o))),
        })),
        onReorder: (activeId, overId) => {
            const de = enLista.findIndex((s) => s.id === activeId)
            const a = enLista.findIndex((s) => s.id === overId)
            onChange(arrayMove(enLista, de, a).reverse())
        },
    }

    const portada = {
        id: 'portada',
        header: {
            label: t('buttons_menu.cover'),
            icon: <ScanHeart size={16} strokeWidth={2} />,
            selected: false,
            // Abierta de entrada: ahí vive casi todo lo que se edita.
            defaultOpen: true,
            onSelect: () => onZone('title'),
        },
        segments: [
            {
                kind: 'fixed',
                rows: [
                    conCancion && zona('song', 'lp_song', <Music size={13} />),
                    ocultable('title', 'lp_title', <Type size={13} />),
                    ocultable('date', 'lp_date', <CalendarDays size={13} />),
                    ocultable('place', 'lp_place', <MapPin size={13} />),
                ].filter(Boolean),
            },
            elementos,
            { kind: 'fixed', rows: [zona('background', 'lp_background', <ImageIcon size={13} />)] },
        ].filter((s) => s.rows.length),
    }

    const tarjetas = tarjetasDe(body, esFlash).map(({ key, hidden }) => {
        const d = TARJETAS[key]
        return {
            id: key,
            header: {
                label: t(`build_editor.${d.label}`),
                icon: <d.Icon size={16} strokeWidth={2} />,
                selected: section === d.section,
                hidden,
                sortable: true,
                onSelect: () => onZone(d.section),
                onToggleHidden: () => setBody(parcheOcultarTarjeta(body, key, !hidden)),
            },
            segments: [],
        }
    })

    return (
        <LayersPanel
            title={t('build_editor.layers_title')}
            groups={[portada, ...tarjetas]}
            onReorderGroups={(activa, destino) => {
                const parche = parcheMoverTarjeta(body, activa, destino)
                if (parche) setBody(parche)
            }}
            showLabel={t('side_events.stickers_show')}
            hideLabel={t('side_events.stickers_hide')}
        />
    )
}
