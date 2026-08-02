import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dropdown, Input, Pagination, Tabs, Tag, message } from 'antd'
import { Check, Filter, Save, Search, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { browseGoogleFonts, installAdminFont } from './fontsAdminApi'
import { fonts as STATIC_FONTS } from '../../helpers/assets/fonts'
import { HeaderBuild } from '../../modules/Header/Header'
import { BuildContent } from '../../modules/Invitation/Build/PageSections/BuildContent'
import { BuildCover } from '../../modules/Invitation/Build/BuildSections/BuildCover'
import { BuildGenerals } from '../../modules/Invitation/Build/BuildSections/BuildGenerals'
import { BuildQuote } from '../../modules/Invitation/Build/BuildSections/BuildQuote'
import { load } from '../../helpers/assets/images'
import '../../modules/Invitation/Build/PageSections/build-invitation.css'

const LAB_INVITATION_ID = '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d'
const CATALOG_PAGE_SIZE = 20
const FONT_CATEGORIES = ['Sans Serif', 'Serif', 'Display', 'Handwriting', 'Monospace']

export const FontLabPage = () => {
    const navigate = useNavigate()
    const [messageApi, contextHolder] = message.useMessage()

    const [invitation, setInvitation] = useState(null)
    const [positionY, setPositionY] = useState('generals')
    const [onHide, setOnHide] = useState(() => window.innerWidth <= 750)
    const [device, setDevice] = useState('ios')
    const [editorTab, setEditorTab] = useState('cover')
    const [mainTab, setMainTab] = useState('search')

    const [installedFamilies, setInstalledFamilies] = useState(STATIC_FONTS)
    const [selectedFonts, setSelectedFonts] = useState([]) // [{ family, category }]
    const [installing, setInstalling] = useState(false)

    const [catalogQueryInput, setCatalogQueryInput] = useState('')
    const [catalogQuery, setCatalogQuery] = useState('')
    const [catalogCategories, setCatalogCategories] = useState([])
    const [catalogPage, setCatalogPage] = useState(1)
    const [catalogFonts, setCatalogFonts] = useState([])
    const [catalogTotal, setCatalogTotal] = useState(0)
    const [catalogLoading, setCatalogLoading] = useState(false)
    const catalogListRef = useRef(null)

    useEffect(() => {
        const getLabInvitation = async () => {
            const { data, error } = await supabase
                .from('invitations')
                .select('data, id')
                .eq('id', LAB_INVITATION_ID)
                .maybeSingle()

            if (error || !data) {
                messageApi.error('No se pudo cargar la invitación de prueba')
                return
            }
            const raw = data.data
            setInvitation({
                ...raw,
                cover: {
                    ...raw.cover,
                    image: { ...raw.cover?.image, dev: raw.cover?.image?.prod },
                },
                quote: {
                    ...raw.quote,
                    image: { ...raw.quote?.image, dev: raw.quote?.image?.prod },
                },
                dresscode: { ...raw.dresscode, dev: raw.dresscode?.prod },
                gallery: { ...raw.gallery, dev: raw.gallery?.prod },
            })
        }
        getLabInvitation()
    }, [])

    useEffect(() => {
        const getInstalledFamilies = async () => {
            const { data, error } = await supabase
                .from('fonts')
                .select('family')
                .eq('active', true)
                .order('family')
            if (error || !data || data.length === 0) return
            setInstalledFamilies(data.map(f => f.family))
        }
        getInstalledFamilies()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            setCatalogPage(1)
            setCatalogQuery(catalogQueryInput.trim())
        }, 400)
        return () => clearTimeout(timer)
    }, [catalogQueryInput])

    useEffect(() => {
        if (mainTab !== 'search') return
        let cancelled = false
        setCatalogLoading(true)
        browseGoogleFonts({ q: catalogQuery, page: catalogPage, pageSize: CATALOG_PAGE_SIZE, categories: catalogCategories })
            .then(({ data }) => {
                if (cancelled) return
                setCatalogFonts(data.fonts || [])
                setCatalogTotal(data.total || 0)
            })
            .catch(() => {
                if (!cancelled) messageApi.error('No se pudo cargar el catálogo de Google Fonts')
            })
            .finally(() => { if (!cancelled) setCatalogLoading(false) })
        return () => { cancelled = true }
    }, [mainTab, catalogQuery, catalogCategories, catalogPage])

    useEffect(() => {
        catalogListRef.current?.scrollTo({ top: 0 })
    }, [catalogPage])

    useEffect(() => {
        if (!catalogFonts.length) return
        const href = `https://fonts.googleapis.com/css2?${catalogFonts.map(f => `family=${encodeURIComponent(f.family)}`).join('&')}&display=swap`
        let link = document.getElementById('fontlab-catalog-link')
        if (!link) {
            link = document.createElement('link')
            link.id = 'fontlab-catalog-link'
            link.rel = 'stylesheet'
            document.head.appendChild(link)
        }
        link.href = href
    }, [catalogFonts])

    const fontOptions = useMemo(() => {
        const selectedFamilies = selectedFonts.map(f => f.family)
        return [...new Set([...selectedFamilies, ...installedFamilies])]
    }, [selectedFonts, installedFamilies])

    const fontOverride = useMemo(() => (
        selectedFonts.length
            ? selectedFonts.map(f => ({ family: f.family, google_axis: null }))
            : null
    ), [selectedFonts])

    const toggleCategory = (category) => {
        setCatalogPage(1)
        setCatalogCategories(prev => (
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        ))
    }

    const toggleFontSelection = (font) => {
        setSelectedFonts(prev => (
            prev.some(f => f.family === font.family)
                ? prev.filter(f => f.family !== font.family)
                : [...prev, font]
        ))
    }

    const removeSelectedFont = (family) => {
        setSelectedFonts(prev => prev.filter(f => f.family !== family))
    }

    const handleInstalarFonts = async () => {
        if (!selectedFonts.length) return
        setInstalling(true)
        const results = await Promise.allSettled(
            selectedFonts.map(font => installAdminFont({ family: font.family, google_axis: null, category: font.category }))
        )

        const installed = []
        const failed = []
        results.forEach((result, index) => {
            const font = selectedFonts[index]
            if (result.status === 'fulfilled') installed.push(font.family)
            else failed.push(font.family)
        })

        if (installed.length) {
            setInstalledFamilies(prev => [...new Set([...installed, ...prev])].sort())
            setSelectedFonts(prev => prev.filter(f => !installed.includes(f.family)))
            messageApi.success(`${installed.length} font(s) instalada(s)`)
        }
        if (failed.length) {
            messageApi.error(`No se pudo instalar: ${failed.join(', ')}`)
        }
        setInstalling(false)
    }

    if (!invitation) {
        return (
            <div className='build-loading-container'>
                <img alt='' src={load} style={{ width: '200px' }} />
            </div>
        )
    }

    const newFonts = selectedFonts.map(f => f.family)

    const editorItems = [
        { key: 'cover', label: 'Portada', children: <BuildCover invitation={invitation} setInvitation={setInvitation} setSaved={() => { }} invitationID={LAB_INVITATION_ID} fontOptions={fontOptions} fontsOnly newFonts={newFonts} /> },
        { key: 'generals', label: 'Generales', children: <BuildGenerals invitation={invitation} setInvitation={setInvitation} setSaved={() => { }} fontOptions={fontOptions} fontsOnly newFonts={newFonts} /> },
        { key: 'quote', label: 'Cita', children: <BuildQuote invitation={invitation} setInvitation={setInvitation} setSaved={() => { }} invitationID={LAB_INVITATION_ID} fontOptions={fontOptions} fontsOnly newFonts={newFonts} /> },
    ]

    return (
        <div className='invitations-page-main-container'>
            {contextHolder}
            <HeaderBuild position='admin' />
            <div className='build-componentes-container' style={{maxWidth:'96vw', maxHeight: '84vh', overflow:'hidden', margin: '0px', position: 'relative', justifyContent: 'flex-start', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{
                    display: 'flex', flexDirection: 'column', width: '360px', flexShrink: 0,
                    backgroundColor: '#FFF', borderRadius: '16px', boxShadow: '0px 0px 12px rgba(0,0,0,0.08)',
                    maxHeight: '85vh', overflow: 'hidden',
                }}>
                    <Tabs
                        activeKey={mainTab}
                        onChange={setMainTab}
                        style={{ flex: 1 }}
                        tabBarStyle={{ padding: '0 20px', marginBottom: 0 }}
                        items={[
                            {
                                key: 'search',
                                label: 'Buscar',
                                children: (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', height: 'calc(85vh - 46px)' }}>
                                        <div style={{
                                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', boxSizing: 'border-box'
                                        }}>
                                            <Input
                                                prefix={<Search size={14} />}
                                                value={catalogQueryInput}
                                                style={{ borderRadius: '99px' }}
                                                onChange={(e) => setCatalogQueryInput(e.target.value)}
                                                placeholder='Buscar font por nombre'
                                                allowClear
                                            />
                                            <Dropdown
                                                trigger={['click']}
                                                placement='bottomRight'
                                                popupRender={() => (
                                                    <div style={{
                                                        display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '12px',
                                                        borderRadius: '12px', backgroundColor: '#FFF', boxShadow: '0px 0px 12px rgba(0,0,0,0.15)', maxWidth: '240px',
                                                    }}>
                                                        {FONT_CATEGORIES.map(category => (
                                                            <Tag.CheckableTag
                                                                key={category}
                                                                checked={catalogCategories.includes(category)}
                                                                onChange={() => toggleCategory(category)}
                                                            >
                                                                {category}
                                                            </Tag.CheckableTag>
                                                        ))}
                                                    </div>
                                                )}
                                            >
                                                <Button
                                                    icon={<Filter size={14} />}
                                                    shape='circle'
                                                    type={catalogCategories.length ? 'primary' : 'default'}
                                                />
                                            </Dropdown>
                                        </div>

                                        <div ref={catalogListRef} className='scroll-invitation' style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', boxSizing: 'border-box', paddingTop: '0px' }}>
                                            {catalogLoading && <span className='gc-content-label'>Cargando...</span>}
                                            {!catalogLoading && catalogFonts.length === 0 && (
                                                <span className='gc-content-label'>No se encontraron fonts</span>
                                            )}
                                            {catalogFonts.map((font) => {
                                                const isSelected = selectedFonts.some(f => f.family === font.family)
                                                const isInstalled = installedFamilies.includes(font.family)
                                                return (
                                                    <div
                                                        key={font.family}
                                                        onClick={() => !isInstalled && toggleFontSelection(font)}
                                                        title={isInstalled ? 'Ya está en tu catálogo' : 'Click para seleccionar esta font'}
                                                        style={{
                                                            display: 'flex', flexDirection: 'column', gap: '6px',
                                                            padding: '16px', borderRadius: '16px', cursor: isInstalled ? 'default' : 'pointer',
                                                            border: isSelected ? '1px solid var(--brand-color-500)' : isInstalled ? '1px solid #b7eb8f' : '1px solid var(--borders)',
                                                            backgroundColor: isSelected ? 'var(--brand-color-100)' : isInstalled ? '#f6ffed' : 'transparent',
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '16px', fontFamily: `"${font.family}"` }}>{font.family}</span>
                                                            {isInstalled ? (
                                                                <Tag color='green' style={{ margin: 0 }}>En tu catálogo</Tag>
                                                            ) : (
                                                                <Button
                                                                    type={isSelected ? 'primary' : 'default'}
                                                                    shape='circle'
                                                                    size='small'
                                                                    icon={isSelected ? <Check size={12} /> : null}
                                                                    onClick={(e) => { e.stopPropagation(); toggleFontSelection(font) }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <Pagination
                                            size='small'
                                            current={catalogPage}
                                            pageSize={CATALOG_PAGE_SIZE}
                                            total={catalogTotal}
                                            showSizeChanger={false}
                                            onChange={setCatalogPage}
                                            style={{ alignSelf: 'center', padding: '12px' }}
                                        />
                                    </div>
                                ),
                            },
                            {
                                key: 'test',
                                label: 'Probar',
                                children: (
                                    <div className='scroll-invitation' style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 20px 20px', maxHeight: 'calc(85vh - 46px)', overflowY: 'auto', paddingTop:'12px' }}>
                                        <span className='gc-content-label' style={{ marginTop: '8px' }}>
                                            Editores (mismos del builder normal — elige dónde probar la font)
                                        </span>
                                        <Tabs
                                            activeKey={editorTab}
                                            onChange={setEditorTab}
                                            type='card'
                                            items={editorItems}
                                        />
                                    </div>
                                ),
                            },
                            {
                                key: 'install',
                                label: 'Instalar',
                                children: (
                                    <div className='scroll-invitation' style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '0 20px 20px', maxHeight: 'calc(85vh - 46px)', overflowY: 'auto', paddingTop:'12px' }}>
                                        {selectedFonts.length === 0 && (
                                            <span className='gc-content-label'>No hay fonts seleccionadas — elígelas en la pestaña "Buscar"</span>
                                        )}

                                        {selectedFonts.map(font => (
                                            <div
                                                key={font.family}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--borders)',
                                                }}
                                            >
                                                <span style={{ fontFamily: `"${font.family}"`, fontSize: '15px' }}>{font.family}</span>
                                                <Button
                                                    type='text'
                                                    danger
                                                    size='small'
                                                    icon={<X size={14} />}
                                                    onClick={() => removeSelectedFont(font.family)}
                                                />
                                            </div>
                                        ))}

                                        <Button
                                            type='primary'
                                            icon={<Save size={14} />}
                                            disabled={!selectedFonts.length}
                                            loading={installing}
                                            onClick={handleInstalarFonts}
                                            style={{ marginTop: '8px' }}
                                        >
                                            Instalar fonts
                                        </Button>
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>

                <BuildContent
                    invitation={invitation}
                    fontOverride={fontOverride}
                    positionY={positionY}
                    setPositionY={setPositionY}
                    currentDevice={device}
                    setDevice={setDevice}
                    onHide={onHide}
                    setOnHide={setOnHide}
                    minimalControls
                    onBack={() => navigate('/admin?tab=herramientas&subtab=fonts')}
                />
            </div>
        </div>
    )
}
