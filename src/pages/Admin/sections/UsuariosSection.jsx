import { useMemo, useState } from 'react'
import { Input, Select, message } from 'antd'
import { Lock, Pencil } from 'lucide-react'
import { updateUsuario } from '../usuariosAdminApi'
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

// '' en el Select = Cliente (role null en la base).
const OPCIONES_ROL = [
    { value: '', label: ROL_CLIENTE.label },
    ...Object.entries(ROLES).map(([value, { label }]) => ({ value, label })),
]

// Edición en línea: ocupa el lugar de la fila (en la tabla y en la lista de
// celular). El correo se muestra pero no se edita: es el login de la cuenta.
const EditorPerfil = ({ perfil, onCancelar, onGuardado }) => {
    const [nombre, setNombre] = useState(perfil.full_name ?? '')
    const [rol, setRol] = useState(ROLES[perfil.role] ? perfil.role : '')
    const [guardando, setGuardando] = useState(false)

    const rolOriginal = ROLES[perfil.role] ? perfil.role : ''
    const cambios = {}
    if (nombre.trim() !== (perfil.full_name ?? '')) cambios.full_name = nombre
    if (rol !== rolOriginal) cambios.role = rol || null
    const sucio = Object.keys(cambios).length > 0

    const guardar = async () => {
        if (!nombre.trim()) return message.warning('El nombre es requerido')
        if (!sucio) return onCancelar()
        setGuardando(true)
        try {
            const { data } = await updateUsuario(perfil.user_id, cambios)
            onGuardado(data.perfil)
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
            {rol === 'sales' && rolOriginal !== 'sales' && (
                <small className={styles.editorNota}>
                    Para que entre a Ventas también debe estar dado de alta como vendedor con este mismo correo.
                </small>
            )}
        </div>
    )
}

export const UsuariosSection = ({ profiles, onOpenNewInvitation, onPerfilActualizado, query = '' }) => {
    const [filtro, setFiltro] = useState('todos')
    const [editando, setEditando] = useState(null)

    const copiar = async (texto) => {
        try {
            await navigator.clipboard.writeText(texto)
            message.success('Copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err)
        }
    }

    const buscados = useMemo(() => {
        const texto = query.trim().toLowerCase()
        if (!texto) return profiles ?? []

        return (profiles ?? []).filter(p =>
            [p.full_name, p.user_email, p.user_id]
                .some(campo => String(campo ?? '').toLowerCase().includes(texto))
        )
    }, [profiles, query])

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
            title='Editar nombre y rol'
            onClick={() => setEditando(perfil.user_id)}
        >
            <Pencil size={12} />
        </button>
    )

    const editor = (perfil) => (
        <EditorPerfil
            perfil={perfil}
            onCancelar={() => setEditando(null)}
            onGuardado={actualizado => {
                onPerfilActualizado?.(actualizado)
                setEditando(null)
            }}
        />
    )

    const badgeRol = (perfil) => {
        const rol = rolDe(perfil.role)
        return <span className={`${styles.role} ${styles[rol.clase]}`}>{rol.label}</span>
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
