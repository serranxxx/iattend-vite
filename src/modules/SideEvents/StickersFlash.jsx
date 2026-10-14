import { Button, Segmented, Slider } from 'antd'
import { Copy, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { StorageImages } from '../../components/ImagesStorage/StorageImages'
import ed from './SideEventEditor.module.css'

/*
  Elementos PNG de un Evento Flash (panel del editor). Van sobre la portada y
  se mueven con la página. `body.stickers`: { id, url, x, y (centro, en % del
  ancho y del alto de la pantalla), w (% del ancho), rot (grados), z ('front'
  delante de todo · 'back' entre el fondo y las tarjetas), opacity }.
  Se acomodan arrastrándolos en la pieza (SideCanvas); aquí van tamaño,
  rotación, opacidad, delante/detrás y quitar. Se pintan con StickersCapa.
*/

const MAX_STICKERS = 12

const nuevoSticker = (url) => ({
    id: `s${Date.now()}`,
    url,
    x: 50,
    y: 25,
    w: 30,
    rot: 0,
    z: 'front',
    opacity: 1,
})

export const StickersFlash = ({ stickers, onChange, seleccionado, onSeleccionar, carpeta }) => {
    const { t } = useTranslation()
    const actual = stickers.find(s => s.id === seleccionado) ?? null
    const cambiar = (patch) => onChange(stickers.map(s => (s.id === actual.id ? { ...s, ...patch } : s)))

    return (
        <>
            <div className={ed.thumbRow}>
                {stickers.map(s => (
                    <button
                        type='button'
                        key={s.id}
                        className={`${ed.stickerThumb} ${s.id === seleccionado ? ed.stickerThumbActivo : ''}`}
                        onClick={() => onSeleccionar(s.id)}
                    >
                        <img src={s.url} alt='' />
                    </button>
                ))}
                {stickers.length < MAX_STICKERS && (
                    <div className={ed.uploadTile}>
                        <StorageImages
                            invitationID={carpeta}
                            type={'side-events'}
                            handleImage={(url) => {
                                if (!url) return
                                const nuevo = nuevoSticker(url)
                                onChange([...stickers, nuevo])
                                onSeleccionar(nuevo.id)
                            }}
                        />
                    </div>
                )}
            </div>
            <span className={ed.hint}>{t(stickers.length ? 'side_events.stickers_hint_drag' : 'side_events.stickers_hint_empty')}</span>

            {actual && (
                <>
                    <div className={ed.fieldStack}>
                        <span className={ed.fieldLabel}>{t('side_events.stickers_size')}</span>
                        <Slider min={5} max={100} value={actual.w} onChange={(v) => cambiar({ w: v })} />
                    </div>
                    <div className={ed.fieldStack}>
                        <span className={ed.fieldLabel}>{t('side_events.stickers_rotation')}</span>
                        <Slider min={-180} max={180} value={actual.rot} onChange={(v) => cambiar({ rot: v })} />
                    </div>
                    <div className={ed.fieldStack}>
                        <span className={ed.fieldLabel}>{t('side_events.stickers_opacity')}</span>
                        <Slider min={0.1} max={1} step={0.05} value={actual.opacity} onChange={(v) => cambiar({ opacity: v })} />
                    </div>
                    {/* Detrás: entre el fondo y las tarjetas; delante: encima de todo. */}
                    <Segmented
                        block
                        value={actual.z}
                        onChange={(v) => cambiar({ z: v })}
                        options={[
                            { value: 'front', label: t('side_events.stickers_front') },
                            { value: 'back', label: t('side_events.stickers_back') },
                        ]}
                    />
                    <div className={ed.fechaFila}>
                        <Button
                            icon={<Copy size={14} />}
                            disabled={stickers.length >= MAX_STICKERS}
                            onClick={() => {
                                const copia = { ...actual, id: `s${Date.now()}`, x: Math.min(95, actual.x + 6), y: Math.min(95, actual.y + 6) }
                                onChange([...stickers, copia])
                                onSeleccionar(copia.id)
                            }}
                        >
                            {t('side_events.stickers_duplicate')}
                        </Button>
                        <Button
                            danger
                            icon={<Trash2 size={14} />}
                            onClick={() => {
                                onChange(stickers.filter(s => s.id !== actual.id))
                                onSeleccionar(null)
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
