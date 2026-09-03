import { useEffect, useMemo, useState } from 'react'
import { Button, Dropdown, Segmented, Table, Tag, Tooltip, Tabs, message } from 'antd'
import { ArrowRight, FlaskConical, MoreVertical, Sparkles, Users } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { fetchAdminFonts, updateAdminFont } from '../fontsAdminApi'
import { CatalogoInvitaciones } from '../CatalogoInvitaciones/CatalogoInvitaciones'
import styles from '../SalesAdminPage.module.css'
import catalogoStyles from '../CatalogoInvitaciones/CatalogoInvitaciones.module.css'

const SUBTAB_KEYS = ['texturas', 'fonts', 'catalogo']

const CATALOGO_TIPOS = [
    { label: 'Clientes', value: 'reales', icon: <Users size={14} /> },
    { label: 'Tests', value: 'pruebas', icon: <FlaskConical size={14} /> },
]

export const HerramientasSection = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const initialSubtab = SUBTAB_KEYS.includes(searchParams.get('subtab')) ? searchParams.get('subtab') : 'texturas'

    const [textures, setTextures] = useState([])
    const [fonts, setFonts] = useState([])
    const [fontsLoading, setFontsLoading] = useState(false)
    const [activeKey, setActiveKey] = useState(initialSubtab)
    const [catalogoTipo, setCatalogoTipo] = useState('reales')

    const handleTabChange = (key) => {
        setActiveKey(key)
        searchParams.set('subtab', key)
        setSearchParams(searchParams, { replace: true })
    }

    const getTexturesAdmin = async () => {
        const { data, error } = await supabase
            .from('textures')
            .select('*')
            .order('sort_order');
        if (error) console.error('Error al obtener texturas:', error);
        else setTextures(data);
    };

    const getFontsAdmin = async () => {
        setFontsLoading(true)
        try {
            const { data } = await fetchAdminFonts()
            setFonts(data.fonts || [])
        } catch (error) {
            console.error('Error al obtener fonts:', error)
            message.error('No se pudieron cargar las fonts')
        } finally {
            setFontsLoading(false)
        }
    }

    useEffect(() => {
        getTexturesAdmin()
        getFontsAdmin()
    }, [])

    const toggleFontActive = async (font) => {
        try {
            const { data } = await updateAdminFont(font.id, { active: !font.active })
            setFonts(prev => prev.map(f => f.id === font.id ? data.font : f))
            message.success(font.active ? 'Font desactivada' : 'Font activada')
        } catch (error) {
            message.error(error?.response?.data?.msg || 'No se pudo actualizar la font')
        }
    }

    const fontColumns = [
        {
            title: 'Nombre', dataIndex: 'family', key: 'family',
            render: (family) => <span style={{ fontFamily: `"${family}"`, fontSize: '15px' }}>{family}</span>,
        },
        {
            title: 'Categoría', dataIndex: 'category', key: 'category',
            render: (category) => category ? <Tag>{category}</Tag> : '—',
        },
        {
            title: 'Origen', dataIndex: 'source', key: 'source',
            render: (source) => {
                const label = source === 'self_hosted' ? 'self-hosted' : source === 'system' ? 'sistema' : 'Google Fonts'
                return <Tag color={source && source !== 'google_fonts' ? 'purple' : 'default'}>{label}</Tag>
            },
        },
        {
            title: 'Estado', dataIndex: 'active', key: 'active', align: 'center',
            render: (active) => <Tag color={active ? 'success' : 'default'}>{active ? 'activa' : 'inactiva'}</Tag>,
        },
        {
            title: 'Uso', dataIndex: 'invitation_count', key: 'invitation_count', align: 'center',
            sorter: (a, b) => a.invitation_count - b.invitation_count,
            render: (count, record) => {
                if (!count) return <Tag>sin uso</Tag>
                return (
                    <Dropdown
                        trigger={['click']}
                        placement='bottomRight'
                        popupRender={() => (
                            <div style={{
                                backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)',
                                padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px',
                                minWidth: '260px', maxHeight: '260px', overflowY: 'auto',
                            }}>
                                {(record.invitations || []).map((inv) => (
                                    <div key={inv.id} style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span className={styles.tableLabel} style={{ marginBottom: 0 }}>{inv.label}</span>
                                        <span className={styles.filterLabel} style={{ marginBottom: 0, fontSize: '11px', fontFamily: 'monospace' }}>{inv.id}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    >
                        <Tag color="blue" style={{ cursor: 'pointer' }}>{count} invitación(es)</Tag>
                    </Dropdown>
                )
            },
        },
        {
            title: '', key: 'actions', align: 'center',
            render: (_, record) => {
                const blocked = record.active && record.invitation_count > 0
                const button = (
                    <Button size="small" disabled={blocked} onClick={() => toggleFontActive(record)}>
                        {record.active ? 'Desactivar' : 'Activar'}
                    </Button>
                )
                return blocked
                    ? <Tooltip title={`En uso en ${record.invitation_count} invitación(es)`}><span style={{ display: 'inline-block' }}>{button}</span></Tooltip>
                    : button
            },
        },
    ]

    const texturesGrid = useMemo(() => (
        [...(textures ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(t => (
            <div key={t.id} style={{
                display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden',
                backgroundColor: '#FFF', boxShadow: '0px 0px 12px rgba(0,0,0,0.08)',
            }}>
                <div style={{ position: 'relative', width: '100%', height: '140px' }}>
                    <img src={t.image_url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                        <Dropdown
                            trigger={['click']}
                            placement='bottomRight'
                            popupRender={() => (
                                <div style={{
                                    backgroundColor: '#FFF', borderRadius: '12px', boxShadow: '0px 0px 12px rgba(0,0,0,0.2)',
                                    padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px',
                                }}>
                                    <span className={styles.filterLabel} style={{ marginBottom: 0 }}><b>Opacidad:</b> {t.opacity}</span>
                                    <span className={styles.filterLabel} style={{ marginBottom: 0 }}><b>Blend:</b> {t.blend}</span>
                                </div>
                            )}
                        >
                            <Button shape='circle' icon={<MoreVertical size={14} />} style={{ backgroundColor: '#FFFFFF40', backdropFilter: 'blur(10px)' }} />
                        </Dropdown>
                        <Link to={`/admin/texture-lab?id=${t.id}`}>
                            <Button shape='circle' icon={<ArrowRight size={14} />} style={{ backgroundColor: '#FFFFFF40', backdropFilter: 'blur(10px)' }} />
                        </Link>
                    </div>
                </div>
                <div style={{ padding: '12px' }}>
                    <span className={styles.tableLabel} style={{ marginBottom: 0 }}>{t.name}</span>
                </div>
            </div>
        ))
    ), [textures]);

    const items = [
        {
            label: `Texturas (${textures?.length ?? 0})`,
            key: 'texturas',
            children: (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
                    {texturesGrid}
                </div>
            ),
        },
        {
            label: `Fonts (${fonts?.length ?? 0})`,
            key: 'fonts',
            children: (
                <Table
                    rowKey='id'
                    columns={fontColumns}
                    dataSource={fonts}
                    loading={fontsLoading}
                    pagination={false}
                />
            ),
        },
        {
            label: 'Catálogo',
            key: 'catalogo',
            children: <CatalogoInvitaciones tipo={catalogoTipo} />,
        },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div className={styles.headerRow}>
                <div>
                    <div className={styles.title}>Laboratorio</div>
                    <div className={styles.subtitle}>Panel interno — solo admin</div>
                </div>
                {activeKey !== 'catalogo' && (
                    <div className={styles.headerControls}>
                        <Link to={activeKey === 'fonts' ? '/admin/font-lab' : '/admin/texture-lab'}>
                            <Button className='primarybutton--active' icon={<Sparkles size={14} />}>Crear</Button>
                        </Link>
                    </div>
                )}
            </div>
            <Tabs
                style={{ width: '100%' }}
                type='card'
                activeKey={activeKey}
                onChange={handleTabChange}
                items={items}
                tabBarExtraContent={activeKey === 'catalogo' ? (
                    <Segmented
                        shape='round'
                        className={catalogoStyles.roundSegmented}
                        style={{ marginBottom: 8 }}
                        options={CATALOGO_TIPOS}
                        value={catalogoTipo}
                        onChange={setCatalogoTipo}
                    />
                ) : null}
            />
        </div>
    )
}
