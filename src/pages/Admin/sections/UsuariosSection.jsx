import { useMemo, useState } from 'react'
import { message } from 'antd'
import styles from './UsuariosSection.module.css'

// El rol vive crudo en `profiles.role`; todo lo demás (etiqueta, color, orden del
// filtro) se deriva de aquí para no repetir el mapeo en cada vista.
const ROLES = {
    Administration: { label: 'Administración', clase: 'roleAdmin' },
    sales: { label: 'Vendedor', clase: 'roleVendedor' },
    test: { label: 'Pruebas', clase: 'rolePruebas' },
}

const ROL_CLIENTE = { label: 'Cliente', clase: 'roleCliente' }

const rolDe = (role) => ROLES[role] ?? ROL_CLIENTE

const FILTROS = [
    { key: 'todos', label: 'Todos' },
    { key: 'Administration', label: 'Administración' },
    { key: 'sales', label: 'Vendedor' },
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

export const UsuariosSection = ({ profiles, onOpenNewInvitation, query = '' }) => {
    const [filtro, setFiltro] = useState('todos')

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

                                {visibles.map(perfil => (
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
                                        <span className={styles.cell}>{botonEvento(perfil)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.mobileList}>
                            {visibles.map(perfil => (
                                <div className={styles.mobileRow} key={perfil.user_id}>
                                    <div className={styles.mobileTop}>
                                        <span className={styles.mobileName}>{perfil.full_name || 'Sin nombre'}</span>
                                        {badgeRol(perfil)}
                                    </div>
                                    <div className={styles.mobileEmail}>{perfil.user_email}</div>
                                    <div className={styles.mobileBottom}>
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
