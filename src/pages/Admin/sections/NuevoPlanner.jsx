import { useState } from 'react'
import { Checkbox, Input, message } from 'antd'
import { Copy, MailCheck, UserPlus } from 'lucide-react'
import { AdminModal } from '../AdminModal'
import { crearPlanner } from '../usuariosAdminApi'
import styles from './UsuariosSection.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * "Agregar planner" de Admin → Usuarios. El backend crea la cuenta con rol
 * planner, le da 1 evento regular y 1 Evento Flash gratis, le copia la
 * invitación de ejemplo y, si se pide, le manda el correo de bienvenida de
 * planner con su acceso. Si no se manda, aquí se muestra la contraseña.
 */
// renderBoton(abrir): botón propio (p. ej. la acción de la topbar en
// Usuarios › Planners); sin él, el botón de siempre.
export const NuevoPlanner = ({ onCreado, renderBoton }) => {
    const [abierto, setAbierto] = useState(false)

    return (
        <>
            {renderBoton ? renderBoton(() => setAbierto(true)) : (
                <button type='button' className={`${styles.action} ${styles.actionPrimaria} ${styles.nuevoPlanner}`} onClick={() => setAbierto(true)}>
                    <UserPlus size={13} /> Agregar planner
                </button>
            )}
            {abierto && (
                <Formulario
                    onClose={() => setAbierto(false)}
                    onCreado={onCreado}
                />
            )}
        </>
    )
}

const Formulario = ({ onClose, onCreado }) => {
    const [nombre, setNombre] = useState('')
    const [correo, setCorreo] = useState('')
    const [genero, setGenero] = useState('F')
    const [enviarCorreo, setEnviarCorreo] = useState(true)
    const [guardando, setGuardando] = useState(false)
    const [resultado, setResultado] = useState(null)

    const completo = !!nombre.trim() && EMAIL_RE.test(correo.trim())

    const crear = async () => {
        if (!completo || guardando) return
        setGuardando(true)
        try {
            const { data } = await crearPlanner({ nombre: nombre.trim(), correo: correo.trim(), genero, enviar_correo: enviarCorreo })
            setResultado(data)
            onCreado?.()
        } catch (error) {
            message.error(error?.response?.data?.msg || 'No se pudo crear el planner')
        }
        setGuardando(false)
    }

    const copiar = async (texto) => {
        try {
            await navigator.clipboard.writeText(texto)
            message.success('Copiado')
        } catch { /* sin portapapeles */ }
    }

    if (resultado) {
        return (
            <AdminModal open onClose={onClose} title='Planner creado' width={440} onConfirm={onClose} confirmLabel='Listo' cancelLabel='Cerrar'>
                <div className={styles.plannerListo}>
                    {resultado.correo_enviado ? (
                        <p><MailCheck size={16} /> Le mandamos a <b>{correo.trim()}</b> su usuario y contraseña.</p>
                    ) : (
                        <>
                            <p>{enviarCorreo ? 'No se pudo mandar el correo. ' : ''}Compártele estos accesos:</p>
                            <div className={styles.acceso}>
                                <span>Correo</span><code>{correo.trim()}</code>
                                <button type='button' className={styles.action} onClick={() => copiar(correo.trim())}><Copy size={12} /></button>
                            </div>
                            <div className={styles.acceso}>
                                <span>Contraseña</span><code>{resultado.password}</code>
                                <button type='button' className={styles.action} onClick={() => copiar(resultado.password)}><Copy size={12} /></button>
                            </div>
                        </>
                    )}
                    <ul>
                        <li>{resultado.beneficios ? '✓' : '✗'} 1 evento regular y 1 Evento Flash gratis</li>
                        <li>{resultado.plantilla?.ok ? '✓' : '✗'} Su invitación de ejemplo{resultado.plantilla?.ok ? '' : ` (${resultado.plantilla?.msg || 'no se pudo copiar'})`}</li>
                    </ul>
                </div>
            </AdminModal>
        )
    }

    return (
        <AdminModal
            open
            onClose={onClose}
            title='Agregar planner'
            width={440}
            onConfirm={crear}
            confirmLabel={guardando ? 'Creando…' : 'Crear planner'}
            confirmDisabled={!completo}
            loading={guardando}
        >
            <div className={styles.plannerForm}>
                <label className={styles.editorCampo}>
                    <span>Nombre</span>
                    <Input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus maxLength={120} placeholder='Mariana Pérez' />
                </label>
                <label className={styles.editorCampo}>
                    <span>Correo</span>
                    <Input value={correo} onChange={e => setCorreo(e.target.value)} type='email' placeholder='planner@correo.com' />
                </label>
                <div className={styles.editorCampo}>
                    <span>Saludo del correo</span>
                    <div className={styles.tabs} role='radiogroup'>
                        {[['F', 'Bienvenida'], ['M', 'Bienvenido']].map(([valor, etiqueta]) => (
                            <button
                                key={valor}
                                type='button'
                                role='radio'
                                aria-checked={genero === valor}
                                className={`${styles.tab} ${genero === valor ? styles.tabActive : ''}`}
                                onClick={() => setGenero(valor)}
                            >
                                {etiqueta}
                            </button>
                        ))}
                    </div>
                </div>
                <Checkbox checked={enviarCorreo} onChange={e => setEnviarCorreo(e.target.checked)}>
                    Enviarle su acceso por correo
                </Checkbox>
                <small className={styles.editorBeneficiosNota}>
                    Nace con 1 evento regular y 1 Evento Flash gratis, y con su invitación de ejemplo.
                </small>
            </div>
        </AdminModal>
    )
}
