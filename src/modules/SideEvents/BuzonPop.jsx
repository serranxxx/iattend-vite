import { Badge, Dropdown, Tooltip } from 'antd'
import { MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { WhatsappMessages } from '../GuestManagement/WhatsappMessages/WhatsappMessages'

// Botones y contenido del buzón de WhatsApp de un Pop (datos: useBuzonPop.js).

// Contenido del buzón (también para el celular, en su propia hoja).
export const BuzonPopContenido = ({ popId, buzon, className, style, onClose }) => (
    <WhatsappMessages
        sideEventId={popId}
        conversations={buzon.conversaciones}
        error={buzon.error}
        onReintentar={buzon.recargar}
        guestsByPhone={buzon.nombres}
        onMarkRead={buzon.marcarLeido}
        className={className}
        style={style}
        onClose={onClose}
    />
)

// Botón del encabezado (escritorio): ícono con la cuenta de mensajes sin leer.
export const BotonBuzonPop = ({ popId, buzon, className }) => {
    const { t } = useTranslation()
    return (
        <Dropdown
            trigger={['click']}
            placement="bottomRight"
            // Encima de la barra del editor ([data-editor-topbar], z 1200),
            // que si no tapa la parte de arriba del buzón.
            styles={{ root: { zIndex: 1240 } }}
            open={buzon.abierto}
            onOpenChange={(v) => { buzon.setAbierto(v); if (v) buzon.recargar() }}
            popupRender={() => <BuzonPopContenido popId={popId} buzon={buzon} onClose={() => buzon.setAbierto(false)} />}
        >
            <span>
                <Tooltip title={buzon.abierto ? null : t('side_events.inbox_btn')}>
                    <Badge count={buzon.sinLeer} color="var(--light-purple-500, #D1BEDD)" size="small" offset={[-4, 4]}>
                        <button type="button" className={className} aria-label={t('side_events.inbox_btn')}>
                            <MessageCircle size={16} />
                        </button>
                    </Badge>
                </Tooltip>
            </span>
        </Dropdown>
    )
}

// Celular: el botón va en la cabecera de Invitados y el buzón sale en la hoja
// flotante de la boda (.whatsapp_mobile) sobre un velo.
export const BotonBuzonPopMovil = ({ popId, buzon, className }) => {
    const { t } = useTranslation()
    const cerrar = () => buzon.setAbierto(false)
    return (
        <>
            <Badge count={buzon.sinLeer} color="var(--light-purple-500, #D1BEDD)" size="small" offset={[-4, 4]}>
                <button type="button" className={className} aria-label={t('side_events.inbox_btn')} onClick={() => { buzon.setAbierto(true); buzon.recargar() }}>
                    <MessageCircle size={19} />
                </button>
            </Badge>
            {buzon.abierto && createPortal(
                <>
                    <div onClick={cerrar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1299 }} />
                    <BuzonPopContenido popId={popId} buzon={buzon} className="whatsapp_mobile" onClose={cerrar} />
                </>,
                document.body,
            )}
        </>
    )
}
