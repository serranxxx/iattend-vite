import { useEffect, useMemo, useState } from 'react'
import { Input, InputNumber, Select, Tooltip, message } from 'antd'
import { Lock, Mail, Pencil } from 'lucide-react'
import { FcGoogle } from 'react-icons/fc'
import { FaApple } from 'react-icons/fa'
import { fetchBeneficiosPlanners, fetchProveedores, updateBeneficiosPlanner, updateUsuario } from '../usuariosAdminApi'
import { esRolPlanner } from '../../../helpers/roles'
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

const rolDe = (role) => ROLES[role] ?? ROL_CLIENTE

const FILTROS = [
    { key: 'todos', label: 'Todos' },
    { key: 'Administration', label: 'Administración' },
    { key: 'sales', label: 'Vendedor' },
    { key: 'planner', label: 'Planner' },
    { key: 'mkt', label: 'Marketing' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'test', label: 'Pruebas' },
]

// 'cliente' no es un valor guardado: es "cualquier rol que no sea uno de los
// conocidos", que es justo como lo pinta la tabla.
const coincideFiltro = (perfil, filtro) => {
    if (filtro === 'todos') return true
    if (filtro === 'cliente') return !ROLES[perfil.role]
    return perfil.role === filtro
}

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

export const UsuariosSection = ({ profiles, onOpenNewInvitation, onPerfilActualizado, onUsuarioCreado, query = '' }) => {
    const [filtro, setFiltro] = useState('todos')
    const [editando, setEditando] = useState(null)
    const [proveedores, setProveedores] = useState({})
    const [beneficios, setBeneficios] = useState({ beneficios: {}, usados: {}, listos: false })

    useEffect(() => {
        fetchProveedores()
            .then(({ data }) => setProveedores(data.proveedores ?? {}))
            .catch(error => console.error('No se pudo cargar cómo entra cada usuario:', error.response?.data || error.message))
        fetchBeneficiosPlanners()
            .then(({ data }) => setBeneficios({ beneficios: data.beneficios ?? {}, usados: data.usados ?? {}, listos: true }))
            .catch(error => console.error('No se pudieron cargar los beneficios de planners:', error.response?.data || error.message))
    }, [])

    const copiar = async (texto) => {
        try {
            await navigator.clipboard.writeText(texto)
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err)
        }
    }

    // Los más nuevos primero (profiles.created_at); sin fecha, al final.
    const ordenados = useMemo(() => [...(profiles ?? [])].sort((a, b) =>
        (b.created_at ? Date.parse(b.created_at) : 0) - (a.created_at ? Date.parse(a.created_at) : 0)
    ), [profiles])

    const buscados = useMemo(() => {
        const texto = query.trim().toLowerCase()
        if (!texto) return ordenados

        return ordenados.filter(p =>
            [p.full_name, p.user_email, p.user_id]
                .some(campo => String(campo ?? '').toLowerCase().includes(texto))
        )
    }, [ordenados, query])

    const conteos = useMemo(() => (
        FILTROS.reduce((acc, { key }) => {
            acc[key] = buscados.filter(p => coincideFiltro(p, key)).length
            return acc
        }, {})
    ), [buscados])

    const visibles = useMemo(
        () => buscados.filter(p => coincideFiltro(p, filtro)),
        [buscados, filtro]
    )

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
            title='Editar nombre, rol y beneficios'
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

    // En planners, sus beneficios junto al rol: "2 gratis · 15%".
    const badgeRol = (perfil) => {
        const rol = rolDe(perfil.role)
        const b = esRolPlanner(perfil.role) ? beneficios.beneficios[perfil.user_id] : null
        const extras = [
            b?.free_events ? `${b.free_events} gratis` : null,
            b?.free_flash_events ? `${b.free_flash_events} flash` : null,
            b?.discount_pct ? `${b.discount_pct}%` : null,
        ].filter(Boolean).join(' · ')
        return (
            <span className={styles.rolCelda}>
                <span className={`${styles.role} ${styles[rol.clase]}`}>{rol.label}</span>
                {extras && <span className={styles.beneficios}>{extras}</span>}
            </span>
        )
    }

    return (
        <div className={styles.usuarios}>
            <div className={styles.toolbar}>
                <div className={styles.tabs}>
                    {FILTROS
                        // Ocultar un rol sin nadie evita pills vacías (ej. "Pruebas 0").
                        .filter(({ key }) => key === 'todos' || conteos[key] > 0)
                        .map(({ key, label }) => (
                            <button
                                key={key}
                                type='button'
                                className={`${styles.tab} ${filtro === key ? styles.tabActive : ''}`}
                                onClick={() => setFiltro(key)}
                            >
                                {label} {conteos[key]}
                            </button>
                        ))}
                </div>
                <NuevoPlanner onCreado={() => {
                    onUsuarioCreado?.()
                    // El nuevo planner trae beneficios: se vuelven a pedir.
                    fetchBeneficiosPlanners()
                        .then(({ data }) => setBeneficios({ beneficios: data.beneficios ?? {}, usados: data.usados ?? {} }))
                        .catch(() => {})
                }} />
            </div>

            <div className={styles.card}>
                {visibles.length === 0 ? (
                    <div className={styles.empty}>No hay usuarios que coincidan.</div>
                ) : (
                    <>
                        <div className={styles.scroller}>
                            <div className={styles.table}>
                                <div className={`${styles.row} ${styles.head}`}>
                                    <span className={styles.cell}>Nombre</span>
                                    <span className={styles.cell}>Email</span>
                                    <span className={styles.cell}>Rol</span>
                                    <span className={styles.cell}>Acceso</span>
                                    <span className={styles.cell}>Id</span>
                                    <span className={styles.cell} />
                                </div>

                                {visibles.map(perfil => editando === perfil.user_id ? (
                                    <div className={`${styles.row} ${styles.rowEditando}`} key={perfil.user_id}>
                                        {editor(perfil)}
                                    </div>
                                ) : (
                                    <div className={styles.row} key={perfil.user_id}>
                                        <span className={`${styles.cell} ${styles.name}`}>
                                            {perfil.full_name || 'Sin nombre'}
                                        </span>
                                        <span className={`${styles.cell} ${styles.email}`}>{perfil.user_email}</span>
                                        <span className={styles.cell}>{badgeRol(perfil)}</span>
                                        <span className={styles.cell}><Acceso lista={proveedores[perfil.user_id]} /></span>
                                        <span className={styles.cell}>
                                            <button
                                                type='button'
                                                className={styles.id}
                                                title={`${perfil.user_id} — clic para copiar`}
                                                onClick={() => copiar(perfil.user_id)}
                                            >
                                                {perfil.user_id}
                                            </button>
                                        </span>
                                        <span className={`${styles.cell} ${styles.acciones}`}>
                                            {botonEditar(perfil)}
                                            {botonEvento(perfil)}
                                        </span>
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
                                        {badgeRol(perfil)}
                                    </div>
                                    <div className={styles.mobileEmail}>{perfil.user_email}</div>
                                    <Acceso lista={proveedores[perfil.user_id]} />
                                    <div className={styles.mobileBottom}>
                                        {botonEditar(perfil)}
                                        {botonEvento(perfil)}
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
