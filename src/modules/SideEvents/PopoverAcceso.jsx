import { Button, Popover, Switch } from 'antd'
import { LockOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ed from './SideEventEditor.module.css'

/*
  Candado de un Pop público (escritorio y celular). Con el Pop privado, tocar
  el candado lo hace público y abre este recuadro; ya público, tocarlo lo
  abre. Adentro: "Permitir acompañantes" (body.allowCompanions; sin valor =
  sí: en la página del invitado sale "+ Agregar acompañante" al confirmar y el
  backend los guarda, ver iattend--backend/router/sideEventPublic.js) y
  "Hacer privada".
*/
export const PopoverAcceso = ({ esPublico, cambiando, permitir, onPermitir, onPublica, onPrivada, abierto, onAbierto, placement = 'bottomRight', children }) => {
    const { t } = useTranslation()

    const cambiarAbierto = async (v) => {
        if (!v) return onAbierto(false)
        if (cambiando) return
        if (!esPublico && !(await onPublica())) return
        onAbierto(true)
    }

    const contenido = (
        <div data-text-bar className={ed.accesoPop}>
            <div className={ed.accesoPopCabeza}>
                <span className={ed.accesoPopIcono}><LockOpen size={16} /></span>
                <div>
                    <div className={ed.accesoPopTitulo}>{t('side_events.access_public')}</div>
                    <div className={ed.accesoPopNota}>{t('side_events.access_public_note')}</div>
                </div>
            </div>
            <label className={ed.accesoPopFila}>
                <div>
                    <div className={ed.accesoPopEtiqueta}>{t('side_events.allow_companions')}</div>
                    <div className={ed.accesoPopNota}>{t('side_events.allow_companions_hint')}</div>
                </div>
                <Switch size="small" checked={permitir} onChange={onPermitir} />
            </label>
            <Button block disabled={cambiando} onClick={async () => { if (await onPrivada()) onAbierto(false) }}>
                {t('side_events.access_make_private')}
            </Button>
        </div>
    )

    return (
        <Popover
            trigger="click"
            placement={placement}
            open={abierto && esPublico}
            onOpenChange={cambiarAbierto}
            content={contenido}
            arrow={false}
        >
            {children}
        </Popover>
    )
}
