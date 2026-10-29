import { Button, Slider } from 'antd'
import { closestCenter, DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronDown, ChevronUp, ClipboardPaste, Copy, Eye, EyeOff, GripVertical, ImagePlus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import { stickerLigeroDesdeUrl } from '../../helpers/services/uploadImage'
import ed from './SideEventEditor.module.css'
import { alternar, conModificador, contarImagenes, duplicarStickers, MAX_STICKERS, nuevoSticker, quitarStickers } from './stickersFlashData'
import { MiniaturaElemento } from '../Editor/Elemento'

/*
  Elementos PNG de un Evento Flash (panel del editor). Van en la portada fija,
  que ocupa toda la pantalla: los botones flotan encima, sin recorte.
  `body.stickers`: { id, url, x, y (centro, en % del ancho y del alto de la
  pantalla), w (% del ancho), rot (grados), opacity, hidden (oculto sin
  borrar), z (legado: ya no se usa) }. Van detrás del título, la fecha y el
  lugar. `body.stickers_zona_libre` es legado (ya no hay zona segura). Se
  acomodan arrastrándolos en la pieza; aquí van tamaño, rotación, opacidad,
  capas y quitar.
  Capas: se reordenan arrastrando su agarradera (y con las flechas en
  escritorio). En el editor móvil (`movil`) el panel solo trae las capas y
  agregar: tamaño y giro van con gestos en la pieza, y duplicar y quitar en
  la píldora de arriba (SideEvents).
  Selección múltiple: `seleccionados` es un arreglo de ids (⌘/Ctrl/Shift +
  clic suma o quita, aquí y en la pieza). Con varios, el tamaño escala a
  todos en proporción, la rotación gira a todos lo mismo y la opacidad se
  iguala; duplicar y quitar van sobre todos.
*/

// Una capa de la lista, arrastrable por su agarradera.
const FilaCapa = ({ id, className, onClick, onKeyDown, children, etiquetaArrastrar }) => {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
    return (
        <div
            ref={setNodeRef}
            role='button'
            tabIndex={0}
            className={`${className} ${isDragging ? ed.capaArrastrando : ''}`}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            onClick={onClick}
            onKeyDown={onKeyDown}
        >
            <span
                ref={setActivatorNodeRef}
                className={ed.capaAgarre}
                aria-label={etiquetaArrastrar}
                onClick={(e) => e.stopPropagation()}
                {...attributes}
                {...listeners}
            >
                <GripVertical size={16} />
            </span>
            {children}
        </div>
    )
}

// Dos decimales: con uno, el redondeo de cada paso del slider se acumulaba
// y los que siguen al primero se iban quedando chicos.
const redondear = (v) => Math.round(v * 100) / 100

export const StickersFlash = ({ stickers, onChange, seleccionados = [], onSeleccionar, carpeta, movil = false, onPegar = null }) => {
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

    // La lista va al revés del arreglo (la de hasta arriba primero).
    const enLista = [...stickers].reverse()
    const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
    const soltarCapa = ({ active, over }) => {
        if (!over || active.id === over.id) return
        const de = enLista.findIndex(s => s.id === active.id)
        const a = enLista.findIndex(s => s.id === over.id)
        onChange(arrayMove(enLista, de, a).reverse())
    }

    return (
        <>
            {/* Capas, la de hasta arriba primero (como en un editor de diseño). */}
            {stickers.length > 0 && (
                <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={soltarCapa}>
                <SortableContext items={enLista.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className={ed.capasLista}>
                    {enLista.map((s, k) => {
                        const n = stickers.length - k
                        return (
                            <FilaCapa
                                key={s.id}
                                id={s.id}
                                etiquetaArrastrar={t('side_events.stickers_layer_drag')}
                                className={`${ed.capaFila} ${seleccionados.includes(s.id) ? ed.capaFilaActiva : ''} ${s.hidden ? ed.capaOculta : ''}`}
                                onClick={(e) => elegir(e, s.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') elegir(e, s.id) }}
                            >
                                <span className={ed.capaThumb}><MiniaturaElemento s={s} /></span>
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
                                    {!movil && <>
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
                                    </>}
                                </span>
                            </FilaCapa>
                        )
                    })}
                </div>
                </SortableContext>
                </DndContext>
            )}

            {/* Agregar: un botón con texto (el ícono solo no decía que era para subir). */}
            {contarImagenes(stickers) < MAX_STICKERS && (
                        <StorageImages
                            invitationID={carpeta}
                            type={'side-events'}
                            customTrigger={
                                <button type='button' className={ed.stickerAgregar}>
                                    <span className={ed.stickerAgregarIcono}><ImagePlus size={18} /></span>
                                    <span className={ed.stickerAgregarTexto}>
                                        <strong>{t('side_events.stickers_add')}</strong>
                                        <span>{t('side_events.stickers_add_hint', { n: contarImagenes(stickers), max: MAX_STICKERS })}</span>
                                    </span>
                                </button>
                            }
                            handleImage={async (url) => {
                                if (!url) return
                                // Un PNG de "Mis imágenes" se guarda aligerado como sticker.
                                const ligero = await stickerLigeroDesdeUrl(url, carpeta)
                                const nuevo = nuevoSticker(ligero)
                                onChange([...stickers, nuevo])
                                onSeleccionar([nuevo.id])
                            }}
                        />
            )}
            {/* Teléfono: sin ⌘V, se pega con un botón que lee el portapapeles
                (lo arma SideEvents; solo si el navegador puede leerlo). */}
            {movil && onPegar && contarImagenes(stickers) < MAX_STICKERS && (
                <button type='button' className={ed.stickerPegar} onClick={onPegar}>
                    <ClipboardPaste size={16} />
                    {t('side_events.stickers_paste_btn')}
                </button>
            )}
            {movil
                ? <span className={ed.hint}>{t(stickers.length ? 'side_events.stickers_hint_gestures' : 'side_events.stickers_hint_empty')}</span>
                : <>
                    <span className={ed.hint}>{t(stickers.length ? 'side_events.stickers_hint_drag' : 'side_events.stickers_hint_empty')}</span>
                    {contarImagenes(stickers) < MAX_STICKERS && <span className={ed.hint}>{t('side_events.stickers_hint_paste')}</span>}
                    {stickers.length > 1 && <span className={ed.hint}>{t('side_events.stickers_hint_multi')}</span>}
                </>
            }

            {/* En móvil, tamaño y giro van con gestos y duplicar/quitar en la píldora. */}
            {actual && !movil && (
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
                            disabled={contarImagenes(stickers) + contarImagenes(grupo) > MAX_STICKERS}
                            onClick={() => {
                                const { lista, nuevos } = duplicarStickers(stickers, seleccionados)
                                onChange(lista)
                                onSeleccionar(nuevos)
                            }}
                        >
                            {t('side_events.stickers_duplicate')}
                        </Button>
                        <Button
                            danger
                            icon={<Trash2 size={14} />}
                            onClick={() => {
                                onChange(quitarStickers(stickers, seleccionados))
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
