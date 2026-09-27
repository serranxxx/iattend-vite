import { Fragment, useEffect, useMemo, useState } from 'react'
import { Input, InputNumber, Segmented, Select, Switch, Tooltip, message } from 'antd'
import { ArrowDown, ArrowLeftRight, ArrowUp, Check, EyeOff, Info, Plus, ShoppingCart, Shield, Star, Trash2 } from 'lucide-react'
import { fetchAdminPlans, updatePlan } from '../plansAdminApi'
import { fetchPrices } from '../../../components/Payment/functions'
import {
    PLAN_FEATURE_GROUPS, PLAN_SURFACES, descriptionSegments,
    invalidarPlanes, planFeatures, planHighlights, planText,
} from '../../../hooks/usePlans'
import { DescriptionEditor } from './DescriptionEditor'
import styles from './PlanesSection.module.css'

// Catálogo de planes (tabla `plans`). Lo que se edita aquí es exactamente lo
// que pintan la tarjeta de /about/pricing en iattend-next, el checklist de
// /checkout y el selector de planes de la app, y lo que se copia a cada
// invitación NUEVA al crearse. Las existentes guardan su propia copia
// (`credits_included`, `side_events_included`, `photo_wall_included`): bajar
// algo aquí no le quita nada a quien ya compró.

const CAMPOS = [
    'name', 'tagline', 'description', 'credits_included', 'side_events_included',
    'photo_wall_included', 'can_buy_side_events', 'stripe_price_id', 'features', 'highlights',
    'show_landing', 'show_checkout', 'show_app',
]

const LISTAS = new Set(['features', 'highlights'])

const SECCIONES = {
    landing: { titulo: 'Landing', detalle: 'Tarjeta en iattend.site/about/pricing' },
    checkout: { titulo: 'Checkout', detalle: 'Selector de plan y checklist en /checkout' },
    app: { titulo: 'Selector en la app', detalle: 'Alta de invitación y contratar desde una invitación free' },
}

const valorDe = (plan, campo) => plan[campo] ?? (LISTAS.has(campo) ? [] : null)
const borradorDe = (plan) => Object.fromEntries(CAMPOS.map(c => [c, valorDe(plan, c)]))

const mxn = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const mxnCentavos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

const mover = (lista, index, delta) => {
    const destino = index + delta
    if (destino < 0 || destino >= lista.length) return lista
    const copia = [...lista]
    ;[copia[index], copia[destino]] = [copia[destino], copia[index]]
    return copia
}

// Texto con saltos de línea → trozos con <br />.
const conSaltos = (texto) => String(texto).split('\n').map((linea, i) => (
    <Fragment key={i}>{i > 0 && <br />}{linea}</Fragment>
))

// ------------------------------------------------------------ vistas previas ---

const LandingPreview = ({ plan }) => {
    const highlights = planHighlights(plan)
    const popular = plan.id === 'pro'

    return (
        <div className={styles.landingStage}>
            <div className={`${styles.landingCard} ${popular ? styles.landingCardPopular : ''}`}>
                {popular && (
                    <span className={styles.landingBadge}>
                        <Star size={12} fill="currentColor" strokeWidth={0} /> Más popular
                    </span>
                )}
                <div className={styles.landingTop}>
                    <div>
                        <h3 className={styles.landingName}>{plan.name}</h3>
                        {plan.tagline && <p className={styles.landingTagline}>{plan.tagline}</p>}
                    </div>
                    {plan.price && (
                        <div className={styles.landingPriceBlock}>
                            <span className={styles.landingPrice}>{mxn.format(plan.price.amount)}</span>
                            <span className={styles.landingPriceNote}>MXN · pago único</span>
                        </div>
                    )}
                </div>

                {plan.description && (
                    <p className={styles.landingDesc}>
                        {descriptionSegments(planText(plan, plan.description) ?? '').map((seg, i) => (
                            seg.href
                                ? <strong key={i} className={styles.landingLink}>{seg.text}</strong>
                                : <Fragment key={i}>{conSaltos(seg.text)}</Fragment>
                        ))}
                    </p>
                )}

                {highlights.length > 0 && (
                    <div className={styles.landingExtras}>
                        <span className={styles.landingExtrasLabel}>Y además incluye:</span>
                        <ul>
                            {highlights.map((h, i) => (
                                <li key={i}>
                                    <span className={styles.landingExtraTitle}>
                                        <Check size={13} strokeWidth={2.5} /> {h.title}
                                    </span>
                                    {h.note && <p>{h.note}</p>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <span className={styles.landingCta}>
                    <ShoppingCart size={15} strokeWidth={2} /> Comprar {plan.name}
                </span>
            </div>
        </div>
    )
}

const CheckoutPreview = ({ plan }) => (
    <div className={styles.checkoutStage}>
        <div className={styles.checkoutBody}>
            <span className={styles.checkoutTab}>Plan {plan.name}</span>
            {PLAN_FEATURE_GROUPS.map(group => {
                const items = planFeatures(plan, { group: group.key })
                if (!items.length) return null
                return (
                    <div key={group.key}>
                        <span className={styles.checkoutSection}>{group.label}</span>
                        <div className={styles.checkoutGrid}>
                            {items.map((item, i) => (
                                <span key={i} className={styles.checkoutItem}>
                                    <span className={styles.checkoutBox}><Check size={11} strokeWidth={3} /></span>
                                    {item.text}
                                </span>
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
        <div className={styles.checkoutFoot}>
            <div className={styles.checkoutFootRow}>
                <span>Plan {plan.name}</span>
                <strong>{plan.price ? mxnCentavos.format(plan.price.amount) : '—'}</strong>
            </div>
            <span className={styles.checkoutFootNote}>Pago único · activa para siempre</span>
            <span className={styles.checkoutCta}>
                <ShoppingCart size={15} /> Comprar · {plan.price ? mxnCentavos.format(plan.price.amount) : '—'}
            </span>
            <span className={styles.checkoutSecure}><Shield size={12} /> Pago seguro con Stripe</span>
        </div>
    </div>
)

// El selector de la app muestra solo nombre y precio.
const AppPreview = ({ plan }) => (
    <div className={styles.appStage}>
        <div className={`${styles.appCard} ${plan.id === 'pro' ? styles.appCardPro : ''}`}>
            {plan.id === 'pro' && <span className={styles.appPopular}><Star size={11} /> Más popular</span>}
            <div>
                <span className={styles.appEyebrow}>Plan</span>
                <span className={styles.appName}>{plan.name}</span>
            </div>
            <div className={styles.appPriceBlock}>
                <span className={styles.appPrice}>{plan.price ? mxnCentavos.format(plan.price.amount) : '—'}</span>
                <span className={styles.appPriceNote}>pago único</span>
            </div>
        </div>
    </div>
)

const Preview = ({ plan, seccion }) => {
    const visible = !!plan[`show_${seccion}`]

    return (
        <div className={styles.preview}>
            <span className={styles.previewTitulo}>Vista previa · {SECCIONES[seccion].titulo}</span>
            {!visible && (
                <div className={styles.previewOculto}>
                    <EyeOff size={14} /> Oculto en {SECCIONES[seccion].titulo}. Así se vería si lo activas.
                </div>
            )}
            {visible && !plan.stripe_price_id && (
                <div className={styles.previewOculto}>
                    <Info size={14} /> Sin price de Stripe no se ofrece en ninguna pantalla.
                </div>
            )}
            <div className={visible ? undefined : styles.previewApagada}>
                {seccion === 'landing' && <LandingPreview plan={plan} />}
                {seccion === 'checkout' && <CheckoutPreview plan={plan} />}
                {seccion === 'app' && <AppPreview plan={plan} />}
            </div>
        </div>
    )
}

// ------------------------------------------------------- piezas del editor ---

// `como="div"` para campos con botones adentro (el editor de descripción): un
// <label> reenvía cualquier clic en su interior al primer botón que contiene,
// y cada clic en el texto "presionaba" Insertar link.
const Campo = ({ label, children, ayuda, como = 'label' }) => {
    const Tag = como
    return (
        <Tag className={styles.campo}>
            <span>
                {label}
                {ayuda && (
                    <Tooltip title={ayuda}>
                        <Info size={12} className={styles.info} />
                    </Tooltip>
                )}
            </span>
            {children}
        </Tag>
    )
}

const SwitchRow = ({ titulo, detalle, checked, onChange }) => (
    <label className={styles.switchRow}>
        <span>
            {titulo}
            {detalle && <small>{detalle}</small>}
        </span>
        <Switch checked={!!checked} onChange={onChange} />
    </label>
)

// Select con los prices activos de Stripe. Si el guardado ya no está activo,
// se agrega a la lista para no mostrar un id suelto.
const PriceSelect = ({ value, onChange, prices }) => {
    const options = useMemo(() => {
        const lista = prices
            .filter(p => p.type === 'one_time')
            .sort((a, b) => a.productName.localeCompare(b.productName) || a.amount - b.amount)
            .map(p => ({
                value: p.priceId,
                label: `${p.productName} · ${mxn.format(p.amount)}`,
                busqueda: `${p.productName} ${p.priceId} ${p.amount}`,
                id: p.priceId,
            }))
        if (value && !lista.some(o => o.value === value)) {
            lista.unshift({ value, label: `${value} (no está activo en Stripe)`, busqueda: value, id: value })
        }
        return lista
    }, [prices, value])

    return (
        <Select
            showSearch
            allowClear
            value={value || undefined}
            onChange={v => onChange(v ?? null)}
            options={options}
            placeholder="Elige un price de Stripe"
            loading={!prices.length}
            filterOption={(input, option) => option.busqueda.toLowerCase().includes(input.toLowerCase())}
            optionRender={option => (
                <div className={styles.priceOption}>
                    <span>{option.data.label}</span>
                    <code>{option.data.id}</code>
                </div>
            )}
            popupMatchSelectWidth={false}
        />
    )
}

const Acciones = ({ children }) => <div className={styles.acciones}>{children}</div>

const Accion = ({ label, onClick, children }) => (
    <Tooltip title={label}>
        <button type="button" aria-label={label} onClick={onClick}>{children}</button>
    </Tooltip>
)

// ------------------------------------------------------------------ editor ---

const PlanEditor = ({ plan, prices, onGuardado }) => {
    const [messageApi, contextHolder] = message.useMessage()
    const [borrador, setBorrador] = useState(() => borradorDe(plan))
    const [guardando, setGuardando] = useState(false)
    const [seccion, setSeccion] = useState('landing')

    useEffect(() => { setBorrador(borradorDe(plan)) }, [plan])

    const cambios = useMemo(() => Object.fromEntries(
        CAMPOS
            .filter(c => JSON.stringify(borrador[c]) !== JSON.stringify(valorDe(plan, c)))
            .map(c => [c, borrador[c]])
    ), [borrador, plan])

    const sucio = Object.keys(cambios).length > 0
    const set = (campo, valor) => setBorrador(prev => ({ ...prev, [campo]: valor }))

    // Las features se editan por grupo pero se guardan en una sola lista: el
    // orden dentro de cada grupo es el orden en que salen en el checkout.
    const featuresDe = (group) => borrador.features
        .map((f, index) => ({ ...f, index }))
        .filter(f => (f.group ?? 'event') === group)

    const setFeature = (index, parche) =>
        set('features', borrador.features.map((f, i) => (i === index ? { ...f, ...parche } : f)))

    const moverFeature = (group, posicion, delta) => {
        const indices = featuresDe(group).map(f => f.index)
        const destino = posicion + delta
        if (destino < 0 || destino >= indices.length) return
        const lista = [...borrador.features]
        ;[lista[indices[posicion]], lista[indices[destino]]] = [lista[indices[destino]], lista[indices[posicion]]]
        set('features', lista)
    }

    const setHighlight = (index, parche) =>
        set('highlights', borrador.highlights.map((h, i) => (i === index ? { ...h, ...parche } : h)))

    const guardar = async () => {
        if (!sucio) return
        if (borrador.features.some(f => !f.es?.trim())) {
            return messageApi.warning('Cada línea del checklist necesita al menos el texto en español')
        }
        if (borrador.highlights.some(h => !h.title?.trim())) {
            return messageApi.warning('Cada punto de "Y además incluye" necesita un título')
        }

        setGuardando(true)
        try {
            const { data } = await updatePlan(plan.id, cambios)
            invalidarPlanes()
            onGuardado({ ...plan, ...data.plan })
            messageApi.success(`Plan ${data.plan.name} guardado`)
        } catch (error) {
            messageApi.error(error?.response?.data?.msg || 'No se pudo guardar el plan')
        } finally {
            setGuardando(false)
        }
    }

    // La vista previa usa el borrador (con el precio de Stripe del price
    // elegido): se ve el resultado antes de guardar.
    const priceElegido = prices.find(p => p.priceId === borrador.stripe_price_id)
    const vistaPrevia = {
        ...plan,
        ...borrador,
        price: priceElegido ? { amount: priceElegido.amount, currency: priceElegido.currency } : plan.price,
    }

    const encabezadoSeccion = (clave) => (
        <div className={styles.seccionHead}>
            <div>
                <span className={styles.seccionTitulo}>{SECCIONES[clave].titulo}</span>
                <span className={styles.seccionDetalle}>{SECCIONES[clave].detalle}</span>
            </div>
            <Tooltip title={borrador[`show_${clave}`] ? 'Se muestra aquí' : 'No se muestra aquí'}>
                <Switch
                    checked={!!borrador[`show_${clave}`]}
                    onChange={v => set(`show_${clave}`, v)}
                    checkedChildren="Visible"
                    unCheckedChildren="Oculto"
                />
            </Tooltip>
        </div>
    )

    return (
        <div className={styles.editorShell}>
            {contextHolder}

            <div className={styles.editor}>
                {/* ── Generales ── */}
                <section className={styles.bloque}>
                    <div className={styles.bloqueHead}>
                        <span className={styles.bloqueTitulo}>Generales</span>
                        <span className={styles.hint}>
                            {plan.invitation_count} {plan.invitation_count === 1 ? 'invitación' : 'invitaciones'} con este plan
                        </span>
                    </div>

                    <div className={styles.dosColumnas}>
                        <Campo label="Nombre">
                            <Input value={borrador.name ?? ''} onChange={e => set('name', e.target.value)} />
                        </Campo>
                        <Campo label="Price de Stripe" ayuda="El monto se cambia en Stripe. Aquí eliges qué price se cobra." como="div">
                            <PriceSelect
                                value={borrador.stripe_price_id}
                                onChange={v => set('stripe_price_id', v)}
                                prices={prices}
                            />
                        </Campo>
                    </div>

                    <Campo label="Frase corta">
                        <Input value={borrador.tagline ?? ''} onChange={e => set('tagline', e.target.value)} />
                    </Campo>

                    <div className={styles.dosColumnas}>
                        <Campo label="Créditos incluidos">
                            <InputNumber min={0} precision={0} value={borrador.credits_included} onChange={v => set('credits_included', v ?? 0)} />
                        </Campo>
                        <Campo label="Side events incluidos">
                            <InputNumber min={0} precision={0} value={borrador.side_events_included} onChange={v => set('side_events_included', v ?? 0)} />
                        </Campo>
                    </div>

                    <div className={styles.switches}>
                        <SwitchRow
                            titulo="Photo Wall"
                            detalle="Si no, la tarjeta del dashboard sale bloqueada con invitación a PRO."
                            checked={borrador.photo_wall_included}
                            onChange={v => set('photo_wall_included', v)}
                        />
                        <SwitchRow
                            titulo="Puede comprar side events sueltos"
                            detalle="Si no, ve la invitación a cambiarse a PRO."
                            checked={borrador.can_buy_side_events}
                            onChange={v => set('can_buy_side_events', v)}
                        />
                    </div>
                </section>

                {/* ── Por pantalla ── */}
                <section className={styles.bloque}>
                    <Segmented
                        block
                        value={seccion}
                        onChange={setSeccion}
                        options={PLAN_SURFACES.map(s => ({
                            value: s.key,
                            label: (
                                <span className={styles.segmento}>
                                    {!borrador[`show_${s.key}`] && <EyeOff size={12} />}
                                    {s.label}
                                </span>
                            ),
                        }))}
                    />

                    {seccion === 'landing' && (
                        <>
                            {encabezadoSeccion('landing')}

                            <Campo label="Descripción" como="div">
                                <DescriptionEditor
                                    value={borrador.description ?? ''}
                                    onChange={v => set('description', v)}
                                    placeholder="Qué incluye el plan, en un párrafo"
                                />
                            </Campo>

                            <span className={styles.subTitulo}>Y además incluye</span>
                            <ul className={styles.lista}>
                                {borrador.highlights.map((h, index) => (
                                    <li key={index} className={styles.highlight}>
                                        <div className={styles.highlightCampos}>
                                            <Input value={h.title} placeholder="Título" onChange={e => setHighlight(index, { title: e.target.value })} />
                                            <Input.TextArea
                                                value={h.note}
                                                placeholder="Nota"
                                                autoSize={{ minRows: 1, maxRows: 3 }}
                                                onChange={e => setHighlight(index, { note: e.target.value })}
                                            />
                                        </div>
                                        <Acciones>
                                            <Accion label="Subir" onClick={() => set('highlights', mover(borrador.highlights, index, -1))}><ArrowUp size={14} /></Accion>
                                            <Accion label="Bajar" onClick={() => set('highlights', mover(borrador.highlights, index, 1))}><ArrowDown size={14} /></Accion>
                                            <Accion label="Quitar" onClick={() => set('highlights', borrador.highlights.filter((_, i) => i !== index))}><Trash2 size={14} /></Accion>
                                        </Acciones>
                                    </li>
                                ))}
                            </ul>
                            <button type="button" className={styles.agregar} onClick={() => set('highlights', [...borrador.highlights, { title: '', note: '' }])}>
                                <Plus size={14} /> Agregar punto
                            </button>
                        </>
                    )}

                    {seccion === 'checkout' && (
                        <>
                            {encabezadoSeccion('checkout')}

                            <p className={styles.nota}>
                                <code>{'{credits}'}</code> y <code>{'{side_events}'}</code> ponen el número del plan; si vale 0, la línea no se muestra.
                            </p>

                            {PLAN_FEATURE_GROUPS.map(group => {
                                const otro = PLAN_FEATURE_GROUPS.find(g => g.key !== group.key)
                                return (
                                    <div key={group.key} className={styles.grupo}>
                                        <span className={styles.subTitulo}>{group.label}</span>
                                        <ul className={styles.lista}>
                                            {featuresDe(group.key).map((feature, posicion) => (
                                                <li key={feature.index} className={styles.feature}>
                                                    <Input value={feature.es} placeholder="Español" onChange={e => setFeature(feature.index, { es: e.target.value })} />
                                                    <Input value={feature.en} placeholder="English" onChange={e => setFeature(feature.index, { en: e.target.value })} />
                                                    <Acciones>
                                                        <Accion label="Subir" onClick={() => moverFeature(group.key, posicion, -1)}><ArrowUp size={14} /></Accion>
                                                        <Accion label="Bajar" onClick={() => moverFeature(group.key, posicion, 1)}><ArrowDown size={14} /></Accion>
                                                        <Accion label={`Mover a "${otro.label}"`} onClick={() => setFeature(feature.index, { group: otro.key })}><ArrowLeftRight size={14} /></Accion>
                                                        <Accion label="Quitar" onClick={() => set('features', borrador.features.filter((_, i) => i !== feature.index))}><Trash2 size={14} /></Accion>
                                                    </Acciones>
                                                </li>
                                            ))}
                                        </ul>
                                        <button
                                            type="button"
                                            className={styles.agregar}
                                            onClick={() => set('features', [...borrador.features, { group: group.key, icon: 'check', es: '', en: '' }])}
                                        >
                                            <Plus size={14} /> Agregar a {group.label.toLowerCase()}
                                        </button>
                                    </div>
                                )
                            })}
                        </>
                    )}

                    {seccion === 'app' && (
                        <>
                            {encabezadoSeccion('app')}
                            <p className={styles.nota}>
                                El selector de la app muestra solo el nombre y el precio del plan. Ambos se
                                editan en <b>Generales</b>.
                            </p>
                        </>
                    )}
                </section>

                <footer className={styles.pie} data-dirty={sucio || undefined}>
                    <span className={styles.pieEstado}>{sucio ? 'Cambios sin guardar' : 'Todo guardado'}</span>
                    <button type="button" className={styles.descartar} disabled={!sucio || guardando} onClick={() => setBorrador(borradorDe(plan))}>
                        Descartar
                    </button>
                    <button type="button" className={styles.guardar} disabled={!sucio || guardando} onClick={guardar}>
                        {guardando ? 'Guardando…' : 'Guardar cambios'}
                    </button>
                </footer>
            </div>

            <aside className={styles.previewCol}>
                <Preview plan={vistaPrevia} seccion={seccion} />
            </aside>
        </div>
    )
}

export const PlanesSection = () => {
    const [plans, setPlans] = useState(null)
    const [prices, setPrices] = useState([])
    const [error, setError] = useState(null)
    const [activo, setActivo] = useState('pro')

    useEffect(() => {
        fetchAdminPlans()
            .then(({ data }) => setPlans(data.plans ?? []))
            .catch(err => setError(err?.response?.data?.msg || 'No se pudo cargar el catálogo de planes'))
        fetchPrices(setPrices).catch(err => console.error('Error obteniendo prices de Stripe:', err))
    }, [])

    const reemplazar = (actualizado) =>
        setPlans(prev => prev.map(p => (p.id === actualizado.id ? actualizado : p)))

    if (error) return <div className={styles.vacio}>{error}</div>
    if (!plans) return <div className={styles.vacio}>Cargando planes…</div>

    // Pro y Lite primero: son los que se venden en la landing y el checkout.
    const orden = ['pro', 'lite', 'paperless', 'free']
    const ordenados = [...plans].sort((a, b) => orden.indexOf(a.id) - orden.indexOf(b.id))
    const plan = ordenados.find(p => p.id === activo) ?? ordenados[0]

    return (
        <div className={styles.planes}>
            <div className={styles.aviso}>
                <Info size={16} />
                <p>
                    Los cambios aplican a las invitaciones que se <b>creen o activen a partir de ahora</b>.
                    Las existentes conservan los créditos, side events y Photo Wall con los que se compraron.
                </p>
            </div>

            <div className={styles.planTabs}>
                {ordenados.map(p => {
                    const donde = PLAN_SURFACES.filter(v => p[`show_${v.key}`]).map(v => v.label.split(' ')[0])
                    return (
                        <button
                            key={p.id}
                            type="button"
                            className={p.id === plan.id ? styles.planTabActive : styles.planTab}
                            onClick={() => setActivo(p.id)}
                        >
                            <span>{p.name}</span>
                            <small>
                                {p.price ? mxn.format(p.price.amount) : 'sin precio'} · {donde.length ? donde.join(', ') : 'oculto'}
                            </small>
                        </button>
                    )
                })}
            </div>

            {/* key: al cambiar de plan el editor arranca limpio, sin arrastrar el
                borrador del anterior. */}
            <PlanEditor key={plan.id} plan={plan} prices={prices} onGuardado={reemplazar} />
        </div>
    )
}
