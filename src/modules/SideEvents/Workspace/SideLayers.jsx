import { useTranslation } from 'react-i18next'
import { arrayMove } from '@dnd-kit/sortable'
import { CalendarDays, ClipboardList, CloudSun, Handshake, Image as ImageIcon, Info, Layers, ListOrdered, Map as MapIcon, MapPin, MessageCircle, Music, StickyNote, Type, Users, Video } from 'lucide-react'
import { conModificador, alternar } from '../stickersPopData'
import { MiniaturaElemento } from '../../Editor/Elemento'
import { etiquetaElemento } from '../../Editor/elementoInfo'
import { LayersPanel } from '../../Editor/LayersPanel'
import { formPublicado } from '../Formularios/modelo'
import { esOnline } from '../acceso'
import { patrocinadoresDe } from '../patrocinadores'
import { activasPrimero, agruparTarjetas, parcheOcultarPortada, parcheOcultarTarjeta, parcheOrdenTarjetas, portadaOculta, tarjetasDe, tieneDatos } from '../tarjetasSide'

/*
  Panel "Capas" de un side event / Pop (LayersPanel, el de todos los
  editores, variante "secciones"): tres secciones con su etiqueta —
  PORTADA, FORMULARIO (aviso al confirmar) y PÁGINA (arrastra para
  ordenar)—. Lo que todavía no tiene contenido lleva "+ Agregar" en vez del
  ojo.
  · Portada (fija): canción, título, fecha y lugar (los tres se pueden
    ocultar con el ojo), los elementos que se agregaron (PNG, vectores,
    textos, íconos…; se arrastran para cambiar el orden —el último del
    arreglo va encima—, ⌘ / Shift + clic suma a la selección, el ojo los
    oculta) y hasta abajo el fondo.
  · Formulario (Pop): fijo, con su ojo. No va en el scroll de la página
    (al invitado le llega como aviso al confirmar, handoff "Pop Layout"
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
    sponsors: { label: 'lp_sponsors', Icon: Handshake, section: 'sponsors' },
}

// Grupos de tarjetas, como las etiquetas de la página (agruparTarjetas).
const GRUPOS = {
    info: { label: 'layers_group_info', Icon: Info },
    lugar: { label: 'layers_group_lugar', Icon: MapPin },
    gente: { label: 'layers_group_gente', Icon: Users },
    marcas: { label: 'layers_group_marcas', Icon: Handshake },
}

export const SideLayers = ({ stickers, selected, onSelect, onChange, section, onZone, conCancion, esPop, body, setBody }) => {
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

    // Una capa (un elemento).
    const filaDe = (s) => ({
        id: s.id,
        label: etiquetaElemento(s, t),
        icon: <MiniaturaElemento s={s} />,
        selected: selected.includes(s.id),
        hidden: Boolean(s.hidden),
        onSelect: (e) => onSelect(conModificador(e) ? alternar(selected, s.id) : [s.id]),
        onToggleHidden: () => onChange(stickers.map((o) => (o.id === s.id ? { ...o, hidden: !o.hidden || undefined } : o))),
    })
    // Bloques: un elemento suelto o un grupo (stickersPopData.js → agrupar),
    // en el lugar del primero de sus elementos.
    const bloques = []
    enLista.forEach((s) => {
        if (!s.grupo) { bloques.push({ id: s.id, miembros: [s] }); return }
        const b = bloques.find((x) => x.grupo === s.grupo)
        if (b) b.miembros.push(s)
        else bloques.push({ id: `grupo:${s.grupo}`, grupo: s.grupo, miembros: [s] })
    })
    const filaDeGrupo = (b) => {
        const ids = b.miembros.map((m) => m.id)
        const ocultos = b.miembros.every((m) => m.hidden)
        const soloDibujos = b.miembros.every((m) => m.kind === 'dibujo')
        // Nombre propio (doble clic en Capas → body.grupos[id].nombre) o el de siempre.
        const nombre = body.grupos?.[b.grupo]?.nombre || t(soloDibujos ? 'side_events.layers_group_drawings' : 'side_events.layers_group_elements')
        return {
            id: b.id,
            label: `${nombre} · ${b.miembros.length}`,
            nombre,
            renameHint: t('side_events.layers_group_rename'),
            onRename: (valor) => {
                const resto = { ...(body.grupos ?? {}) }
                if (valor) resto[b.grupo] = { ...(resto[b.grupo] ?? {}), nombre: valor }
                else delete resto[b.grupo]
                setBody({ grupos: Object.keys(resto).length ? resto : undefined })
            },
            icon: <Layers size={14} />,
            selected: ids.every((id) => selected.includes(id)),
            hidden: ocultos,
            onSelect: (e) => onSelect(conModificador(e) ? [...new Set([...selected, ...ids])] : ids),
            onToggleHidden: () => onChange(stickers.map((o) => (ids.includes(o.id) ? { ...o, hidden: !ocultos || undefined } : o))),
            children: b.miembros.map(filaDe),
        }
    }

    const elementos = {
        kind: 'items',
        id: 'elementos',
        rows: bloques.map((b) => (b.grupo && b.miembros.length > 1 ? filaDeGrupo(b) : filaDe(b.miembros[0]))),
        // Arrastrar en Capas (también las capas de adentro de un grupo):
        // · un grupo, o una capa suelta sobre otra suelta o sobre un grupo
        //   cerrado → se mueve el bloque completo;
        // · una capa sobre una capa de un grupo → queda en ese grupo, en ese
        //   lugar (reordena adentro, o entra si venía de fuera);
        // · una capa de un grupo sobre una suelta → sale del grupo.
        // Un grupo que se queda con una sola capa se deshace.
        onReorder: (activeId, overId) => {
            const bloqueDe = (id) => bloques.find((b) => b.id === id || (b.miembros.length === 1 && b.miembros[0].id === id))
            const activo = enLista.find((x) => x.id === activeId)
            const sobre = enLista.find((x) => x.id === overId)
            const bloqueActivo = bloqueDe(activeId)
            const bloqueSobre = bloqueDe(overId)
            const enGrupo = (x) => Boolean(x?.grupo) && bloques.some((b) => b.grupo === x.grupo && b.miembros.length > 1)
            // Bloques completos.
            if ((bloqueActivo && !enGrupo(activo)) && (bloqueSobre || !enGrupo(sobre))) {
                const de = bloques.indexOf(bloqueActivo)
                const a = bloqueSobre ? bloques.indexOf(bloqueSobre) : bloques.findIndex((b) => b.miembros.some((m) => m.id === overId))
                if (de < 0 || a < 0) return
                onChange(arrayMove(bloques, de, a).flatMap((b) => b.miembros).reverse())
                return
            }
            if (!activo) {
                // Un grupo entero soltado sobre una capa de otro grupo: junto a ese grupo.
                const de = bloques.indexOf(bloqueActivo)
                const a = bloques.findIndex((b) => b.miembros.some((m) => m.id === overId))
                if (de < 0 || a < 0) return
                onChange(arrayMove(bloques, de, a).flatMap((b) => b.miembros).reverse())
                return
            }
            // Una capa: a la posición de `sobre`, con el grupo de `sobre` (o sin grupo).
            const plana = [...enLista]
            const de = plana.indexOf(activo)
            const a = sobre ? plana.indexOf(sobre) : plana.findIndex((x) => bloqueSobre?.miembros.some((m) => m.id === x.id))
            if (de < 0 || a < 0) return
            const destino = sobre && enGrupo(sobre) ? sobre.grupo : null
            let nueva = arrayMove(plana, de, a).map((x) => {
                if (x.id !== activeId) return x
                if (destino) return { ...x, grupo: destino }
                const { grupo: _grupo, ...sin } = x
                return sin
            })
            // Grupos de una sola capa: se deshacen.
            const cuantos = {}
            nueva.forEach((x) => { if (x.grupo) cuantos[x.grupo] = (cuantos[x.grupo] ?? 0) + 1 })
            nueva = nueva.map((x) => {
                if (!x.grupo || cuantos[x.grupo] > 1) return x
                const { grupo: _grupo, ...sin } = x
                return sin
            })
            onChange(nueva.reverse())
        },
    }

    // "+ Agregar" en lugar del ojo: lo que todavía no tiene contenido.
    const agregar = (onClick) => ({ label: t('side_events.layers_add'), onClick })

    // Patrocinadores (Pop): activos con el acomodo Portada, su capa va en
    // PORTADA; con Tarjeta o Banda, o inactivos (ocultos o sin logos, como
    // en la pieza: apagados al fondo), en PÁGINA (grupo Patrocinadores). Sin
    // logos, "+ Agregar" abre su panel; con ellos, el ojo → sponsors.enabled.
    const patro = patrocinadoresDe(body)
    const patroEnPortada = esPop && patro.layout === 'portada' && patro.enabled && patro.items.length > 0
    const filaPatro = () => ({
        id: 'sponsors',
        label: t('build_editor.lp_sponsors'),
        icon: <Handshake size={13} />,
        selected: section === 'sponsors',
        hidden: !patro.enabled || !patro.items.length,
        onSelect: () => onZone('sponsors'),
        ...(patro.items.length
            ? { onToggleHidden: () => setBody(parcheOcultarTarjeta(body, 'sponsors', patro.enabled)) }
            : { action: agregar(() => onZone('sponsors')) }),
    })

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
                    patroEnPortada && filaPatro(),
                ].filter(Boolean),
            },
            elementos,
            { kind: 'fixed', rows: [zona('background', 'lp_background', <ImageIcon size={13} />)] },
        ].filter((s) => s.rows.length),
    }

    // FORMULARIO: no va en el scroll (al invitado le llega como aviso al
    // confirmar). Sin preguntas todavía, "+ Agregar" abre su panel; con ellas,
    // el ojo lo prende o apaga.
    const todas = tarjetasDe(body, esPop)
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
    const grupos = agruparTarjetas(activasPrimero(todas.filter((c) => c.key !== 'registration' && !(c.key === 'sponsors' && patroEnPortada)).map((c) => c.key), (k) => !inactiva(k)))
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
        // En línea, Lugar es Acceso (acceso.js).
        const online = g.id === 'lugar' && esOnline(body)
        return {
            id: g.id,
            header: {
                label: online ? t('side_events.layers_group_acceso') : t(`side_events.${G.label}`),
                icon: online ? <Video size={16} strokeWidth={2} /> : <G.Icon size={16} strokeWidth={2} />,
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
                    if (key === 'sponsors') return filaPatro()
                    return {
                        id: key,
                        label: online && key === 'map' ? t('side_events.layers_acceso') : t(`build_editor.${d.label}`),
                        icon: online && key === 'map' ? <Video size={13} /> : <d.Icon size={13} />,
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
