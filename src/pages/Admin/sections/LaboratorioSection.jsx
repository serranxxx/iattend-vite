import { useEffect, useMemo, useState } from 'react'
import { Dropdown, Segmented, Tooltip, message } from 'antd'
import { Plus, Search } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { fetchAdminFonts, updateAdminFont } from '../fontsAdminApi'
import { fetchGiftBrands } from '../giftBrandsAdminApi'
import { CatalogoInvitaciones } from '../CatalogoInvitaciones/CatalogoInvitaciones'
import styles from './LaboratorioSection.module.css'
import catalogoStyles from '../CatalogoInvitaciones/CatalogoInvitaciones.module.css'

const SUBTABS = ['fonts', 'texturas', 'regalos', 'catalogo']

const ORDENES = [
    { key: 'nombre', label: 'A–Z' },
    { key: 'uso', label: 'Más usadas' },
    { key: 'sinUso', label: 'Sin uso' },
]

const SUBTAB_LABELS = {
    fonts: 'Fonts',
    texturas: 'Texturas',
    regalos: 'Regalos',
    catalogo: 'Catálogo',
}

const CATALOGO_TIPOS = [
    { label: 'Clientes', value: 'reales' },
    { label: 'Tests', value: 'pruebas' },
]

// Link propio para la preview: `loadFonts.js` mantiene su <link> con SOLO las
// fonts activas, y aquí hacen falta también las inactivas para poder verlas
// antes de reactivarlas. Pisar ese link dejaría la app sin tipografías.
const LINK_ID = 'admin-lab-font-preview'

const useFontPreview = (fonts) => {
    useEffect(() => {
        const google = fonts.filter(f => !f.source || f.source === 'google_fonts')
        if (!google.length) return

        const href = `https://fonts.googleapis.com/css2?${google
            .map(f => `family=${encodeURIComponent(f.family)}${f.google_axis ? ':' + f.google_axis : ''}`)
            .join('&')}&display=swap`

        let link = document.getElementById(LINK_ID)
        if (!link) {
            link = document.createElement('link')
            link.id = LINK_ID
            link.rel = 'stylesheet'
            document.head.appendChild(link)
        }
        if (link.getAttribute('href') !== href) link.href = href
    }, [fonts])
}

const etiquetaOrigen = (source) => {
    if (source === 'self_hosted') return 'self-hosted'
    if (source === 'system') return 'sistema'
    return 'Google Fonts'
}

export const LaboratorioSection = ({ invitations }) => {
    const [searchParams, setSearchParams] = useSearchParams()
    const inicial = SUBTABS.includes(searchParams.get('subtab')) ? searchParams.get('subtab') : 'fonts'

    const [subtab, setSubtab] = useState(inicial)
    const [fonts, setFonts] = useState([])
    const [fontsLoading, setFontsLoading] = useState(true)
    const [textures, setTextures] = useState([])
    const [marcas, setMarcas] = useState([])
    const [huerfanas, setHuerfanas] = useState([])
    const [marcasLoading, setMarcasLoading] = useState(true)
    const [busqueda, setBusqueda] = useState('')
    const [orden, setOrden] = useState('nombre')
    const [catalogoTipo, setCatalogoTipo] = useState('reales')

    const cambiarSubtab = (key) => {
        setSubtab(key)
        searchParams.set('subtab', key)
        setSearchParams(searchParams, { replace: true })
    }

    const cargarFonts = async () => {
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

    const cargarMarcas = async () => {
        setMarcasLoading(true)
        try {
            const { data } = await fetchGiftBrands()
            setMarcas(data.brands || [])
            setHuerfanas(data.orphans || [])
        } catch (error) {
            console.error('Error al obtener marcas de regalos:', error)
            message.error('No se pudieron cargar las marcas')
        } finally {
            setMarcasLoading(false)
        }
    }

    useEffect(() => {
        cargarFonts()
        cargarMarcas()

        supabase
            .from('textures')
            .select('*')
            .order('sort_order')
            .then(({ data, error }) => {
                if (error) console.error('Error al obtener texturas:', error)
                else setTextures(data ?? [])
            })
    }, [])

    useFontPreview(fonts)

    const toggleFont = async (font) => {
        try {
            const { data } = await updateAdminFont(font.id, { active: !font.active })
            setFonts(prev => prev.map(f => f.id === font.id ? data.font : f))
            message.success(font.active ? 'Font desactivada' : 'Font activada')
        } catch (error) {
            message.error(error?.response?.data?.msg || 'No se pudo actualizar la font')
        }
    }

    // ---------------------------------------------------------------- fonts ---

    const resumen = useMemo(() => {
        const activas = fonts.filter(f => f.active)
        const masUsada = [...fonts].sort((a, b) => (b.invitation_count || 0) - (a.invitation_count || 0))[0]

        return {
            activas: activas.length,
            instaladas: fonts.length,
            masUsada,
            sinUso: fonts.filter(f => !f.invitation_count).length,
            selfHosted: fonts.filter(f => f.source === 'self_hosted').length,
        }
    }, [fonts])

    const fontsVisibles = useMemo(() => {
        const texto = busqueda.trim().toLowerCase()
        const filtradas = fonts.filter(f => !texto || f.family.toLowerCase().includes(texto))

        const ordenadas = [...filtradas]
        if (orden === 'uso') {
            ordenadas.sort((a, b) => (b.invitation_count || 0) - (a.invitation_count || 0))
        } else if (orden === 'sinUso') {
            // Las candidatas a desactivar primero; entre iguales, alfabético.
            ordenadas.sort((a, b) =>
                (a.invitation_count || 0) - (b.invitation_count || 0) || a.family.localeCompare(b.family))
        } else {
            ordenadas.sort((a, b) => a.family.localeCompare(b.family))
        }

        return ordenadas
    }, [fonts, busqueda, orden])

    // -------------------------------------------------------------- texturas ---

    // `data.generals.texture` guarda el ÍNDICE de la textura dentro de la lista
    // activa ordenada por sort_order, no su id (ver TexturesContext). El conteo
    // se arma con ese mismo criterio; si cambia el esquema, cambia aquí también.
    const usosPorTextura = useMemo(() => {
        const activas = textures.filter(t => t.is_active).sort((a, b) => a.sort_order - b.sort_order)
        const conteo = new Map()

        ;(invitations ?? []).forEach(inv => {
            const indice = inv?.data?.generals?.texture
            if (indice === null || indice === undefined) return
            const textura = activas[indice]
            if (textura) conteo.set(textura.id, (conteo.get(textura.id) || 0) + 1)
        })

        return conteo
    }, [textures, invitations])

    // ---------------------------------------------------------------- render ---

    const conteoSubtab = {
        fonts: fonts.length,
        texturas: textures.length,
        regalos: marcas.length,
        catalogo: null,
    }

    const marcasPorTipo = useMemo(() => ({
        store: marcas.filter(m => m.kind === 'store'),
        bank: marcas.filter(m => m.kind === 'bank'),
    }), [marcas])

    return (
        <div className={styles.lab}>
            <div className={styles.toolbar}>
                <div className={styles.tabs}>
                    {SUBTABS.map(key => (
                        <button
                            key={key}
                            type='button'
                            className={`${styles.tab} ${subtab === key ? styles.tabActive : ''}`}
                            onClick={() => cambiarSubtab(key)}
                        >
                            {SUBTAB_LABELS[key]}
                            {conteoSubtab[key] !== null ? ` ${conteoSubtab[key]}` : ''}
                        </button>
                    ))}
                </div>

                <div className={styles.spacer} />

                {subtab === 'texturas' && (
                    <Link to='/admin/texture-lab' className={styles.upload}>
                        <Plus size={14} /> Subir textura
                    </Link>
                )}

                {subtab === 'regalos' && (
                    <Link to='/admin/gift-brand-lab' className={styles.upload}>
                        <Plus size={14} /> Nueva marca
                    </Link>
                )}

                {subtab === 'catalogo' && (
                    <Segmented
                        shape='round'
                        className={catalogoStyles.roundSegmented}
                        options={CATALOGO_TIPOS}
                        value={catalogoTipo}
                        onChange={setCatalogoTipo}
                    />
                )}
            </div>

            {subtab === 'fonts' && (
                <>
                    <div className={styles.cards}>
                        <div className={styles.summary}>
                            <div className={styles.summaryLabel}>Fonts activas</div>
                            <div className={styles.summaryValue}>{resumen.activas}</div>
                            <div className={styles.summaryFoot}>de {resumen.instaladas} instaladas</div>
                        </div>

                        <div className={styles.summary}>
                            <div className={styles.summaryLabel}>Más usada</div>
                            <div
                                className={styles.summaryFont}
                                style={{ fontFamily: `"${resumen.masUsada?.family}"` }}
                            >
                                {resumen.masUsada?.family ?? '—'}
                            </div>
                            <div className={`${styles.summaryFoot} ${styles.summaryFootGreen}`}>
                                {resumen.masUsada?.invitation_count ?? 0} invitaciones
                            </div>
                        </div>

                        <div className={styles.summary}>
                            <div className={styles.summaryLabel}>Sin ningún uso</div>
                            <div className={styles.summaryValue}>{resumen.sinUso}</div>
                            <div className={`${styles.summaryFoot} ${styles.summaryFootAmber}`}>
                                candidatas a desactivar
                            </div>
                        </div>

                        <div className={styles.summary}>
                            <div className={styles.summaryLabel}>Self-hosted</div>
                            <div className={styles.summaryValue}>{resumen.selfHosted}</div>
                            <div className={styles.summaryFoot}>el resto es Google Fonts</div>
                        </div>
                    </div>

                    <div className={styles.toolbar}>
                        <div className={styles.search}>
                            <Search size={15} strokeWidth={1.7} />
                            <input
                                placeholder='Buscar font por nombre'
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>

                        <div className={styles.tabs}>
                            {ORDENES.map(({ key, label }) => (
                                <button
                                    key={key}
                                    type='button'
                                    className={`${styles.tab} ${orden === key ? styles.tabActive : ''}`}
                                    onClick={() => setOrden(key)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.card}>
                        {fontsLoading ? (
                            <div className={styles.empty}>Cargando fonts…</div>
                        ) : fontsVisibles.length === 0 ? (
                            <div className={styles.empty}>No se encontraron fonts.</div>
                        ) : (
                            <div className={styles.scroller}>
                                <div className={styles.table}>
                                    <div className={`${styles.row} ${styles.head}`}>
                                        <span className={styles.cell}>Nombre</span>
                                        <span className={styles.cell}>Categoría</span>
                                        <span className={styles.cell}>Origen</span>
                                        <span className={styles.cell}>Estado</span>
                                        <span className={styles.cell}>Uso</span>
                                        <span className={styles.cell} />
                                    </div>

                                    {fontsVisibles.map(font => {
                                        const usos = font.invitation_count || 0
                                        // Desactivar una font en uso rompería esas invitaciones.
                                        const bloqueada = font.active && usos > 0

                                        const boton = (
                                            <button
                                                type='button'
                                                className={`${styles.toggle} ${font.active ? '' : styles.toggleOn}`}
                                                aria-disabled={bloqueada}
                                                onClick={() => { if (!bloqueada) toggleFont(font) }}
                                            >
                                                {font.active ? 'Desactivar' : 'Activar'}
                                            </button>
                                        )

                                        return (
                                            <div className={styles.row} key={font.id}>
                                                <span
                                                    className={`${styles.cell} ${styles.fontName}`}
                                                    style={{ fontFamily: `"${font.family}"` }}
                                                    title={font.family}
                                                >
                                                    {font.family}
                                                </span>

                                                <span className={styles.cell}>
                                                    <span className={styles.chip}>{font.category || '—'}</span>
                                                </span>

                                                <span className={styles.cell}>
                                                    <span className={`${styles.chip} ${font.source === 'self_hosted' ? styles.chipSelfHosted : ''}`}>
                                                        {etiquetaOrigen(font.source)}
                                                    </span>
                                                </span>

                                                <span className={styles.cell}>
                                                    <span className={`${styles.pill} ${font.active ? styles.pillActiva : styles.pillInactiva}`}>
                                                        {font.active ? 'activa' : 'inactiva'}
                                                    </span>
                                                </span>

                                                <span className={styles.cell}>
                                                    {usos === 0 ? (
                                                        <span className={styles.sinUso}>sin uso</span>
                                                    ) : (
                                                        <Dropdown
                                                            trigger={['click']}
                                                            placement='bottomLeft'
                                                            popupRender={() => (
                                                                <div className={styles.popup}>
                                                                    {(font.invitations || []).map(inv => (
                                                                        <div key={inv.id}>
                                                                            <div className={styles.popupLabel}>{inv.label}</div>
                                                                            <div className={styles.popupId}>{inv.id}</div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        >
                                                            <button type='button' className={styles.uso}>
                                                                {usos === 1 ? '1 invitación' : `${usos} invitaciones`}
                                                            </button>
                                                        </Dropdown>
                                                    )}
                                                </span>

                                                <span className={styles.cell}>
                                                    {bloqueada
                                                        ? <Tooltip title={`En uso en ${usos} invitación(es)`}>{boton}</Tooltip>
                                                        : boton}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {subtab === 'texturas' && (
                textures.length === 0 ? (
                    <div className={`${styles.card} ${styles.empty}`}>No hay texturas cargadas.</div>
                ) : (
                    <div className={styles.texGrid}>
                        {textures.map(textura => {
                            const usos = usosPorTextura.get(textura.id) || 0
                            return (
                                <Link
                                    key={textura.id}
                                    to={`/admin/texture-lab?id=${textura.id}`}
                                    className={styles.texCard}
                                >
                                    <img className={styles.swatch} src={textura.image_url} alt='' loading='lazy' />
                                    <div className={styles.texFoot}>
                                        <div className={styles.texName}>{textura.name}</div>
                                        <div className={styles.texUsos}>
                                            {usos === 1 ? '1 uso' : `${usos} usos`}
                                            {textura.is_active ? '' : ' · inactiva'}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )
            )}

            {subtab === 'regalos' && (
                marcasLoading ? (
                    <div className={`${styles.card} ${styles.empty}`}>Cargando marcas…</div>
                ) : (
                    <>
                        {/* Strings que quedaron guardados en tarjetas y que no resuelven a
                            ninguna marca del catálogo: hoy se pintan sin logo en la
                            invitación. Se arreglan agregándolos como alias de su marca. */}
                        {huerfanas.length > 0 && (
                            <div className={styles.orphanBox}>
                                <div className={styles.orphanTitle}>
                                    Sin marca en el catálogo
                                </div>
                                <div className={styles.orphanHelp}>
                                    Estas tarjetas se ven sin logo en la invitación. Agregá el valor
                                    como alias de la marca que le corresponde.
                                </div>
                                <div className={styles.orphanList}>
                                    {huerfanas.map(h => (
                                        <span key={h.brand_key} className={styles.orphanChip}>
                                            <code>{h.brand_key || '(vacío)'}</code>
                                            <b>{h.invitation_count}</b>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {['store', 'bank'].map(tipo => (
                            <div key={tipo} className={styles.brandGroup}>
                                <div className={styles.brandGroupTitle}>
                                    {tipo === 'store' ? 'Tiendas' : 'Bancos'}
                                    <span>{marcasPorTipo[tipo].length}</span>
                                </div>

                                {marcasPorTipo[tipo].length === 0 ? (
                                    <div className={`${styles.card} ${styles.empty}`}>
                                        No hay {tipo === 'store' ? 'tiendas' : 'bancos'} en el catálogo.
                                    </div>
                                ) : (
                                    <div className={styles.brandGrid}>
                                        {marcasPorTipo[tipo].map(marca => (
                                            <Link
                                                key={marca.id}
                                                to={`/admin/gift-brand-lab?id=${marca.id}`}
                                                className={styles.brandCard}
                                            >
                                                <div
                                                    className={styles.brandSwatch}
                                                    style={{ background: marca.background || '#E8ECF0' }}
                                                >
                                                    {marca.logo_url
                                                        ? <img src={marca.logo_url} alt='' loading='lazy' />
                                                        : <span style={{ color: marca.text_color || '#1C3249' }}>
                                                            {marca.name}
                                                        </span>}
                                                </div>
                                                <div className={styles.brandFoot}>
                                                    <div className={styles.brandName}>{marca.name}</div>
                                                    <div className={styles.brandMeta}>
                                                        {marca.invitation_count === 1
                                                            ? '1 uso'
                                                            : `${marca.invitation_count} usos`}
                                                        {marca.is_active ? '' : ' · inactiva'}
                                                        {marca.logo_url ? '' : ' · sin logo'}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </>
                )
            )}

            {subtab === 'catalogo' && <CatalogoInvitaciones tipo={catalogoTipo} />}
        </div>
    )
}
