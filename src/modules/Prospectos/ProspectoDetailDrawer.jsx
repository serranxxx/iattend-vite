import { useEffect, useState } from 'react'
import { Button, Drawer, Input, Select, message } from 'antd'
import dayjs from 'dayjs'
import { LuExternalLink, LuPlus, LuTrash2 } from 'react-icons/lu'
import { Star } from 'lucide-react'
import { actualizarProspecto, actualizarEstadoProspecto, asignarVendedor, solicitarActivacionProspecto } from './prospectosApi'
import { ESTADOS } from './estados'
import { NIVELES_INTERES } from './nivelInteres'
import styles from './ProspectoDetailDrawer.module.css'

const formatDate = (value) => value ? dayjs(value).format('DD MMM YYYY, HH:mm') : '—'

let _contextoIdCounter = 0
const generateContextoId = () => `ctx_${Date.now()}_${++_contextoIdCounter}`

export const ProspectoDetailDrawer = ({ prospecto, modo, vendedores, pendingFinalize, onClose, onCancelPending, onUpdated }) => {
    const [notas, setNotas] = useState('')
    const [savingNotas, setSavingNotas] = useState(false)
    const [motivo, setMotivo] = useState('')
    const [confirmando, setConfirmando] = useState(false)
    const [reasignando, setReasignando] = useState(false)
    const [savingFavorito, setSavingFavorito] = useState(false)
    const [email, setEmail] = useState('')
    const [telefono, setTelefono] = useState('')
    const [savingContacto, setSavingContacto] = useState(false)
    const [nuevoContexto, setNuevoContexto] = useState('')
    const [savingContexto, setSavingContexto] = useState(false)
    const [savingInteres, setSavingInteres] = useState(false)
    const [solicitandoActivacion, setSolicitandoActivacion] = useState(false)
    const [activacionSolicitada, setActivacionSolicitada] = useState(false)

    useEffect(() => {
        setNotas(prospecto?.notas || '')
        setMotivo(prospecto?.motivo_finalizado || '')
        setEmail(prospecto?.email || '')
        setTelefono(prospecto?.telefono || '')
        setNuevoContexto('')
        setActivacionSolicitada(false)
    }, [prospecto?.id])

    if (!prospecto) return null

    const estadoInfo = ESTADOS.find(e => e.key === prospecto.estado)
    const postContexto = Array.isArray(prospecto.post_contexto) ? prospecto.post_contexto : []

    const guardarNotas = async () => {
        setSavingNotas(true)
        try {
            const { data } = await actualizarProspecto(prospecto.id, { notas })
            onUpdated(data.prospecto)
            message.success('Notas guardadas')
        } catch (error) {
            console.error('Error guardando notas:', error.response?.data || error.message)
            message.error('No se pudieron guardar las notas')
        } finally {
            setSavingNotas(false)
        }
    }

    const guardarContacto = async () => {
        setSavingContacto(true)
        try {
            const { data } = await actualizarProspecto(prospecto.id, { email, telefono })
            onUpdated(data.prospecto)
            message.success('Contacto guardado')
        } catch (error) {
            console.error('Error guardando contacto:', error.response?.data || error.message)
            message.error('No se pudo guardar el contacto')
        } finally {
            setSavingContacto(false)
        }
    }

    const agregarContexto = async () => {
        if (!nuevoContexto.trim()) return
        const nuevoArray = [...postContexto, { id: generateContextoId(), texto: nuevoContexto.trim(), created_at: new Date().toISOString() }]
        setSavingContexto(true)
        try {
            const { data } = await actualizarProspecto(prospecto.id, { post_contexto: nuevoArray })
            onUpdated(data.prospecto)
            setNuevoContexto('')
        } catch (error) {
            console.error('Error agregando contexto:', error.response?.data || error.message)
            message.error('No se pudo agregar')
        } finally {
            setSavingContexto(false)
        }
    }

    const eliminarContexto = async (id) => {
        const nuevoArray = postContexto.filter(item => item.id !== id)
        setSavingContexto(true)
        try {
            const { data } = await actualizarProspecto(prospecto.id, { post_contexto: nuevoArray })
            onUpdated(data.prospecto)
        } catch (error) {
            console.error('Error eliminando contexto:', error.response?.data || error.message)
            message.error('No se pudo eliminar')
        } finally {
            setSavingContexto(false)
        }
    }

    const elegirNivelInteres = async (nivel) => {
        setSavingInteres(true)
        try {
            const { data } = await actualizarProspecto(prospecto.id, { nivel_interes: nivel })
            onUpdated(data.prospecto)
        } catch (error) {
            console.error('Error actualizando nivel de interés:', error.response?.data || error.message)
            message.error('No se pudo actualizar')
        } finally {
            setSavingInteres(false)
        }
    }

    const solicitarActivacion = async () => {
        setSolicitandoActivacion(true)
        try {
            await solicitarActivacionProspecto(prospecto.id)
            setActivacionSolicitada(true)
            message.success('Se le avisó a Alberto para activar la conversación')
        } catch (error) {
            console.error('Error solicitando activación:', error.response?.data || error.message)
            message.error('No se pudo enviar la solicitud')
        } finally {
            setSolicitandoActivacion(false)
        }
    }

    const reasignarVendedor = async (vendedorId) => {
        setReasignando(true)
        try {
            const { data } = await asignarVendedor(prospecto.id, vendedorId)
            onUpdated(data.prospecto)
            message.success('Vendedor actualizado')
        } catch (error) {
            console.error('Error reasignando vendedor:', error.response?.data || error.message)
            message.error('No se pudo reasignar')
        } finally {
            setReasignando(false)
        }
    }

    const alternarFavorito = async () => {
        const nuevoFavorito = !prospecto.favorito
        setSavingFavorito(true)
        try {
            const { data } = await actualizarProspecto(prospecto.id, { favorito: nuevoFavorito })
            onUpdated(data.prospecto)
        } catch (error) {
            console.error('Error actualizando favorito:', error.response?.data || error.message)
            message.error('No se pudo actualizar favorito')
        } finally {
            setSavingFavorito(false)
        }
    }

    const confirmarFinalizacion = async () => {
        if (!motivo.trim()) {
            message.error('Escribe el motivo para finalizar')
            return
        }
        setConfirmando(true)
        try {
            const { data } = await actualizarEstadoProspecto(prospecto.id, 'finalizado', motivo.trim())
            onUpdated(data.prospecto)
            message.success('Prospecto finalizado')
        } catch (error) {
            console.error('Error finalizando:', error.response?.data || error.message)
            message.error('No se pudo finalizar el prospecto')
        } finally {
            setConfirmando(false)
        }
    }

    if (pendingFinalize) {
        return (
            <Drawer open={!!prospecto} onClose={onCancelPending} title={`Finalizar @${prospecto.instagram_username}`} size={380}>
                <div className={styles.pendingBanner}>
                    Este prospecto se moverá a <b>Finalizado</b>. Escribe el motivo antes de confirmar.
                </div>
                <span className={styles.label}>Motivo</span>
                <Input.TextArea
                    autoFocus
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    autoSize={{ minRows: 3, maxRows: 6 }}
                    placeholder="Ej: venta cerrada, no le interesó, no contestó..."
                />
                <div className={styles.pendingActions}>
                    <Button onClick={onCancelPending}>Cancelar</Button>
                    <Button type="primary" loading={confirmando} onClick={confirmarFinalizacion} className="primarybutton--active">
                        Confirmar y finalizar
                    </Button>
                </div>
            </Drawer>
        )
    }

    return (
        <Drawer
            open={!!prospecto}
            onClose={onClose}
            title={`@${prospecto.instagram_username}`}
            size={400}
            extra={
                <Button
                    type="text"
                    loading={savingFavorito}
                    onClick={alternarFavorito}
                    icon={<Star size={16} fill={prospecto.favorito ? '#FFAB00' : 'none'} color={prospecto.favorito ? '#FFAB00' : '#B3B9C4'} />}
                />
            }
        >
            <div className={styles.section}>
                <span className={styles.estadoPill} style={{ background: `${estadoInfo?.color}1a`, color: estadoInfo?.color }}>
                    {estadoInfo?.label}
                </span>
                <a href={`https://instagram.com/${prospecto.instagram_username}`} target="_blank" rel="noreferrer" className={styles.igLink}>
                    Ver perfil de Instagram <LuExternalLink size={14} />
                </a>
                {modo === 'admin' && (
                    <a href={`https://ig.me/m/${prospecto.instagram_username}`} target="_blank" rel="noreferrer" className={styles.igLink}>
                        Abrir conversación <LuExternalLink size={14} />
                    </a>
                )}
            </div>

            {prospecto.estado === 'asignado' && modo === 'vendedor' && (
                <div className={styles.section}>
                    <div className={styles.pendingBanner}>
                        Aún no se activa la conversación. Pídele a Alberto que la abra.
                    </div>
                    <Button
                        onClick={solicitarActivacion}
                        loading={solicitandoActivacion}
                        disabled={activacionSolicitada}
                        className="primarybutton--active"
                    >
                        {activacionSolicitada ? 'Activación solicitada' : 'Solicitar activación'}
                    </Button>
                </div>
            )}

            {prospecto.estado === 'asignado' && modo === 'admin' && (
                <div className={styles.section}>
                    <div className={styles.pendingBanner}>
                        Actívala con el link de arriba y luego arrástrala a "En conversación".
                    </div>
                </div>
            )}

            {modo === 'admin' && (
                <div className={styles.section}>
                    <span className={styles.label}>Vendedor asignado</span>
                    <Select
                        style={{ width: '100%' }}
                        loading={reasignando}
                        value={prospecto.vendedor_id || undefined}
                        placeholder="Sin asignar"
                        onChange={reasignarVendedor}
                        options={(vendedores || []).map(v => ({ label: v.nombre, value: v.id }))}
                    />
                </div>
            )}

            <div className={styles.section}>
                <span className={styles.label}>Notas</span>
                <Input.TextArea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    autoSize={{ minRows: 3, maxRows: 8 }}
                    placeholder="Notas sobre la conversación..."
                />
                <Button onClick={guardarNotas} loading={savingNotas} className={styles.saveNotasBtn}>
                    Guardar notas
                </Button>
            </div>

            <div className={styles.section}>
                <span className={styles.label}>Contacto</span>
                <Input
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ marginBottom: 8 }}
                />
                <Input
                    placeholder="Teléfono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                />
                <Button onClick={guardarContacto} loading={savingContacto} className={styles.saveNotasBtn}>
                    Guardar contacto
                </Button>
            </div>

            <div className={styles.section}>
                <span className={styles.label}>Post contexto</span>
                {postContexto.map(item => (
                    <div key={item.id} className={styles.contextoRow}>
                        <span className={styles.contextoText}>{item.texto}</span>
                        <Button
                            type="text"
                            size="small"
                            icon={<LuTrash2 size={13} />}
                            onClick={() => eliminarContexto(item.id)}
                        />
                    </div>
                ))}
                <div className={styles.contextoAddRow}>
                    <Input
                        placeholder="Link de publicación, comentario u observación..."
                        value={nuevoContexto}
                        onChange={(e) => setNuevoContexto(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && agregarContexto()}
                    />
                    <Button icon={<LuPlus size={13} />} loading={savingContexto} onClick={agregarContexto} />
                </div>
            </div>

            {prospecto.estado === 'en_conversacion' && (
                <div className={styles.section}>
                    <span className={styles.label}>Nivel de interés</span>
                    <div className={styles.interesRow}>
                        {NIVELES_INTERES.map(nivel => (
                            <button
                                key={nivel.value}
                                type="button"
                                disabled={savingInteres}
                                title={nivel.label}
                                onClick={() => elegirNivelInteres(nivel.value)}
                                className={styles.interesPill}
                                style={{
                                    background: nivel.color,
                                    opacity: prospecto.nivel_interes && prospecto.nivel_interes !== nivel.value ? 0.35 : 1,
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {prospecto.estado === 'finalizado' && (
                <div className={styles.section}>
                    <span className={styles.label}>Motivo de finalización</span>
                    <p className={styles.motivoText}>{prospecto.motivo_finalizado || '—'}</p>
                </div>
            )}

            <div className={styles.section}>
                <span className={styles.label}>Historial</span>
                <div className={styles.historyRow}><span>Creado</span><span>{formatDate(prospecto.created_at)}</span></div>
                <div className={styles.historyRow}><span>Asignado</span><span>{formatDate(prospecto.asignado_at)}</span></div>
                <div className={styles.historyRow}><span>Última actualización</span><span>{formatDate(prospecto.updated_at)}</span></div>
            </div>
        </Drawer>
    )
}
