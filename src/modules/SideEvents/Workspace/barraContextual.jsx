import { useTranslation } from 'react-i18next'
import { SongBar } from '../../Invitation/Build/PageSections/SongBar'
import { TextBar } from '../../Invitation/Build/PageSections/TextBar'
import { LiveSlider } from '../../Invitation/Build/PageSections/barControls'
import barStyles from '../../Invitation/Build/PageSections/ElementBar.module.css'
import { ElementBar } from '../../Invitation/Build/PageSections/ElementBar'
import { esImagen } from '../stickersPopData'
import { NOTAS_DEFAULT } from '../tarjetasSide'
import { AjusteFotoBar, BackgroundBar, DateBar, DEFAULT_SOMBRA_TITULO, PlaceBar, WeatherBar } from './SideBars'
import { barraElemento } from './barraElemento'
import { PatrocinadoresBar } from './PatrocinadoresBar'
import { tieneBarraPatrocinadores } from '../patrocinadores'

/*
  Barra contextual de la pieza de un side event / Pop: la que sale según lo
  elegido (elemento, título, notas, fecha, lugar / cómo llegar, clima,
  fondo / ajustar, canción) y el destino del selector de color (color del
  elemento o del texto). La usan el editor de escritorio (SideWorkspace, arriba
  de la pieza) y el del celular (EditorMovil, en lugar del footer), así las
  dos tienen exactamente las mismas barras.
  `pickColor(campo)` / `colorPop` / `colorField`: el selector de color de
  quien la usa (popover en escritorio, tarjeta flotante en el celular).
*/
export const useBarraContextual = ({
    section, current, onChange, esPop, carpeta, pieceWidth,
    stickerSel, setStickerSel,
    pickColor, colorPop, colorField,
    pickMedia, fotoElegida, setFotoSel, ajustandoFoto, setAjustandoFoto,
}) => {
    const { t } = useTranslation()
    const body = current?.body ?? {}
    const setBody = (patch, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, ...patch } }), opts)
    const setTitle = (patch, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, title: { ...prev.body?.title, ...patch } } }), opts)
    const setSponsors = (fn, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, sponsors: fn(prev.body?.sponsors ?? {}) } }), opts)
    const setAddress = (patch, opts) => onChange((prev) => ({ ...prev, body: { ...prev.body, address: { ...prev.body?.address, ...patch } } }), opts)
    const stickers = Array.isArray(body.stickers) ? body.stickers : []
    const setStickers = (lista, opts) => setBody({ stickers: lista.length ? lista : null }, opts)
    const { grupo, actual, cambiarGrupo, elementGroup } = barraElemento({ stickers, stickerSel, setStickers, setStickerSel })

    // Título: la barra de texto de la invitación con un adaptador a body.title
    // (font, size, weight, line_height, opacity, color y los extras).
    const title = body.title ?? {}
    const titleTs = {
        font: {
            ...title,
            typeFace: title.font ?? 'Poppins',
            size: title.size ?? 36,
            weight: title.weight ?? 500,
            lineHeight: title.line_height ?? 1.4,
            opacity: title.opacity ?? 1,
            color: title.color || '#FFFFFF',
        },
        setFont: (patch, o) => {
            const { typeFace, lineHeight, ...rest } = patch
            setTitle({ ...rest, ...(typeFace !== undefined ? { font: typeFace } : {}), ...(lineHeight !== undefined ? { line_height: lineHeight } : {}) }, o)
        },
        align: null,
        setAlign: null,
        minSize: esPop ? 14 : 36,
        maxSize: 64,
        showSize: true,
        showColor: true,
    }
    // Notas: la misma barra de texto, sobre body.notes_style (tarjetasSide.js).
    const notas = { ...NOTAS_DEFAULT, ...(body.notes_style ?? {}) }
    const setNotas = (patch, o) => setBody({ notes_style: { ...(body.notes_style ?? {}), ...patch } }, o)
    const notesTs = {
        font: {
            ...notas,
            typeFace: notas.font,
            lineHeight: notas.line_height,
            color: notas.color || '#FFFFFF',
        },
        setFont: (patch, o) => {
            const { typeFace, lineHeight, ...rest } = patch
            setNotas({ ...rest, ...(typeFace !== undefined ? { font: typeFace } : {}), ...(lineHeight !== undefined ? { line_height: lineHeight } : {}) }, o)
        },
        align: notas.align,
        setAlign: (v) => setNotas({ align: v }),
        minSize: 10,
        maxSize: 32,
        showSize: true,
        showColor: true,
    }

    const titleShadow = (pop, open) => pop('shadow', (
        <LiveSlider label={t('side_events.text_shadow')} value={title.shadow ?? DEFAULT_SOMBRA_TITULO} min={0} max={100} format={(v) => `${v}%`} onChange={(v, o) => setTitle({ shadow: v }, o)} />
    ), (
        <button type="button" className={barStyles.textBtn} data-on={open === 'shadow' || (title.shadow ?? DEFAULT_SOMBRA_TITULO) > 0 || undefined}>
            {t('build_menu.shadow')}
        </button>
    ))


    // Color del texto (título / notas) o del elemento elegido.
    const colorTarget = section === 'title' && colorField === 'text'
        ? { value: title.color || '#FFFFFF', allowNone: false, onPick: (c, o) => setTitle({ color: c }, o) }
        : section === 'extras' && colorField === 'text'
        ? { value: notas.color || '#FFFFFF', allowNone: false, onPick: (c, o) => setNotas({ color: c }, o) }
        : actual && !esImagen(actual) && grupo.length === 1 ? (() => {
        const field = colorField === 'stroke' && actual.kind === 'shape' ? 'stroke' : 'color'
        return {
            value: field === 'stroke' ? (actual.stroke || '#FFFFFF') : (actual.color || '#FFFFFF'),
            allowNone: field === 'color' && actual.kind === 'shape',
            onPick: (c, o) => cambiarGrupo(() => (field === 'stroke'
                ? { stroke: c, strokeWidth: (actual.strokeWidth ?? 0) > 0 ? actual.strokeWidth : 2 }
                : { color: c }), o),
        }
    })() : null

    const bar = section === 'stickers' && actual
        ? <ElementBar item={actual} accent="#FFFFFF" onPatch={(patch, o) => cambiarGrupo(() => patch, o)} onPickColor={pickColor} colorOpen={colorPop ? colorField : null} group={elementGroup} pieceWidth={pieceWidth} />
        : section === 'title' ? <TextBar target="pop_title" ts={titleTs} onPickColor={() => pickColor('text')} colorOpen={Boolean(colorPop) && colorField === 'text'} extra={titleShadow} />
        : section === 'extras' ? <TextBar target="pop_notes" ts={notesTs} onPickColor={() => pickColor('text')} colorOpen={Boolean(colorPop) && colorField === 'text'} />
        : section === 'date' ? <DateBar body={body} setBody={setBody} esPop={esPop} />
        // Cómo llegar sale de la dirección: abre la misma barra que Lugar.
        // Un Pop en línea no tiene barra de lugar: se edita en el panel Acceso.
        // Pop: lugar, dirección y clima se editan en el panel Ubicación (Acceso/AccesoPanel).
        : section === 'place' || section === 'map' ? (esPop ? null : <PlaceBar body={body} setBody={setBody} setAddress={setAddress} />)
        // Clima: cuándo se muestra (automático, siempre, si va a llover, oculto).
        : section === 'weather' ? (esPop ? null : <WeatherBar body={body} setBody={setBody} />)
        : section === 'background' && ajustandoFoto && fotoElegida ? <AjusteFotoBar body={body} setBody={setBody} src={fotoElegida} onListo={() => setAjustandoFoto(false)} />
        : section === 'background' ? <BackgroundBar current={current} setBody={setBody} onChange={onChange} esPop={esPop} pickMedia={pickMedia} fotoSel={fotoElegida} onFotoSel={setFotoSel} onAjustar={(src) => { setFotoSel(src); setAjustandoFoto(true) }} />
        // Patrocinadores (Pop): velocidad y etiqueta, con logos y en Portada o Banda.
        : section === 'sponsors' && esPop && tieneBarraPatrocinadores(body) ? <PatrocinadoresBar body={body} actualizar={setSponsors} />
        : section === 'song' ? <SongBar value={body.song ?? null} onChange={(song) => setBody({ song })} folder={carpeta} />
        : null

    return { bar, colorTarget }
}
