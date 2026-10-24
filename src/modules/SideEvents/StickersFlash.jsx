import { Button, Checkbox, Slider } from 'antd'
import { ChevronDown, ChevronUp, Copy, Eye, EyeOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { stickerLigeroDesdeUrl } from '../../helpers/services/uploadImage'
import ed from './SideEventEditor.module.css'
import { alternar, conModificador, MAX_STICKERS, nuevoSticker } from './stickersFlashData'

/*
  Elementos PNG de un Evento Flash (panel del editor). Van sobre la portada y
  se mueven con la página. `body.stickers`: { id, url, x, y (centro, en % del
  ancho y del alto de la pantalla), w (% del ancho), rot (grados), opacity,
  hidden (oculto sin borrar), z (legado: ya no se usa) }. Todos van detrás del título, la fecha y el lugar.
  Lo que baje a los botones de confirmar se recorta (zona segura, en SideCanvas
  y en la página del invitado) salvo con `body.stickers_zona_libre`. Se
  acomodan arrastrándolos en la pieza; aquí van tamaño, rotación, opacidad,
  la zona segura y quitar.
  Selección múltiple: `seleccionados` es un arreglo de ids (⌘/Ctrl/Shift +
  clic suma o quita, aquí y en la pieza). Con varios, el tamaño escala a
  todos en proporción, la rotación gira a todos lo mismo y la opacidad se
  iguala; duplicar y quitar van sobre todos.
*/

// Dos decimales: con uno, el redondeo de cada paso del slider se acumulaba
// y los que siguen al primero se iban quedando chicos.
const redondear = (v) => Math.round(v * 100) / 100

export const StickersFlash = ({ stickers, onChange, seleccionados = [], onSeleccionar, carpeta, zonaLibre, onZonaLibre }) => {
    const { t } = useTranslation()
    const grupo = stickers.filter(s => seleccionados.includes(s.id))
    // El primero que se eligió manda en los sliders; los demás lo siguen.
    const actual = stickers.find(s => s.id === seleccionados.find(id => grupo.some(g => g.id === id))) ?? null
    const varios = grupo.length > 1
    const cambiarGrupo = (fn) => onChange(stickers.map(s => (seleccionados.includes(s.id) ? { ...s, ...fn(s) } : s)))
    const elegir = (e, id) => onSeleccionar(conModificador(e) ? alternar(seleccionados, id) : [id])
    // Capas: el orden del arreglo es el orden en que se apilan (el último va
    // encima), en la pieza y en la página del invitado. `paso` +1 lo sube.
    const mover = (id, paso) => {
        const i = stickers.findIndex(s => s.id === id)
        const j = i + paso
        if (i < 0 || j < 0 || j >= stickers.length) return
        const lista = [...stickers]
        ;[lista[i], lista[j]] = [lista[j], lista[i]]
        onChange(lista)
    }

    return (
        <>
            {/* Capas, la de hasta arriba primero (como en un editor de diseño). */}
            {stickers.length > 0 && (
                <div className={ed.capasLista}>
                    {[...stickers].reverse().map((s, k) => {
                        const n = stickers.length - k
                        return (
                            <div
                                key={s.id}
                                role='button'
                                tabIndex={0}
                                className={`${ed.capaFila} ${seleccionados.includes(s.id) ? ed.capaFilaActiva : ''} ${s.hidden ? ed.capaOculta : ''}`}
                                onClick={(e) => elegir(e, s.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') elegir(e, s.id) }}
                            >
                                <span className={ed.capaThumb}><img src={s.url} alt='' /></span>
                                <span className={ed.capaNombre}>
                                    {t('side_events.stickers_layer', { n })}
                                    {k === 0 && stickers.length > 1 && <span className={ed.capaPosicion}>{t('side_events.stickers_layer_top')}</span>}
                                    {k === stickers.length - 1 && stickers.length > 1 && <span className={ed.capaPosicion}>{t('side_events.stickers_layer_bottom')}</span>}
                                </span>
                                <span className={ed.capaAcciones}>
                                    {/* Ocultar sin borrar: se queda guardado, no se pinta. */}
                                    <Button
                                        type='text'
                                        size='small'
                                        icon={s.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                                        aria-label={t(s.hidden ? 'side_events.stickers_show' : 'side_events.stickers_hide')}
                                        aria-pressed={!!s.hidden}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onChange(stickers.map(o => (o.id === s.id ? { ...o, hidden: !o.hidden || undefined } : o)))
                                        }}
                                    />
                                    <Button
                                        type='text'
                                        size='small'
                                        icon={<ChevronUp size={16} />}
                                        disabled={k === 0}
                                        aria-label={t('side_events.stickers_layer_up')}
                                        onClick={(e) => { e.stopPropagation(); mover(s.id, 1) }}
                                    />
                                    <Button
                                        type='text'
                                        size='small'
                                        icon={<ChevronDown size={16} />}
                                        disabled={k === stickers.length - 1}
                                        aria-label={t('side_events.stickers_layer_down')}
                                        onClick={(e) => { e.stopPropagation(); mover(s.id, -1) }}
                                    />
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}

            <div className={ed.thumbRow}>
                {stickers.length < MAX_STICKERS && (
                    <div className={ed.uploadTile}>
                        <StorageImages
                            invitationID={carpeta}
                            type={'side-events'}
                            handleImage={async (url) => {
                                if (!url) return
                                // Un PNG de "Mis imágenes" se guarda aligerado como sticker.
                                const ligero = await stickerLigeroDesdeUrl(url, carpeta)
                                const nuevo = nuevoSticker(ligero)
                                onChange([...stickers, nuevo])
                                onSeleccionar([nuevo.id])
                            }}
                        />
                    </div>
                )}
            </div>
            <span className={ed.hint}>{t(stickers.length ? 'side_events.stickers_hint_drag' : 'side_events.stickers_hint_empty')}</span>
            {stickers.length < MAX_STICKERS && <span className={ed.hint}>{t('side_events.stickers_hint_paste')}</span>}
            {stickers.length > 1 && <span className={ed.hint}>{t('side_events.stickers_hint_multi')}</span>}

            {/* Zona segura (se dibuja en la pieza con este panel abierto):
                prendida, lo que baje a los botones de confirmar se recorta. */}
            <Checkbox checked={!zonaLibre} onChange={(e) => onZonaLibre(!e.target.checked)}>
                {t('side_events.stickers_zone_clip')}
            </Checkbox>

            {actual && (
                <>
                    {varios && <span className={ed.fieldLabel}>{t('side_events.stickers_selected', { n: grupo.length })}</span>}
                    <div className={ed.fieldStack}>
                        <span className={ed.fieldLabel}>{t('side_events.stickers_size')}</span>
                        {/* Con varios, todos crecen en la misma proporción que el primero. */}
                        <Slider
                            min={5}
                            max={100}
                            value={actual.w}
                            onChange={(v) => {
                                const factor = v / (actual.w || 1)
                                cambiarGrupo(s => ({ w: s.id === actual.id ? v : Math.min(100, Math.max(5, redondear(s.w * factor))) }))
                            }}
                        />
                    </div>
                    <div className={ed.fieldStack}>
                        <span className={ed.fieldLabel}>{t('side_events.stickers_rotation')}</span>
                        <Slider
                            min={-180}
                            max={180}
                            value={actual.rot ?? 0}
                            onChange={(v) => {
                                const delta = v - (actual.rot ?? 0)
                                cambiarGrupo(s => ({ rot: s.id === actual.id ? v : Math.min(180, Math.max(-180, (s.rot ?? 0) + delta)) }))
                            }}
                        />
                    </div>
                    <div className={ed.fieldStack}>
                        <span className={ed.fieldLabel}>{t('side_events.stickers_opacity')}</span>
                        <Slider min={0.1} max={1} step={0.05} value={actual.opacity ?? 1} onChange={(v) => cambiarGrupo(() => ({ opacity: v }))} />
                    </div>
                    <div className={ed.fechaFila}>
                        <Button
                            icon={<Copy size={14} />}
                            disabled={stickers.length + grupo.length > MAX_STICKERS}
                            onClick={() => {
                                const ahora = Date.now()
                                const copias = grupo.map((g, i) => ({ ...g, id: `s${ahora}${i}`, x: Math.min(95, g.x + 6), y: Math.min(95, g.y + 6) }))
                                onChange([...stickers, ...copias])
                                onSeleccionar(copias.map(c => c.id))
                            }}
                        >
                            {t('side_events.stickers_duplicate')}
                        </Button>
                        <Button
                            danger
                            icon={<Trash2 size={14} />}
                            onClick={() => {
                                onChange(stickers.filter(s => !seleccionados.includes(s.id)))
                                onSeleccionar([])
                            }}
                        >
                            {t('side_events.stickers_remove')}
                        </Button>
                    </div>
                </>
            )}
        </>
    )
}
