import { useEffect, useMemo, useState } from 'react'
import { Dropdown, Input, InputNumber, message } from 'antd'
import { ArrowUpRight, Check, ChevronDown, Copy, Link2, Minus, MoreHorizontal, Phone, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { supabase } from '../../../lib/supabase'
import { esEventoActivo, fechaDeEvento } from '../adminConstants'
import { AdminModal } from '../AdminModal'
import { EventosCalendario } from './EventosCalendario'
import styles from './EventosSection.module.css'

dayjs.locale('es')

const TABS = [
    { key: 'calendario', label: 'Calendario' },
    { key: 'activos', label: 'Activos' },
    { key: 'todos', label: 'Todos' },
    { key: 'pruebas', label: 'Pruebas' },
]

// Radiografía del evento: qué módulos tiene armados. Cada uno es una tabla
// distinta, así que se cuentan en paralelo por invitación.
//
// Ojo: `event_photos` enlaza por `event_id`, no por `invitation_id` como las
// demás — verificado contra la base, el valor sí es el id de la invitación.
const MODULOS = [
    { key: 'guests', tabla: 'guests', columna: 'invitation_id', label: 'Invitados' },
    { key: 'tables', tabla: 'tables', columna: 'invitation_id', label: 'Mesas' },
    { key: 'side', tabla: 'side_events', columna: 'invitation_id', label: 'Side events' },
    { key: 'std', tabla: 'save_the_dates', columna: 'invitation_id', label: 'Save the date' },
    { key: 'fotos', tabla: 'event_photos', columna: 'event_id', label: 'Photo wall' },
]

// Saltos rápidos del modal de recarga: cubren las recargas típicas sin obligar
// a teclear el total nuevo a mano.
const RECARGAS_RAPIDAS = [25, 50, 100, 200]

// El plan Lite no usa créditos: estar en 0 es su estado normal, no una alerta.
// Ni se marca en ámbar ni se ofrece recargar.
const usaCreditos = (invitation) => invitation?.plan !== 'Lite'

const planClass = (plan) => {
    if (plan === 'Lite') return `${styles.plan} ${styles.planLite}`
    if (plan === 'Paperless') return `${styles.plan} ${styles.planPaperless}`
    if (!plan) return `${styles.plan} ${styles.planNone}`
    return styles.plan
}

// `data.cover.image.prod` puede ser string, array (carrusel de portada) o nulo.
// Mismo criterio que usa el catálogo de invitaciones.
const portadaDe = (invitation) => {
    const prod = invitation?.data?.cover?.image?.prod
    if (typeof prod === 'string' && prod.trim()) return prod
    if (Array.isArray(prod)) return prod.find(u => typeof u === 'string' && u.trim()) ?? null
    return null
}

const formatFecha = (invitation) => {
    const fecha = fechaDeEvento(invitation)
    if (fecha) return dayjs(fecha).format('DD MMM')
    return null
}

export const EventosSection = ({ newInvitations, refreshEventos, query = '', esPrueba }) => {
    const [tab, setTab] = useState('calendario')
    const [ownerInputs, setOwnerInputs] = useState({})
    const [radiografia, setRadiografia] = useState({})
    // Evento abierto desde el calendario; su tarjeta se muestra en un modal.
    const [abierto, setAbierto] = useState(null)

    // Una sola invitación en edición a la vez: el panel viejo compartía un único
    // `actualCredits` entre todas las filas, así que recargar la fila B después de
    // teclear en la A le mandaba a B el valor de A.
    const [recargando, setRecargando] = useState(null)
    const [creditosNuevos, setCreditosNuevos] = useState(0)
    const [guardando, setGuardando] = useState(false)

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    const abrirRecarga = (invitation) => {
        setRecargando(invitation)
        setCreditosNuevos(Number(invitation.credits || 0))
    }

    const cerrarRecarga = () => {
        setRecargando(null)
        setCreditosNuevos(0)
    }

    const confirmarRecarga = async () => {
        if (!recargando) return

        setGuardando(true)
        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/update-credits`,
                { id: recargando.id, credits: creditosNuevos }
            );
            message.success('Créditos actualizados')
            cerrarRecarga()
            refreshEventos()
        } catch (error) {
            console.error('Error updating credits:', error.response?.data || error.message);
            message.error('No se pudieron actualizar los créditos')
        } finally {
            setGuardando(false)
        }
    };

    const AddNewOwner = async (id, name) => {
        if (!name?.trim()) return

        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/add-owner`,
                { id: id, name: name }
            );
            message.success('Editado con éxito')
            refreshEventos()
            setOwnerInputs((prev) => ({
                ...prev,
                [id]: null,
            }))
        } catch (error) {
            console.error('Error updating owners:', error.response?.data || error.message);
            message.error('No se pudo agregar el dueño')
        }
    };

    const removeOwner = async (id, index) => {
        try {
            await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/invitation/remove-owner`,
                { id: id, index: index }
            );
            message.success('Editado con éxito')
            refreshEventos()
        } catch (error) {
            console.error('Error removing owner:', error.response?.data || error.message);
            message.error('No se pudo quitar el dueño')
        }
    };

    const insertSideEvent = async (id) => {
        const { error } = await supabase
            .from('side_events')
            .insert({
                invitation_id: id,
                date: new Date().toISOString(),
                name: null,
                url_image: null,
                body: {
                    address: {
                        street: null,
                        number: null,
                        neighborhood: null,
                        zipcode: null,
                        country: null,
                        state: null,
                        city: null,
                        url: null,
                    },
                    hour: null,
                    image: null,
                    title: {
                        font: 'Poppins',
                        size: 36,
                        weight: 600,
                        opacity: 1,
                        line_height: 1.4
                    },
                    font: 'Poppins',
                    color: "#000000",
                    extras: null
                }
            })

        if (error) {
            console.error(error)
            message.error('No se pudo crear el side event')
            return
        }

        message.success('Side event agregado con éxito')
    }

    // ------------------------------------------------------------- datos ---

    const porTab = useMemo(() => {
        const invitaciones = newInvitations ?? []
        const reales = invitaciones.filter(i => !esPrueba(i))

        // Los activos van por fecha de evento; los que aún no la tienen, al
        // final y por fecha de alta.
        const activos = reales
            .filter(i => esEventoActivo(i))
            .sort((a, b) => {
                if (a.event_date && b.event_date) return new Date(a.event_date) - new Date(b.event_date)
                if (a.event_date) return -1
                if (b.event_date) return 1
                return new Date(b.created_at) - new Date(a.created_at)
            })

        return {
            // El calendario los coloca por fecha, así que solo entran los que
            // la tienen; incluye los ya celebrados, no solo los que vienen.
            calendario: [...reales]
                .filter(i => i.event_date)
                .sort((a, b) => new Date(a.event_date) - new Date(b.event_date)),
            activos,
            todos: [...reales].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
            pruebas: invitaciones
                .filter(i => esPrueba(i))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
        }
    }, [newInvitations, esPrueba])

    // La radiografía se pide del evento que se abre, no de todos: son cinco
    // conteos por tabla con `head: true` y pedirlos para los 55 sería absurdo.
    // Una vez cargada se queda en memoria, así que reabrir no vuelve a pegarle.
    useEffect(() => {
        const id = abierto?.id
        if (!id || radiografia[id]) return

        let cancelado = false

        Promise.all(
            MODULOS.map(async ({ key, tabla, columna }) => {
                const { count } = await supabase
                    .from(tabla)
                    .select('*', { count: 'exact', head: true })
                    .eq(columna, id)
                return { key, count: count ?? 0 }
            })
        ).then(resultados => {
            if (cancelado) return
            const modulos = {}
            resultados.forEach(({ key, count }) => { modulos[key] = count })
            setRadiografia(previos => ({ ...previos, [id]: modulos }))
        }).catch(error => console.error('Error al cargar la radiografía:', error))

        return () => { cancelado = true }
    }, [abierto, radiografia])

    const visibles = useMemo(() => {
        const texto = query.trim().toLowerCase()

        // El buscador de la topbar es global: aquí cubre nombre, email y dueños.
        return porTab[tab].filter(i => !texto || [i.name, i.user_email, ...(i.owners ?? [])]
            .some(campo => String(campo ?? '').toLowerCase().includes(texto)))
    }, [porTab, tab, query])

    const accionesPopup = (record) => (
        <div className={styles.popup}>
            <Link
                target='_blank'
                to={`https://www.iattend.events/${record?.data?.generals?.event?.label}/${record?.data?.generals?.event?.name}`}
                className={styles.popupItem}
            >
                <Link2 size={14} /> Ver invitación
            </Link>
            <Link
                target='_blank'
                to={`https://www.iattend.site/dashboard?id=${record?.id}`}
                className={styles.popupItem}
            >
                <ArrowUpRight size={14} /> Acceder evento
            </Link>
            <button type='button' className={styles.popupItem} onClick={() => copyToClipboard(record.id)}>
                <Copy size={14} /> Copiar ID
            </button>
            <button type='button' className={styles.popupItem} onClick={() => insertSideEvent(record?.id)}>
                <Plus size={14} /> Side event
            </button>
        </div>
    )

    const ownersPopup = (record) => (
        <div className={styles.popup}>
            {(record.owners ?? []).map((owner, index) => (
                <div className={styles.ownerRow} key={`${owner}-${index}`}>
                    <span className={styles.ownerName}>{owner}</span>
                    <button
                        type='button'
                        aria-label={`Quitar a ${owner}`}
                        className={styles.ownerRemove}
                        onClick={() => removeOwner(record.id, index)}
                    >
                        <Minus size={13} />
                    </button>
                </div>
            ))}

            {(record.owners ?? []).length > 0 && <div className={styles.popupDivider} />}

            <Input.Search
                placeholder='Nuevo participante'
                enterButton={<Plus size={14} />}
                value={ownerInputs[record.id] || ''}
                onChange={(e) => setOwnerInputs(prev => ({ ...prev, [record.id]: e.target.value }))}
                onSearch={(value) => AddNewOwner(record.id, value)}
            />
        </div>
    )

    const chipCreditos = (record) => {
        if (!usaCreditos(record)) {
            return <span className={styles.creditsNoAplica}>no aplica</span>
        }

        const creditos = Number(record.credits || 0)
        return (
            <div className={styles.credits}>
                <span className={`${styles.creditsChip} ${creditos === 0 ? styles.creditsChipZero : ''}`}>
                    {creditos}
                </span>
                <button type='button' className={styles.recharge} onClick={() => abrirRecarga(record)}>
                    + Recargar
                </button>
            </div>
        )
    }

    const botonDuenos = (record) => {
        const owners = record.owners ?? []
        return (
            <Dropdown trigger={['click']} placement='bottomLeft' popupRender={() => ownersPopup(record)}>
                <button type='button' className={`${styles.owners} ${owners.length ? '' : styles.ownersEmpty}`}>
                    <span className={styles.ownersLabel}>
                        {owners.length ? `${owners[0]} (${owners.length})` : 'Sin asignar'}
                    </span>
                    <ChevronDown size={13} />
                </button>
            </Dropdown>
        )
    }

    const tarjetaEvento = (record) => {
        const fecha = dayjs(fechaDeEvento(record))
        const dias = fecha.startOf('day').diff(dayjs().startOf('day'), 'day')
        const modulos = radiografia[record.id]
        const owners = record.owners ?? []
        const telefono = record.phone_number
        const whatsapp = telefono ? `https://wa.me/${String(telefono).replace(/\D/g, '')}` : null

        const portada = portadaDe(record)

        return (
            <article className={styles.tarjeta} key={record.id}>
                <div className={styles.portada}>
                    {portada ? (
                        <img
                            className={styles.portadaImg}
                            src={portada}
                            alt=''
                            loading='lazy'
                            style={{ objectPosition: `center ${record.data?.cover?.image?.position ?? 'center'}` }}
                        />
                    ) : (
                        <span className={styles.portadaVacia}>Sin portada</span>
                    )}
                    <span className={`${styles.portadaCuenta} ${dias >= 0 && dias <= 7 ? styles.portadaCuentaUrgente : ''}`}>
                        {dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : dias > 0
                            ? `en ${dias} días`
                            : `hace ${Math.abs(dias)} días`}
                    </span>
                </div>

                <header className={styles.tarjetaHead}>
                    <div className={styles.tarjetaTitulo}>
                        <span className={styles.tarjetaNombre}>{record.name}</span>
                        <span className={styles.tarjetaEmail}>{record.user_email}</span>
                    </div>
                    <span className={planClass(record.plan)}>{record.plan || 'sin plan'}</span>
                </header>

                <div className={styles.tarjetaFecha}>
                    <span className={styles.fechaLarga}>{fecha.format('dddd D [de] MMMM')}</span>
                </div>

                <div className={styles.contacto}>
                    {whatsapp ? (
                        <a className={styles.contactoLink} href={whatsapp} target='_blank' rel='noopener noreferrer'>
                            <Phone size={13} /> {telefono}
                        </a>
                    ) : (
                        <span className={styles.contactoVacio}>
                            <Phone size={13} /> sin teléfono
                        </span>
                    )}
                    {record.rsvp_deadline && (
                        <span className={styles.rsvp}>
                            RSVP hasta {dayjs(record.rsvp_deadline).format('D MMM')}
                        </span>
                    )}
                </div>

                <div className={styles.modulos}>
                    {MODULOS.map(({ key, label }) => {
                        const n = modulos?.[key]
                        const activo = n > 0
                        return (
                            <span
                                key={key}
                                className={`${styles.modulo} ${activo ? styles.moduloOn : ''}`}
                            >
                                {label}
                                {/* Save the date es sí/no; los demás sí tienen cantidad. */}
                                {activo && key !== 'std' && <b>{n}</b>}
                                {activo && key === 'std' && <Check size={12} />}
                            </span>
                        )
                    })}
                </div>

                <footer className={styles.tarjetaPie}>
                    {chipCreditos(record)}
                    <Dropdown trigger={['click']} placement='bottomLeft' popupRender={() => ownersPopup(record)}>
                        <button type='button' className={`${styles.owners} ${owners.length ? '' : styles.ownersEmpty}`}>
                            <span className={styles.ownersLabel}>
                                {owners.length ? `${owners[0]} (${owners.length})` : 'Sin asignar'}
                            </span>
                            <ChevronDown size={13} />
                        </button>
                    </Dropdown>
                    <Dropdown trigger={['click']} placement='bottomRight' popupRender={() => accionesPopup(record)}>
                        <button type='button' aria-label='Acciones' className={styles.iconBtn}>
                            <MoreHorizontal size={15} />
                        </button>
                    </Dropdown>
                </footer>
            </article>
        )
    }

    const delta = creditosNuevos - Number(recargando?.credits || 0)

    return (
        <div className={styles.eventos}>
            <div className={styles.toolbar}>
                <div className={styles.tabs}>
                    {TABS.map(({ key, label }) => (
                        <button
                            key={key}
                            type='button'
                            className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`}
                            onClick={() => setTab(key)}
                        >
                            {label} {porTab[key].length}
                        </button>
                    ))}
                </div>
            </div>

            {tab === 'calendario' ? (
                <EventosCalendario
                    eventos={visibles}
                    onSelect={setAbierto}
                    seleccionado={abierto}
                />
            ) : (
            <div className={styles.card}>
                {visibles.length === 0 ? (
                    <div className={styles.empty}>No hay eventos que coincidan con la búsqueda.</div>
                ) : (
                    <>
                        <div className={styles.scroller}>
                            <div className={styles.table}>
                                <div className={`${styles.row} ${styles.head}`}>
                                    <span className={styles.cell}>Nombre</span>
                                    <span className={styles.cell}>Usuario</span>
                                    <span className={styles.cell}>Plan</span>
                                    <span className={styles.cell}>Créditos</span>
                                    <span className={styles.cell}>Dueños</span>
                                    <span className={styles.cell}>Fecha</span>
                                    <span className={styles.cell} />
                                </div>

                                {visibles.map(record => {
                                    const fecha = formatFecha(record)
                                    return (
                                        <div className={styles.row} key={record.id}>
                                            <span className={`${styles.cell} ${styles.name}`}>{record.name}</span>
                                            <span className={`${styles.cell} ${styles.email}`}>{record.user_email}</span>
                                            <span className={styles.cell}>
                                                <span className={planClass(record.plan)}>{record.plan || 'sin plan'}</span>
                                            </span>
                                            <span className={styles.cell}>{chipCreditos(record)}</span>
                                            <span className={styles.cell}>{botonDuenos(record)}</span>
                                            <span className={`${styles.cell} ${fecha ? styles.date : styles.dateEmpty}`}>
                                                {fecha || 'sin fecha'}
                                            </span>
                                            <span className={styles.cell}>
                                                <Dropdown trigger={['click']} placement='bottomRight' popupRender={() => accionesPopup(record)}>
                                                    <button type='button' aria-label='Acciones' className={styles.iconBtn}>
                                                        <MoreHorizontal size={15} />
                                                    </button>
                                                </Dropdown>
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className={styles.mobileList}>
                            {visibles.map(record => {
                                const fecha = formatFecha(record)
                                return (
                                    <div className={styles.mobileRow} key={record.id}>
                                        <div className={styles.mobileTop}>
                                            <span className={styles.mobileName}>{record.name}</span>
                                            <span className={planClass(record.plan)}>{record.plan || 'sin plan'}</span>
                                            <span className={styles.mobileDate}>{fecha || 'sin fecha'}</span>
                                        </div>
                                        <div className={styles.mobileEmail}>{record.user_email}</div>
                                        <div className={styles.mobileBottom}>
                                            {chipCreditos(record)}
                                            {botonDuenos(record)}
                                            <Dropdown trigger={['click']} placement='bottomRight' popupRender={() => accionesPopup(record)}>
                                                <button type='button' aria-label='Acciones' className={styles.iconBtn}>
                                                    <MoreHorizontal size={15} />
                                                </button>
                                            </Dropdown>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </>
                )}
            </div>
            )}

            <AdminModal open={Boolean(abierto)} onClose={() => setAbierto(null)} width={420}>
                {abierto && tarjetaEvento(abierto)}
            </AdminModal>

            <AdminModal
                open={Boolean(recargando)}
                title='Recargar créditos'
                onClose={cerrarRecarga}
                onConfirm={confirmarRecarga}
                confirmDisabled={delta === 0}
                loading={guardando}
                width={400}
            >
                <div className={styles.rechargeModal}>
                    <div className={styles.rechargeEvent}>
                        <span className={styles.rechargeEventName}>{recargando?.name}</span> · {recargando?.user_email}
                    </div>

                    <div>
                        <div className={styles.rechargeLabel}>Créditos actuales</div>
                        <div className={styles.rechargeCurrent}>
                            <span className={styles.rechargeCurrentValue}>{Number(recargando?.credits || 0)}</span>
                        </div>
                    </div>

                    <div className={styles.rechargeQuick}>
                        {RECARGAS_RAPIDAS.map(monto => (
                            <button
                                key={monto}
                                type='button'
                                className={styles.quickChip}
                                onClick={() => setCreditosNuevos(actual => actual + monto)}
                            >
                                +{monto}
                            </button>
                        ))}
                    </div>

                    <div>
                        <div className={styles.rechargeLabel}>Nuevo total</div>
                        <InputNumber
                            min={0}
                            value={creditosNuevos}
                            onChange={(value) => setCreditosNuevos(Number(value ?? 0))}
                            style={{ width: '100%' }}
                        />
                        {delta !== 0 && (
                            <div className={`${styles.rechargeDelta} ${delta < 0 ? styles.rechargeDeltaDown : ''}`}>
                                {delta > 0 ? `+${delta}` : delta} créditos
                            </div>
                        )}
                    </div>
                </div>
            </AdminModal>
        </div>
    )
}
