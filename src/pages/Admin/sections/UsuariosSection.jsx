import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/es'
import { Input, InputNumber, Select, Tooltip, message } from 'antd'
import { Lock, Mail, Pencil } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { FaApple } from 'react-icons/fa'
import { fetchBeneficiosPlanners, fetchProveedores, updateBeneficiosPlanner, updateUsuario } from '../usuariosAdminApi'
import { esRolPlanner } from '../../../helpers/roles'
import { esEventoActivo } from '../adminConstants'
import { AccionTopbar, EnTopbarAccion } from '../AdminTopbar'
import { NuevoPlanner } from './NuevoPlanner'
import styles from './UsuariosSection.module.css'

// El rol vive crudo en `profiles.role`; todo lo demás (etiqueta, color, orden del
// filtro) se deriva de aquí para no repetir el mapeo en cada vista.
const ROLES = {
    Administration: { label: 'Administración', clase: 'roleAdmin' },
    sales: { label: 'Vendedor', clase: 'roleVendedor' },
    planner: { label: 'Planner', clase: 'rolePlanner' },
    mkt: { label: 'Marketing', clase: 'roleMkt' },
    test: { label: 'Pruebas', clase: 'rolePruebas' },
}

const ROL_CLIENTE = { label: 'Cliente', clase: 'roleCliente' }


// Cómo entra la cuenta (auth.users → app_metadata.providers). Una cuenta puede
// tener varios: p. ej. se registró con correo y luego entró con Google.
const PROVEEDORES = {
    google: { label: 'Google', Icono: FcGoogle },
    apple: { label: 'Apple', Icono: FaApple },
    email: { label: 'Correo', Icono: Mail },
}

const Acceso = ({ lista }) => {
    if (lista === undefined) return <span className={styles.accesoVacio}>—</span>
    const conocidos = lista.filter(p => PROVEEDORES[p])
    if (!conocidos.length) return <span className={styles.accesoVacio}>—</span>
    return (
        <span className={styles.acceso}>
            {conocidos.map(p => {
                const { label, Icono } = PROVEEDORES[p]
                return (
                    <Tooltip key={p} title={label}>
                        <span className={styles.accesoItem} aria-label={label}>
                            <Icono size={13} />
                            {conocidos.length === 1 && label}
                        </span>
                    </Tooltip>
                )
            })}
        </span>
    )
}

// '' en el Select = Cliente (role null en la base).
const OPCIONES_ROL = [
    { value: '', label: ROL_CLIENTE.label },
    ...Object.entries(ROLES).map(([value, { label }]) => ({ value, label })),
]

// Edición en línea: ocupa el lugar de la fila (en la tabla y en la lista de
// celular). El correo se muestra pero no se edita: es el login de la cuenta.
// Planners: además de nombre y rol, sus beneficios (eventos gratis y % de
// descuento en toda compra suya). Se guardan después del rol porque el
// backend solo los acepta en cuentas que ya son planner.
const EditorPerfil = ({ perfil, beneficios, beneficiosListos, usados, onCancelar, onGuardado, onBeneficiosGuardados }) => {
    const [nombre, setNombre] = useState(perfil.full_name ?? '')
    const [rol, setRol] = useState(ROLES[perfil.role] ? perfil.role : '')
    const [eventosGratis, setEventosGratis] = useState(beneficios?.free_events ?? 0)
    const [flashGratis, setFlashGratis] = useState(beneficios?.free_flash_events ?? 0)
    const [descuento, setDescuento] = useState(beneficios?.discount_pct ?? 0)
    const [guardando, setGuardando] = useState(false)

    const rolOriginal = ROLES[perfil.role] ? perfil.role : ''
    const cambios = {}
    if (nombre.trim() !== (perfil.full_name ?? '')) cambios.full_name = nombre
    if (rol !== rolOriginal) cambios.role = rol || null
    // Planner o Administración: mismas funciones, mismos beneficios.
    const esPlanner = esRolPlanner(rol)
    // Hasta que carguen los beneficios los campos arrancan en 0: guardar ahí
    // los borraría. Sin cargar, no se mandan.
    const beneficiosSucios = esPlanner && beneficiosListos && (
        (eventosGratis ?? 0) !== (beneficios?.free_events ?? 0)
        || (flashGratis ?? 0) !== (beneficios?.free_flash_events ?? 0)
        || (descuento ?? 0) !== (beneficios?.discount_pct ?? 0)
    )
    const sucio = Object.keys(cambios).length > 0 || beneficiosSucios

    const guardar = async () => {
        if (!nombre.trim()) return message.warning('El nombre es requerido')
        if (!sucio) return onCancelar()
        setGuardando(true)
        try {
            let actualizado = perfil
            if (Object.keys(cambios).length) {
                const { data } = await updateUsuario(perfil.user_id, cambios)
                actualizado = data.perfil
            }
            if (beneficiosSucios) {
                const { data } = await updateBeneficiosPlanner(perfil.user_id, {
                    free_events: eventosGratis ?? 0,
                    free_flash_events: flashGratis ?? 0,
                    discount_pct: descuento ?? 0,
                })
                onBeneficiosGuardados?.(data.beneficios)
            }
            onGuardado(actualizado)
            message.success('Usuario actualizado')
        } catch (error) {
            message.error(error?.response?.data?.msg || 'No se pudo actualizar el usuario')
            setGuardando(false)
        }
    }

    return (
        <div
            className={styles.editor}
            onKeyDown={e => {
                if (e.key === 'Escape') onCancelar()
                if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !e.target.closest('.ant-select')) guardar()
            }}
        >
            <label className={styles.editorCampo}>
                <span>Nombre</span>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} autoFocus maxLength={120} />
            </label>
            <div className={styles.editorCampo}>
                <span>Rol</span>
                <Select value={rol} onChange={setRol} options={OPCIONES_ROL} popupMatchSelectWidth={false} />
            </div>
            <div className={`${styles.editorCampo} ${styles.editorCorreo}`}>
                <span>Correo</span>
                <span className={styles.editorFijo} title='El correo no se puede cambiar'>
                    <Lock size={12} /> {perfil.user_email}
                </span>
            </div>
            <div className={styles.editorAcciones}>
                <button type='button' className={styles.action} onClick={onCancelar} disabled={guardando}>
                    Cancelar
                </button>
                <button type='button' className={`${styles.action} ${styles.actionPrimaria}`} onClick={guardar} disabled={guardando || !sucio}>
                    {guardando ? 'Guardando…' : 'Guardar'}
                </button>
            </div>
            {esPlanner && (
                <div className={styles.editorBeneficios}>
                    <label className={styles.editorCampo}>
                        <span>Eventos gratis</span>
                        <InputNumber min={0} max={100} precision={0} value={eventosGratis} onChange={setEventosGratis} />
                    </label>
                    <label className={styles.editorCampo}>
                        <span>Flash gratis</span>
                        <InputNumber min={0} max={100} precision={0} value={flashGratis} onChange={setFlashGratis} />
                    </label>
                    <label className={styles.editorCampo}>
                        <span>Descuento</span>
                        <InputNumber min={0} max={90} precision={0} value={descuento} onChange={setDescuento} suffix='%' />
                    </label>
                    <small className={styles.editorBeneficiosNota}>
                        Los eventos gratis son PRO y los Flash son side events sueltos; los dos le aparecen en su página de invitaciones. El descuento aplica en toda compra suya.
                        {usados && ` Ya usó ${usados.gratis} gratis, compró ${usados.compra} y creó ${usados.flash ?? 0} Flash.`}
                    </small>
                </div>
            )}
            {rol === 'sales' && rolOriginal !== 'sales' && (
                <small className={styles.editorNota}>
                    Para que entre a Ventas también debe estar dado de alta como vendedor con este mismo correo.
                </small>
            )}
        </div>
    )
}

// Columnas de cada pantalla de Usuarios (una por rol, ver AdminLayout).
const COLUMNAS = {
    clientes: {
        grid: 'minmax(160px, 1.2fr) minmax(180px, 1.6fr) 80px 110px 110px 80px 190px',
        titulos: ['Nombre', 'Email', 'Eventos', 'Plan', 'Acceso', 'Alta', ''],
    },
    planners: {
        grid: 'minmax(160px, 1.3fr) minmax(180px, 1.5fr) 120px 120px 110px 90px 110px 190px',
        titulos: ['Planner', 'Email', 'Eventos', 'PRO gratis', 'Flash gratis', 'Descuento', 'Acceso', ''],
    },
    admin: {
        grid: 'minmax(160px, 1.3fr) minmax(180px, 1.6fr) 110px minmax(160px, 1.4fr) 60px',
        titulos: ['Nombre', 'Email', 'Acceso', 'Id', ''],
    },
    test: {
        grid: 'minmax(160px, 1.3fr) minmax(180px, 1.6fr) 140px minmax(160px, 1fr) 190px',
        titulos: ['Nombre', 'Email', 'Eventos de prueba', 'Id', ''],
    },
}
COLUMNAS.mkt = COLUMNAS.admin

const CLASE_PLAN = { pro: 'planPro', lite: 'planLite', paperless: 'planPaperless' }
const NOMBRE_PLAN = { pro: 'PRO', lite: 'Lite', paperless: 'Paperless', free: 'Free' }

const fechaCorta = (iso) => (iso ? dayjs(iso).locale('es').format('DD MMM') : '—')

/**
 * Usuarios › {rol}: Clientes, Planners, Administración, Marketing o Pruebas
 * (Vendedores tiene su propia vista). `profiles` llega ya filtrado por rol.
 * Sin filtros: cada rol tiene sus columnas y su acción principal en la topbar.
 */
export const UsuariosSection = ({ rol = 'clientes', profiles, invitations, esPrueba, onOpenNewInvitation, onPerfilActualizado, onUsuarioCreado, query = '' }) => {
    const [editando, setEditando] = useState(null)
    const [proveedores, setProveedores] = useState({})
    const [beneficios, setBeneficios] = useState({ beneficios: {}, usados: {}, listos: false })
    const esPlanners = rol === 'planners'

    const cargarBeneficios = () => fetchBeneficiosPlanners()
        .then(({ data }) => setBeneficios({ beneficios: data.beneficios ?? {}, usados: data.usados ?? {}, listos: true }))
        .catch(error => console.error('No se pudieron cargar los beneficios de planners:', error.response?.data || error.message))

    useEffect(() => {
        fetchProveedores()
            .then(({ data }) => setProveedores(data.proveedores ?? {}))
            .catch(error => console.error('No se pudo cargar cómo entra cada usuario:', error.response?.data || error.message))
        // Administración también tiene beneficios (mismas funciones que un planner).
        if (esPlanners || rol === 'admin') cargarBeneficios()
    }, [rol])

    // Eventos de cada cuenta: como dueño (user_id) y, en planners, también los
    // que organiza (planner_id).
    const eventosPorUsuario = useMemo(() => {
        const mapa = new Map()
        const agregar = (id, inv) => {
            if (!id) return
            if (!mapa.has(id)) mapa.set(id, [])
            if (!mapa.get(id).includes(inv)) mapa.get(id).push(inv)
        }
        ;(invitations ?? []).forEach(inv => {
            agregar(inv.user_id, inv)
            if (esPlanners) agregar(inv.planner_id, inv)
        })
        return mapa
    }, [invitations, esPlanners])

    const copiar = async (texto) => {
        try {
            await navigator.clipboard.writeText(texto)
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err)
        }
    }

    // Los más nuevos primero (profiles.created_at); sin fecha, al final.
    const visibles = useMemo(() => {
        const texto = query.trim().toLowerCase()
        return [...(profiles ?? [])]
            .sort((a, b) => (b.created_at ? Date.parse(b.created_at) : 0) - (a.created_at ? Date.parse(a.created_at) : 0))
            .filter(p => !texto || [p.full_name, p.user_email, p.user_id]
                .some(campo => String(campo ?? '').toLowerCase().includes(texto)))
    }, [profiles, query])

    const botonEvento = (perfil) => (
        <button type='button' className={styles.action} onClick={() => onOpenNewInvitation(perfil)}>
            + Agregar evento
        </button>
    )

    const botonEditar = (perfil) => (
        <button
            type='button'
            className={`${styles.action} ${styles.actionIcono}`}
            aria-label={`Editar a ${perfil.full_name || perfil.user_email}`}
            title={esPlanners ? 'Editar nombre, rol y beneficios' : 'Editar nombre y rol'}
            onClick={() => setEditando(perfil.user_id)}
        >
            <Pencil size={12} />
        </button>
    )

    const editor = (perfil) => (
        <EditorPerfil
            // Se vuelve a montar cuando llegan los beneficios: sus campos
            // toman el valor real en vez del 0 inicial.
            key={`${perfil.user_id}-${beneficios.listos}`}
            perfil={perfil}
            beneficios={beneficios.beneficios[perfil.user_id]}
            beneficiosListos={beneficios.listos}
            usados={beneficios.usados[perfil.user_id]}
            onBeneficiosGuardados={b => setBeneficios(prev => ({ ...prev, beneficios: { ...prev.beneficios, [b.planner_id]: b } }))}
            onCancelar={() => setEditando(null)}
            onGuardado={actualizado => {
                onPerfilActualizado?.(actualizado)
                setEditando(null)
            }}
        />
    )

    const idCopiable = (perfil) => (
        <button
            type='button'
            className={styles.id}
            title={`${perfil.user_id} — clic para copiar`}
            onClick={() => copiar(perfil.user_id)}
        >
            {perfil.user_id}
        </button>
    )

    // "1 de 2" + "1 libre" en ámbar si le quedan sin usar.
    const celdaBeneficio = (usados, libres) => {
        const asignados = usados + libres
        if (!asignados) return <span className={styles.celdaTenue}>—</span>
        return (
            <span className={styles.beneficio}>
                {usados} de {asignados}
                {libres > 0 && <span className={styles.libre}>{libres} libre{libres === 1 ? '' : 's'}</span>}
            </span>
        )
    }

    const celdaPlan = (eventos) => {
        // El plan de su evento más reciente.
        const ultimo = [...eventos].sort((a, b) => Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0))[0]
        if (!ultimo?.plan) return <span className={`${styles.plan} ${styles.planNinguno}`}>—</span>
        const clave = String(ultimo.plan).toLowerCase()
        const clase = CLASE_PLAN[clave] ?? 'planNinguno'
        return <span className={`${styles.plan} ${styles[clase]}`}>{NOMBRE_PLAN[clave] ?? ultimo.plan}</span>
    }

    const celdas = (perfil) => {
        const eventos = eventosPorUsuario.get(perfil.user_id) ?? []
        const nombre = <span className={`${styles.cell} ${styles.name}`}>{perfil.full_name || 'Sin nombre'}</span>
        const correo = <span className={`${styles.cell} ${styles.email}`}>{perfil.user_email}</span>
        const acceso = <span className={styles.cell}><Acceso lista={proveedores[perfil.user_id]} /></span>
        const id = <span className={styles.cell}>{idCopiable(perfil)}</span>

        if (rol === 'clientes') return [
            nombre, correo,
            <span key='ev' className={styles.cell}>{eventos.length}</span>,
            <span key='plan' className={styles.cell}>{celdaPlan(eventos)}</span>,
            acceso,
            <span key='alta' className={`${styles.cell} ${styles.celdaTenue}`}>{fechaCorta(perfil.created_at)}</span>,
            <span key='acc' className={`${styles.cell} ${styles.acciones}`}>{botonEditar(perfil)}{botonEvento(perfil)}</span>,
        ]
        if (rol === 'planners') {
            const b = beneficios.beneficios[perfil.user_id]
            const u = beneficios.usados[perfil.user_id] ?? {}
            // Sin los de prueba (is_test, como su invitación de ejemplo, o de
            // dueños de casa): solo los eventos reales del planner.
            const reales = esPrueba ? eventos.filter(i => !esPrueba(i)) : eventos
            const activos = reales.filter(i => esEventoActivo(i)).length
            return [
                nombre, correo,
                <span key='ev' className={styles.cell}>
                    <span className={styles.beneficio}>
                        {activos} {activos === 1 ? 'activo' : 'activos'}
                        <span className={styles.celdaTenue}>/ {reales.length}</span>
                    </span>
                </span>,
                <span key='pro' className={styles.cell}>{celdaBeneficio(u.gratis ?? 0, b?.free_events ?? 0)}</span>,
                <span key='flash' className={styles.cell}>{celdaBeneficio(u.flash_gratis ?? 0, b?.free_flash_events ?? 0)}</span>,
                <span key='desc' className={styles.cell}>
                    {b?.discount_pct ? `${b.discount_pct}%` : <span className={styles.celdaTenue}>—</span>}
                </span>,
                acceso,
                <span key='acc' className={`${styles.cell} ${styles.acciones}`}>{botonEditar(perfil)}{botonEvento(perfil)}</span>,
            ]
        }
        if (rol === 'test') return [
            nombre, correo,
            <span key='ev' className={styles.cell}>{eventos.length}</span>,
            id,
            <span key='acc' className={`${styles.cell} ${styles.acciones}`}>{botonEditar(perfil)}{botonEvento(perfil)}</span>,
        ]
        return [
            nombre, correo, acceso, id,
            <span key='acc' className={`${styles.cell} ${styles.acciones}`}>{botonEditar(perfil)}</span>,
        ]
    }

    const columnas = COLUMNAS[rol] ?? COLUMNAS.admin

    return (
        <div className={styles.usuarios}>
            {esPlanners && (
                <EnTopbarAccion>
                    <NuevoPlanner
                        renderBoton={(abrir) => <AccionTopbar onClick={abrir}>Nuevo planner</AccionTopbar>}
                        onCreado={() => {
                            onUsuarioCreado?.()
                            // El nuevo planner trae beneficios: se vuelven a pedir.
                            cargarBeneficios()
                        }}
                    />
                </EnTopbarAccion>
            )}

            <div className={styles.card}>
                {profiles === null || profiles === undefined ? (
                    <div className={styles.empty}>Cargando…</div>
                ) : visibles.length === 0 ? (
                    <div className={styles.empty}>{query.trim() ? 'No hay usuarios que coincidan.' : 'Todavía no hay cuentas con este rol.'}</div>
                ) : (
                    <>
                        <div className={styles.scroller}>
                            <div className={styles.table}>
                                <div className={`${styles.row} ${styles.head}`} style={{ gridTemplateColumns: columnas.grid }}>
                                    {columnas.titulos.map((t, i) => <span key={i} className={styles.cell}>{t}</span>)}
                                </div>

                                {visibles.map(perfil => editando === perfil.user_id ? (
                                    <div className={`${styles.row} ${styles.rowEditando}`} key={perfil.user_id}>
                                        {editor(perfil)}
                                    </div>
                                ) : (
                                    <div className={styles.row} key={perfil.user_id} style={{ gridTemplateColumns: columnas.grid }}>
                                        {celdas(perfil).map((celda, i) => <span key={i} style={{ display: 'contents' }}>{celda}</span>)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.mobileList}>
                            {visibles.map(perfil => editando === perfil.user_id ? (
                                <div className={styles.mobileRow} key={perfil.user_id}>
                                    {editor(perfil)}
                                </div>
                            ) : (
                                <div className={styles.mobileRow} key={perfil.user_id}>
                                    <div className={styles.mobileTop}>
                                        <span className={styles.mobileName}>{perfil.full_name || 'Sin nombre'}</span>
                                    </div>
                                    <div className={styles.mobileEmail}>{perfil.user_email}</div>
                                    <Acceso lista={proveedores[perfil.user_id]} />
                                    <div className={styles.mobileBottom}>
                                        {botonEditar(perfil)}
                                        {rol !== 'admin' && rol !== 'mkt' && botonEvento(perfil)}
                                        <button
                                            type='button'
                                            className={styles.id}
                                            style={{ width: 'auto' }}
                                            onClick={() => copiar(perfil.user_id)}
                                        >
                                            copiar id
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
