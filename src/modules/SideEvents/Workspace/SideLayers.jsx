import { useTranslation } from 'react-i18next'
import { arrayMove } from '@dnd-kit/sortable'
import { CalendarDays, ClipboardList, CloudSun, Image as ImageIcon, Info, ListOrdered, Map as MapIcon, MapPin, MessageCircle, Music, StickyNote, Type, Users } from 'lucide-react'
import { conModificador, alternar } from '../stickersFlashData'
import { MiniaturaElemento } from '../../Editor/Elemento'
import { etiquetaElemento } from '../../Editor/elementoInfo'
import { LayersPanel } from '../../Editor/LayersPanel'
import { formPublicado } from '../Formularios/modelo'
import { activasPrimero, agruparTarjetas, parcheOcultarPortada, parcheOcultarTarjeta, parcheOrdenTarjetas, portadaOculta, tarjetasDe, tieneDatos } from '../tarjetasSide'

/*
  Panel "Capas" de un side event / Flash (LayersPanel, el de todos los
  editores, variante "secciones"): tres secciones con su etiqueta —
  PORTADA, FORMULARIO (aviso al confirmar) y PÁGINA (arrastra para
  ordenar)—. Lo que todavía no tiene contenido lleva "+ Agregar" en vez del
  ojo.
  · Portada (fija): canción, título, fecha y lugar (los tres se pueden
    ocultar con el ojo), los elementos que se agregaron (PNG, vectores,
    textos, íconos…; se arrastran para cambiar el orden —el último del
    arreglo va encima—, ⌘ / Shift + clic suma a la selección, el ojo los
    oculta) y hasta abajo el fondo.
  · Formulario (Flash): fijo, con su ojo. No va en el scroll de la página
    (al invitado le llega como aviso al confirmar, handoff "Flash Layout"
    3a), así que no se arrastra entre las tarjetas.
  · Debajo, las tarjetas en sus grupos, como las etiquetas de la página:
    Información (Itinerario, Notas), Ubicación (Cómo llegar, Clima) y
    Asistentes (dos ramas: la lista y el chat). Los grupos se arrastran para cambiar su orden; las tarjetas,
    dentro de su grupo. El ojo oculta una tarjeta; sin datos, "+ Agregar"
    abre su edición (tarjetasSide.js → tieneDatos).
*/

const TARJETAS = {
    registration: { label: 'lp_registration', Icon: ClipboardList, section: 'registration' },
    attendees: { label: 'lp_attendees', Icon: Users, section: 'attendees' },
    itinerary: { label: 'lp_itinerary', Icon: ListOrdered, section: 'itinerary' },
    map: { label: 'lp_map', Icon: MapIcon, section: 'map' },
    notes: { label: 'lp_notes', Icon: StickyNote, section: 'extras' },
    weather: { label: 'lp_weather', Icon: CloudSun, section: 'weather' },
}

// Grupos de tarjetas, como las etiquetas de la página (agruparTarjetas).
const GRUPOS = {
    info: { label: 'layers_group_info', Icon: Info },
    lugar: { label: 'layers_group_lugar', Icon: MapPin },
    gente: { label: 'layers_group_gente', Icon: Users },
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

    // "+ Agregar" en lugar del ojo: lo que todavía no tiene contenido.
    const agregar = (onClick) => ({ label: t('side_events.layers_add'), onClick })

    // PORTADA: canción, título, fecha y lugar, los elementos y el fondo.
    const portada = {
        id: 'portada',
        segments: [
            {
                kind: 'fixed',
                rows: [
                    conCancion && { ...zona('song', 'lp_song', <Music size={13} />), ...(body.song ? {} : { hidden: true, action: agregar(() => onZone('song')) }) },
                    ocultable('title', 'lp_title', <Type size={13} />),
                    ocultable('date', 'lp_date', <CalendarDays size={13} />),
                    ocultable('place', 'lp_place', <MapPin size={13} />),
                ].filter(Boolean),
            },
            elementos,
            { kind: 'fixed', rows: [zona('background', 'lp_background', <ImageIcon size={13} />)] },
        ].filter((s) => s.rows.length),
    }

    // FORMULARIO: no va en el scroll (al invitado le llega como aviso al
    // confirmar). Sin preguntas todavía, "+ Agregar" abre su panel; con ellas,
    // el ojo lo prende o apaga.
    const todas = tarjetasDe(body, esFlash)
    const conFormulario = todas.some((c) => c.key === 'registration')
    const preguntas = (formPublicado(body.form)?.sections ?? []).reduce((n, sec) => n + (sec.fields ?? []).length, 0)
    const formulario = conFormulario ? [{
        id: 'registration',
        segments: [{
            kind: 'fixed',
            rows: [{
                id: 'registration',
                label: t('build_editor.lp_registration'),
                icon: <ClipboardList size={13} />,
                selected: section === 'registration',
                hidden: !body.form?.enabled || !preguntas,
                onSelect: () => onZone('registration'),
                ...(preguntas
                    ? { onToggleHidden: () => setBody(parcheOcultarTarjeta(body, 'registration', Boolean(body.form?.enabled))) }
                    : { action: agregar(() => onZone('registration')) }),
            }],
        }],
    }] : []

    // Tarjetas agrupadas como en la página (INFORMACIÓN · UBICACIÓN ·
    // ASISTENTES, agruparTarjetas): los grupos se arrastran para cambiar su
    // orden, las tarjetas se ordenan dentro de su grupo y el ojo del grupo
    // oculta o muestra todas las suyas.
    const ocultaDe = (key) => Boolean(todas.find((c) => c.key === key)?.hidden)
    // Sin datos (itinerario sin momentos, notas sin texto, lugar sin
    // dirección, clima sin ciudad) no sale en la página: se ve inactiva aunque
    // su ojo esté prendido. Su ojo, en vez de prender, abre su edición.
    const inactiva = (key) => ocultaDe(key) || !tieneDatos(body, key)
    // Activas arriba (en su orden), inactivas al final, como en la pieza.
    const grupos = agruparTarjetas(activasPrimero(todas.filter((c) => c.key !== 'registration').map((c) => c.key), (k) => !inactiva(k)))
    // Sin datos: "+ Agregar" abre su edición (y la prende si estaba oculta);
    // con datos, el ojo la oculta o la muestra.
    const finDeFila = (key) => (tieneDatos(body, key)
        ? { onToggleHidden: () => setBody(parcheOcultarTarjeta(body, key, !ocultaDe(key))) }
        : { action: agregar(() => { if (ocultaDe(key)) setBody(parcheOcultarTarjeta(body, key, false)); onZone(TARJETAS[key].section) }) })
    const guardarOrden = (lista) => setBody(parcheOrdenTarjetas(body, [...todas.filter((c) => c.key === 'registration').map((c) => c.key), ...lista.flatMap((g) => g.keys)]))
    const tarjetas = grupos.map((g) => {
        const G = GRUPOS[g.id]
        // Asistentes: dos ramas, la lista y el chat (el chat solo existe con
        // la lista prendida; mientras no, su ojo abre Interacción para
        // prenderla). Las dos abren el panel Interacción.
        if (g.id === 'gente') {
            const d = TARJETAS.attendees
            const conLista = !ocultaDe('attendees')
            const conChat = conLista && Boolean(body.chat?.enabled)
            return {
                id: g.id,
                header: {
                    label: t(`side_events.${G.label}`),
                    icon: <G.Icon size={16} strokeWidth={2} />,
                    selected: false,
                    hidden: !conLista,
                    sortable: true,
                    defaultOpen: true,
                    onSelect: () => onZone(d.section),
                },
                segments: [{
                    kind: 'fixed',
                    rows: [
                        {
                            id: 'attendees',
                            label: t('side_events.layers_attendees_list'),
                            icon: <Users size={13} />,
                            selected: section === d.section,
                            hidden: !conLista,
                            onSelect: () => onZone(d.section),
                            onToggleHidden: () => setBody(parcheOcultarTarjeta(body, 'attendees', conLista)),
                        },
                        {
                            id: 'chat',
                            label: t('side_events.layers_chat'),
                            icon: <MessageCircle size={13} />,
                            selected: false,
                            hidden: !conChat,
                            onSelect: () => onZone(d.section),
                            onToggleHidden: () => {
                                if (!conLista) { onZone(d.section); return }
                                setBody({ chat: { ...(body.chat ?? {}), enabled: !conChat } })
                            },
                        },
                    ],
                }],
            }
        }
        return {
            id: g.id,
            header: {
                label: t(`side_events.${G.label}`),
                icon: <G.Icon size={16} strokeWidth={2} />,
                selected: false,
                sortable: true,
                defaultOpen: true,
                onSelect: () => onZone(TARJETAS[g.keys[0]].section),
            },
            segments: [{
                kind: 'items',
                id: `${g.id}-tarjetas`,
                rows: g.keys.map((key) => {
                    const d = TARJETAS[key]
                    return {
                        id: key,
                        label: t(`build_editor.${d.label}`),
                        icon: <d.Icon size={13} />,
                        selected: section === d.section,
                        hidden: inactiva(key),
                        onSelect: () => onZone(d.section),
                        ...finDeFila(key),
                    }
                }),
                onReorder: (activa, destino) => {
                    const de = g.keys.indexOf(activa)
                    const a = g.keys.indexOf(destino)
                    if (de < 0 || a < 0) return
                    guardarOrden(grupos.map((x) => (x.id === g.id ? { ...x, keys: arrayMove(x.keys, de, a) } : x)))
                },
            }],
        }
    })

    return (
        <LayersPanel
            title={t('build_editor.layers_title')}
            variant='secciones'
            groups={[
                { id: 'sec-portada', seccion: { label: t('side_events.layers_section_cover') } },
                portada,
                ...(formulario.length ? [{ id: 'sec-form', seccion: { label: t('side_events.layers_section_form'), hint: t('side_events.layers_form_hint') } }, ...formulario] : []),
                ...(tarjetas.length ? [{ id: 'sec-pagina', seccion: { label: t('side_events.layers_section_page'), hint: t('side_events.layers_page_hint') } }, ...tarjetas] : []),
            ]}
            onReorderGroups={(activa, destino) => {
                const de = grupos.findIndex((g) => g.id === activa)
                const a = grupos.findIndex((g) => g.id === destino)
                if (de < 0 || a < 0 || de === a) return
                guardarOrden(arrayMove(grupos, de, a))
            }}
            showLabel={t('side_events.stickers_show')}
            hideLabel={t('side_events.stickers_hide')}
        />
    )
}
