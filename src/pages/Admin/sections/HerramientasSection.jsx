import { useEffect, useMemo, useState } from 'react'
import { Button, Dropdown, Tabs } from 'antd'
import { ArrowRight, FlaskConical, MoreVertical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import styles from '../SalesAdminPage.module.css'

const ComingSoon = ({ label }) => (
    <div className={styles.subtitle} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '200px', fontSize: '13px',
    }}>
        {label} — Próximamente
    </div>
)

export const HerramientasSection = () => {
    const [textures, setTextures] = useState([])
    const [activeKey, setActiveKey] = useState('texturas')

    const getTexturesAdmin = async () => {
        const { data, error } = await supabase
            .from('textures')
            .select('*')
            .order('sort_order');
        if (error) console.error('Error al obtener texturas:', error);
        else setTextures(data);
    };

    useEffect(() => {
        getTexturesAdmin()
    }, [])

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
            label: 'Fonts',
            key: 'fonts',
            children: <ComingSoon label='Fonts' />,
        },
        {
            label: 'Imágenes',
            key: 'imagenes',
            children: <ComingSoon label='Imágenes' />,
        },
    ]

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div className={styles.headerRow}>
                <div>
                    <div className={styles.title}>Herramientas</div>
                    <div className={styles.subtitle}>Panel interno — solo admin</div>
                </div>
                <div className={styles.headerControls}>
                    <Link to='/admin/texture-lab'>
                        <Button className='primarybutton--active' icon={<FlaskConical size={14} />}>Laboratorio</Button>
                    </Link>
                </div>
            </div>
            <Tabs
                style={{ width: '100%' }}
                type='card'
                activeKey={activeKey}
                onChange={setActiveKey}
                items={items}
            />
        </div>
    )
}
