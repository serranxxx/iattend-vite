/*
  Vendedores, con el mismo formato de tabla que Eventos y Ventas.

  Vivía dentro de `SalesAdminPage` como una rama de `forcedView`, arrastrando
  consigo todo el panel viejo de ventas. Aquí solo está lo que esta vista ocupa:
  la lista, el alta y la edición.

  El PIN no se edita: es también la contraseña de la cuenta i attend del
  vendedor, así que regenerarlo desde aquí lo dejaría fuera sin avisarle.

  Pops gratis: van a su cuenta i attend (`user_id`, que el backend encuentra
  por su correo) en `planner_benefits.free_flash_events`, igual que a un
  cliente; los usa desde su página de invitaciones. Sin cuenta, no hay dónde.
*/

import { useEffect, useState } from 'react'
import { Checkbox, Form, Input, InputNumber, Select, Switch, message } from 'antd'
import { Copy, Pencil, Plus } from 'lucide-react'
import { AdminModal } from '../AdminModal'
import { AccionTopbar, EnTopbarAccion } from '../AdminTopbar'
import { createAdminVendedor, fetchAdminVendedores, updateAdminVendedor } from '../salesAdminApi'
import { fetchBeneficiosPlanners, updateBeneficiosPlanner } from '../usuariosAdminApi'
import estilosUsuarios from './UsuariosSection.module.css'
import styles from './VentasSection.module.css'

const TIPOS = [
    { value: 'interno', label: 'Interno' },
    { value: 'externo', label: 'Externo' },
]

// altaInicial: datos de una solicitud aceptada (Solicitudes → "Dar de alta"):
// abre el alta ya llenada. onAltaUsada avisa que ya se tomó.
export const VendedoresSection = ({ altaInicial = null, onAltaUsada }) => {
    const [vendedores, setVendedores] = useState(null)
    // `editando` guarda el vendedor en edición, o `'nuevo'` cuando es un alta.
    const [editando, setEditando] = useState(null)
    const [guardando, setGuardando] = useState(false)
    // Resultado del alta: el PIN solo se puede copiar en este momento.
    const [recienCreado, setRecienCreado] = useState(null)
    // Pops gratis por cuenta: asignados libres y los que ya usó.
    const [beneficios, setBeneficios] = useState({ beneficios: {}, usados: {}, listos: false })
    const [form] = Form.useForm()

    const cargarBeneficios = () => fetchBeneficiosPlanners()
        .then(({ data }) => setBeneficios({ beneficios: data.beneficios ?? {}, usados: data.usados ?? {}, listos: true }))
        .catch(error => console.error('No se pudieron cargar los Pops gratis:', error.response?.data || error.message))

    const cargar = async () => {
        try {
            const { data } = await fetchAdminVendedores()
            setVendedores(data?.vendedores ?? [])
        } catch (error) {
            console.error('Error al cargar vendedores:', error)
            message.error(error.response?.data?.msg || 'No se pudieron cargar los vendedores')
            setVendedores([])
        }
    }

    useEffect(() => { cargar(); cargarBeneficios() }, [])

    useEffect(() => {
        if (!altaInicial) return
        form.setFieldsValue({
            nombre: altaInicial.nombre ?? '', tipo: 'externo', telefono: altaInicial.telefono ?? '',
            email: altaInicial.email ?? '', descuento_max_pct: 0, crear_cuenta: !!altaInicial.email,
        })
        setEditando('nuevo')
        onAltaUsada?.()
    }, [altaInicial])

    const abrirAlta = () => {
        form.setFieldsValue({
            nombre: '', tipo: 'externo', telefono: '', email: '',
            descuento_max_pct: 0, crear_cuenta: false,
        })
        setEditando('nuevo')
    }

    const abrirEdicion = (vendedor) => {
        form.setFieldsValue({
            nombre: vendedor.nombre,
            tipo: vendedor.tipo,
            telefono: vendedor.telefono ?? '',
            email: vendedor.email ?? '',
            descuento_max_pct: vendedor.descuento_max_pct,
            activo: vendedor.activo,
            pops_gratis: beneficios.beneficios[vendedor.user_id]?.free_flash_events ?? 0,
        })
        setEditando(vendedor)
    }

    const esAlta = editando === 'nuevo'

    const guardar = async () => {
        const valores = await form.validateFields()
        setGuardando(true)

        try {
            const { pops_gratis: popsGratis, ...datos } = valores
            if (esAlta) {
                const { data } = await createAdminVendedor(datos)
                setRecienCreado(data)
            } else {
                await updateAdminVendedor(editando.id, datos)
                // Hasta que carguen los beneficios el campo arranca en 0:
                // guardar ahí los borraría.
                const actuales = beneficios.beneficios[editando.user_id]
                if (editando.user_id && beneficios.listos && (popsGratis ?? 0) !== (actuales?.free_flash_events ?? 0)) {
                    // Si su cuenta también es de planner, sus otros beneficios
                    // se mandan como están para no borrarlos.
                    await updateBeneficiosPlanner(editando.user_id, {
                        free_events: actuales?.free_events ?? 0,
                        discount_pct: actuales?.discount_pct ?? 0,
                        free_flash_events: popsGratis ?? 0,
                    })
                    cargarBeneficios()
                }
                message.success('Vendedor actualizado')
            }

            setEditando(null)
            cargar()
        } catch (error) {
            message.error(error.response?.data?.msg
                || (esAlta ? 'No se pudo crear el vendedor' : 'No se pudo actualizar'))
        } finally {
            setGuardando(false)
        }
    }

    const celdaPops = (vendedor) => {
        if (!vendedor.user_id) return <span className={styles.celdaTenue} title='Sin cuenta i attend con su correo'>—</span>
        const usados = beneficios.usados[vendedor.user_id]?.pop_gratis ?? 0
        const libres = beneficios.beneficios[vendedor.user_id]?.free_flash_events ?? 0
        if (!usados && !libres) return <span className={styles.celdaTenue}>0</span>
        return (
            <span className={estilosUsuarios.beneficio}>
                {usados} de {usados + libres}
                {libres > 0 && <span className={estilosUsuarios.libre}>{libres} libre{libres === 1 ? '' : 's'}</span>}
            </span>
        )
    }

    const copiar = (texto, aviso) => {
        navigator.clipboard.writeText(texto ?? '')
            .then(() => message.success(aviso))
            .catch(error => console.error('Error al copiar:', error))
    }

    return (
        <div className={styles.tableCard}>
            <div className={styles.tableHead}>
                <span className={styles.tableTitle}>
                    Vendedores {vendedores ? `(${vendedores.length})` : ''}
                </span>
                {/* El alta es la acción principal de Usuarios › Vendedores (topbar). */}
                <EnTopbarAccion>
                    <AccionTopbar onClick={abrirAlta}>Nuevo vendedor</AccionTopbar>
                </EnTopbarAccion>
            </div>

            {vendedores === null ? (
                <div className={styles.empty}>Cargando vendedores…</div>
            ) : vendedores.length === 0 ? (
                <div className={styles.empty}>Todavía no hay vendedores dados de alta.</div>
            ) : (
                <div className={styles.scroller}>
                    <div className={`${styles.table} ${styles.tablaVendedores}`}>
                        <div className={`${styles.row} ${styles.rowHead}`}>
                            <span className={styles.cell}>Nombre</span>
                            <span className={styles.cell}>Tipo</span>
                            <span className={styles.cell}>Teléfono</span>
                            <span className={styles.cell}>Correo</span>
                            <span className={`${styles.cell} ${styles.cellNum}`}>Desc. máx.</span>
                            <span className={styles.cell}>Pops gratis</span>
                            <span className={styles.cell}>PIN de acceso</span>
                            <span className={styles.cell}>Estado</span>
                            <span className={styles.cell} />
                        </div>

                        {vendedores.map(vendedor => (
                            <div className={styles.row} key={vendedor.id}>
                                <span className={`${styles.cell} ${styles.evento}`}>{vendedor.nombre}</span>

                                <span className={styles.cell}>
                                    <span className={`${styles.etiqueta} ${styles.etiquetaMorada}`}>
                                        {vendedor.tipo}
                                    </span>
                                </span>

                                <span className={`${styles.cell} ${styles.celdaTenue}`}>
                                    {vendedor.telefono || '—'}
                                </span>

                                <span className={`${styles.cell} ${styles.celdaTenue}`}>
                                    {vendedor.email || '—'}
                                </span>

                                <span className={`${styles.cell} ${styles.cellNum}`}>
                                    {vendedor.descuento_max_pct}%
                                </span>

                                <span className={styles.cell}>{celdaPops(vendedor)}</span>

                                <span className={styles.cell}>
                                    <button
                                        type='button'
                                        className={styles.pin}
                                        onClick={() => copiar(vendedor.codigo_acceso, 'PIN copiado')}
                                        title='Copiar PIN'
                                    >
                                        {vendedor.codigo_acceso}
                                        <Copy size={12} />
                                    </button>
                                </span>

                                <span className={styles.cell}>
                                    <span className={`${styles.etiqueta} ${vendedor.activo ? styles.etiquetaVerde : styles.etiquetaApagada}`}>
                                        {vendedor.activo ? 'activo' : 'inactivo'}
                                    </span>
                                </span>

                                <span className={styles.cell}>
                                    <button
                                        type='button'
                                        aria-label={`Editar a ${vendedor.nombre}`}
                                        className={styles.iconBtn}
                                        onClick={() => abrirEdicion(vendedor)}
                                    >
                                        <Pencil size={14} />
                                    </button>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <AdminModal
                open={Boolean(editando)}
                title={esAlta ? 'Agregar vendedor' : `Editar a ${editando?.nombre ?? ''}`}
                onClose={() => setEditando(null)}
                onConfirm={guardar}
                confirmLabel={esAlta ? 'Crear' : 'Guardar'}
                loading={guardando}
                width={400}
            >
                <Form form={form} layout='vertical'>
                    <Form.Item name='nombre' label='Nombre' rules={[{ required: true, message: 'El nombre es obligatorio' }]}>
                        <Input placeholder='Nombre del vendedor' />
                    </Form.Item>

                    <Form.Item name='tipo' label='Tipo' rules={[{ required: true }]}>
                        <Select options={TIPOS} />
                    </Form.Item>

                    <Form.Item name='telefono' label='Teléfono'>
                        <Input placeholder='+52…' />
                    </Form.Item>

                    <Form.Item
                        name='email'
                        label='Correo'
                        dependencies={['crear_cuenta']}
                        rules={[({ getFieldValue }) => ({
                            required: Boolean(getFieldValue('crear_cuenta')),
                            message: 'El correo es requerido para crear la cuenta i attend',
                        })]}
                    >
                        <Input placeholder='correo@ejemplo.com' />
                    </Form.Item>

                    <Form.Item name='descuento_max_pct' label='Descuento máximo (%)'>
                        <InputNumber min={0} max={100} style={{ width: '100%' }} />
                    </Form.Item>

                    {esAlta ? (
                        <Form.Item name='crear_cuenta' valuePropName='checked'>
                            <Checkbox>Crear cuenta i attend</Checkbox>
                        </Form.Item>
                    ) : (
                        <>
                            {editando?.user_id ? (
                                <Form.Item
                                    name='pops_gratis'
                                    label='Pops gratis'
                                    extra={`Le aparecen en su página de invitaciones para crear Pops sin pagar.${beneficios.usados[editando.user_id]?.pop_gratis ? ` Ya usó ${beneficios.usados[editando.user_id].pop_gratis}.` : ''}`}
                                >
                                    <InputNumber min={0} max={100} precision={0} style={{ width: '100%' }} disabled={!beneficios.listos} />
                                </Form.Item>
                            ) : (
                                <p className={styles.celdaTenue} style={{ margin: '0 0 16px', fontSize: 12 }}>
                                    Para darle Pops gratis necesita una cuenta i attend con este correo.
                                </p>
                            )}
                            <Form.Item name='activo' label='Activo' valuePropName='checked'>
                                <Switch />
                            </Form.Item>
                        </>
                    )}
                </Form>
            </AdminModal>

            <AdminModal
                open={Boolean(recienCreado)}
                title='Vendedor creado'
                onClose={() => setRecienCreado(null)}
                width={360}
            >
                <div className={styles.altaResultado}>
                    <span className={styles.altaNombre}>{recienCreado?.vendedor?.nombre}</span>
                    <span className={styles.altaLabel}>PIN de acceso</span>
                    <span className={styles.altaPin}>{recienCreado?.vendedor?.codigo_acceso}</span>

                    <button
                        type='button'
                        className={styles.outlineBtn}
                        onClick={() => copiar(recienCreado?.vendedor?.codigo_acceso, 'PIN copiado')}
                    >
                        <Copy size={14} /> Copiar PIN
                    </button>

                    {recienCreado?.cuenta_creada && (
                        <span className={styles.altaOk}>
                            Cuenta i attend creada — el PIN es también su contraseña
                        </span>
                    )}

                    {recienCreado?.cuenta_error && (
                        <span className={styles.altaError}>
                            No se pudo crear la cuenta: {recienCreado.cuenta_error}
                        </span>
                    )}
                </div>
            </AdminModal>
        </div>
    )
}
