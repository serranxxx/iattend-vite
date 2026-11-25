import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message, Popover } from 'antd'
import { Send } from 'lucide-react'
import { asignarClientePop } from '../../pages/PlannerEvent/plannerEventApi'
import styles from './EnviarPop.module.css'

/*
  "Enviar" del encabezado del editor de un Pop "para enviar después" (sin
  cliente: `user_id` vacío y con `planner_id`). Desplegable con Nombre,
  Correo y Enviar: da de alta al cliente y le manda sus accesos con el correo
  azul de Pops (POST /api/planner/pop/:id/cliente, el mismo de Mis Pops ›
  Clientes). Al terminar, `onEnviado(correo)` y el botón se va.
  `demo`: Pop de prueba (?pop=prueba): no manda nada.
*/

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const EnviarPop = ({ popId, demo = false, className, onEnviado }) => {
    const { t } = useTranslation()
    const [abierto, setAbierto] = useState(false)
    const [nombre, setNombre] = useState('')
    const [correo, setCorreo] = useState('')
    const [enviando, setEnviando] = useState(false)
    const completo = !!nombre.trim() && EMAIL_RE.test(correo.trim())

    const enviar = async (e) => {
        e.preventDefault()
        if (!completo || enviando) return
        setEnviando(true)
        const destino = correo.trim()
        try {
            if (demo) {
                await new Promise((ok) => setTimeout(ok, 600))
                message.info(t('enviar_pop.demo'))
            } else {
                const { data } = await asignarClientePop(popId, { correo_cliente: destino, nombre_cliente: nombre.trim() })
                message.success(t(data?.cliente_existente ? 'enviar_pop.done_existing' : 'enviar_pop.done', { correo: destino }))
            }
            setAbierto(false)
            onEnviado?.(destino)
        } catch (err) {
            message.error(err?.response?.data?.msg || t('planner_event.err_generic'))
        }
        setEnviando(false)
    }

    const contenido = (
        <form className={styles.panel} data-text-bar onSubmit={enviar}>
            <b className={styles.titulo}>{t('enviar_pop.title')}</b>
            <p className={styles.intro}>{t('enviar_pop.intro')}</p>
            <label className={styles.campo}>
                <span>{t('enviar_pop.name')}</span>
                <input
                    autoFocus
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder={t('enviar_pop.name_placeholder')}
                    autoComplete='off'
                />
            </label>
            <label className={styles.campo}>
                <span>{t('enviar_pop.email')}</span>
                <input
                    type='email'
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder='cliente@correo.com'
                    autoCapitalize='none'
                    autoComplete='off'
                />
            </label>
            <button type='submit' className={styles.enviar} aria-disabled={!completo || undefined} disabled={enviando}>
                <Send size={16} aria-hidden />
                {enviando ? t('enviar_pop.sending') : t('enviar_pop.send')}
            </button>
        </form>
    )

    return (
        <Popover
            open={abierto}
            onOpenChange={(v) => { if (!enviando) setAbierto(v) }}
            trigger='click'
            placement='bottomRight'
            content={contenido}
            arrow={false}
            // Encima de la barra de arriba del editor ([data-editor-topbar], z 1200).
            zIndex={1250}
            destroyOnHidden
        >
            <button type='button' className={`${className ?? ''} ${styles.boton}`}>
                <Send size={15} aria-hidden />
                {t('enviar_pop.button')}
            </button>
        </Popover>
    )
}

export default EnviarPop
