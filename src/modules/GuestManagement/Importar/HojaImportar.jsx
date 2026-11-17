import { useEffect, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { ImportarInvitados } from './ImportarInvitados'
import s from './HojaImportar.module.css'

const ABRE_MS = 600
const CIERRA_MS = 550
const AVISO_MS = 3200

// La hoja del importador dentro de un editor (handoff "Importar con Lia"):
// sale de debajo de la barra de arriba (`[data-editor-topbar]`, que queda
// encima), con un fondo que no la cubre; sube al cerrar. Al importar deja un
// aviso abajo al centro: "✦ Lia importó N invitados".
// `modo='evento'` abre directo en la lista de eventos del organizador
// (`eventos`, de POST /api/guests/import/eventos).
// `barra`: la barra de la que sale (en /dashboard/guests, el header del
// dashboard) y `z`: el z-index del fondo (la hoja va uno arriba); tiene que
// quedar debajo de esa barra.
export const HojaImportar = ({ abierta, archivo = null, modo = 'archivo', eventos = null, invitationId, sideEventId, esPop = false, onCerrar, onImportado, barra = '[data-editor-topbar]', z = 998 }) => {
    const { t } = useTranslation()
    const [montada, setMontada] = useState(false)
    const [visible, setVisible] = useState(false)
    const [arriba, setArriba] = useState(76)
    const [aviso, setAviso] = useState(null)

    useLayoutEffect(() => {
        if (!abierta) return
        const el = document.querySelector(barra)
        setArriba(el ? Math.round(el.getBoundingClientRect().bottom) : 76)
        setMontada(true)
        const id = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
        return () => cancelAnimationFrame(id)
    }, [abierta])

    const cerrar = (despues) => {
        setVisible(false)
        setTimeout(() => {
            setMontada(false)
            despues?.()
        }, CIERRA_MS)
    }

    useEffect(() => {
        if (!aviso) return undefined
        const id = setTimeout(() => setAviso(null), AVISO_MS)
        return () => clearTimeout(id)
    }, [aviso])

    return createPortal(
        <>
            {montada && (
                <>
                    <div className={s.fondo} style={{ top: arriba, zIndex: z }} data-visible={visible || undefined} aria-hidden />
                    <div
                        className={s.hoja}
                        style={{ top: arriba, zIndex: z + 1, '--abre': `${ABRE_MS}ms`, '--cierra': `${CIERRA_MS}ms` }}
                        data-visible={visible || undefined}
                        role="dialog"
                        aria-modal="true"
                        aria-label={t('guests_import.title')}
                    >
                        <ImportarInvitados
                            invitationId={invitationId}
                            sideEventId={sideEventId}
                            esPop={esPop}
                            archivoInicial={archivo}
                            modoInicial={modo}
                            eventos={eventos}
                            onCerrar={() => cerrar(onCerrar)}
                            onListo={(r) => cerrar(() => {
                                setAviso(r?.inserted_count ?? 0)
                                onImportado?.(r)
                            })}
                        />
                    </div>
                </>
            )}
            {aviso != null && (
                <div className={s.aviso} role="status">
                    <span className={s.avisoMarca}><Check size={12} strokeWidth={3} /></span>
                    {t('guests_import.toast', { count: aviso })}
                </div>
            )}
        </>,
        document.body
    )
}

export default HojaImportar
