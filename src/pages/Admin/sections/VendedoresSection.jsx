/*
  Vendedores, con el mismo formato de tabla que Eventos y Ventas.

  Vivía dentro de `SalesAdminPage` como una rama de `forcedView`, arrastrando
  consigo todo el panel viejo de ventas. Aquí solo está lo que esta vista ocupa:
  la lista, el alta y la edición.

  El PIN no se edita: es también la contraseña de la cuenta i attend del
  vendedor, así que regenerarlo desde aquí lo dejaría fuera sin avisarle.
*/

import { useEffect, useState } from 'react'
import { Checkbox, Form, Input, InputNumber, Select, Switch, message } from 'antd'
import { Copy, Pencil, Plus } from 'lucide-react'
import { AdminModal } from '../AdminModal'
import { createAdminVendedor, fetchAdminVendedores, updateAdminVendedor } from '../salesAdminApi'
import styles from './VentasSection.module.css'

const TIPOS = [
    { value: 'interno', label: 'Interno' },
    { value: 'externo', label: 'Externo' },
]

export const VendedoresSection = () => {
    const [vendedores, setVendedores] = useState(null)
    // `editando` guarda el vendedor en edición, o `'nuevo'` cuando es un alta.
    const [editando, setEditando] = useState(null)
    const [guardando, setGuardando] = useState(false)
    // Resultado del alta: el PIN solo se puede copiar en este momento.
    const [recienCreado, setRecienCreado] = useState(null)
    const [form] = Form.useForm()

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

    useEffect(() => { cargar() }, [])

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
        })
        setEditando(vendedor)
    }

    const esAlta = editando === 'nuevo'

    const guardar = async () => {
        const valores = await form.validateFields()
        setGuardando(true)

        try {
            if (esAlta) {
                const { data } = await createAdminVendedor(valores)
                setRecienCreado(data)
            } else {
                await updateAdminVendedor(editando.id, valores)
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
                <button type='button' className={styles.outlineBtn} onClick={abrirAlta}>
                    <Plus size={14} /> Agregar vendedor
                </button>
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
                        <Form.Item name='activo' label='Activo' valuePropName='checked'>
                            <Switch />
                        </Form.Item>
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
