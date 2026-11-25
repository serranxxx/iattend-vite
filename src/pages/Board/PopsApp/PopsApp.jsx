import { startTransition, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dropdown, Tooltip, message } from 'antd'
import { ChevronDown, ChevronRight, CircleHelp, CircleUserRound, House, LayoutList, LogOut, Moon, Plus, Shield, Sparkles, Sun, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useConfirmados } from '../popsDatos'
import { PRECIO_PLUS, usePlanPops } from './usePlanPops'
import { AvisoLimite, ModalLimite } from './AvisoLimite'
import { PopsAppInicio } from './PopsAppInicio'
import { PopsAppMisPops } from './PopsAppMisPops'
import { PopsAppIdeas } from './PopsAppIdeas'
import { PopsAppPagos } from './PopsAppPagos'
import { HojaPops } from './HojaPops'
import { MakeAPop } from './MakeAPop'
import { irAStripePlus } from './suscripcionPlus'
import { MenuEspacios } from '../EspacioSelector'
import { PlannerFeedback } from '../PlannerFeedback'
import s from './PopsApp.module.css'

/*
  App de Pops en escritorio (handoff "App de Pops — Inicio, Mis Pops, Ideas,
  Clientes (Pops+), menú del avatar y Pagos"). Reemplaza la barra lateral de
  PlannerLayout en el espacio Pops: barra superior blanca (selector de
  espacio con el logo Pops / Pops+, pestañas Inicio · Mis Pops · Ideas,
  medidor de uso en Free, "Make a Pop" y el avatar con su menú) y la página.
  Plan, Pops activos y espacio: usePlanPops. Los avisos de límite (banner y
  modal) son de aquí; cada página pinta el banner donde le toca (`aviso`).
  `pagina`: inicio | mispops | ideas | pagos (PlannerLayout la guarda en ?seccion=).
  Celular (`movil`, handoff §10): header con el logo (abre el selector de
  espacio en hoja), chip de Pops activos (Free) y avatar; barra inferior fija
  Inicio · Mis Pops · + · Ideas · Cuenta; el menú del avatar y el límite son
  hojas inferiores (HojaPops).
*/

const Medidor = ({ etiqueta, texto, pct, alerta, ancho }) => (
    <div className={s.medidor} style={{ width: ancho }}>
        <div className={s.medidorFila}><span>{etiqueta}</span><b>{texto}</b></div>
        <div className={s.pista}><span style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} data-alerta={alerta || undefined} /></div>
    </div>
)

// Ideas, oculta de momento (pestaña, barra inferior y ?seccion=ideas). Con
// true regresa todo: la página PopsAppIdeas sigue en el código.
export const MOSTRAR_IDEAS = false
// Botón Claro / Oscuro del menú del avatar, oculto de momento (con true regresa).
const MOSTRAR_TEMA = false

export const LogoPops = ({ plus, tam = 30 }) => (
    <span className={s.logo} style={{ fontSize: tam }}>Pops{plus && <span className={s.logoMas}>+</span>}</span>
)

export const PopsApp = ({
    user, greeting, pagina, onPagina, pops = [], clientes = [], cargando = false, esCliente,
    puedeCambiarEspacio, resumenEspacios, onCambiarEspacio, botonRef,
    puedeCrear, onEnviarACliente, onAbrir, onConoce, onLogout, pie, movil = false,
}) => {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    // Administración: acceso al panel /admin desde el menú del avatar.
    const esAdmin = user?.role === 'Administration'

    // Al cambiar de página (Inicio, Mis Pops, Pagos…) se vuelve arriba: la
    // página y cualquier contenedor con scroll que la envuelva.
    const mainRef = useRef(null)
    const paginaAnterior = useRef(pagina)
    useEffect(() => {
        if (paginaAnterior.current === pagina) return
        paginaAnterior.current = pagina
        window.scrollTo({ top: 0 })
        for (let el = mainRef.current?.parentElement; el; el = el.parentElement) {
            if (el.scrollTop > 0) el.scrollTop = 0
        }
    }, [pagina])
    const todos = [...pops, ...clientes]
    const confirmados = useConfirmados(todos.map(p => p._pop?.id).filter(Boolean))
    const plan = usePlanPops({ user, pops: todos, confirmados })
    const [modal, setModal] = useState(false)
    const [menu, setMenu] = useState(false)
    const [hojaEspacio, setHojaEspacio] = useState(false)
    const [tema, setTema] = useState('light')
    const [sugerencias, setSugerencias] = useState(false)
    const menuRef = useRef(null)

    useEffect(() => {
        if (!menu || movil) return undefined
        const fuera = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false) }
        const esc = (e) => { if (e.key === 'Escape') setMenu(false) }
        window.addEventListener('pointerdown', fuera)
        window.addEventListener('keydown', esc)
        return () => { window.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', esc) }
    }, [menu, movil])

    // Pops+ y su portal de pagos: el backend arma la sesión de Stripe
    // (iattend--backend/router/popsSuscripcion.js) y aquí solo se redirige.
    const [yendo, setYendo] = useState(false)
    const irAStripe = async (ruta) => {
        if (yendo) return
        setYendo(true)
        try {
            await irAStripePlus(ruta)
        } catch (err) {
            const code = err?.response?.data?.code
            message.error(t(code === 'YA_PLUS' ? 'pops_app.already_plus'
                : code === 'SIN_SUSCRIPCION' ? 'pops_app.no_billing'
                    : 'pops_app.stripe_error'))
            setYendo(false)
        }
    }
    const pasarPlus = () => irAStripe('checkout')

    // Regreso de Stripe con el pago hecho: aviso y se limpia la URL.
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('plus') !== 'ok') return
        message.success(t('pops_app.welcome_plus'))
        const limpiar = () => {
            params.delete('plus')
            const q = params.toString()
            window.history.replaceState(window.history.state, '', `${window.location.pathname}${q ? `?${q}` : ''}`)
        }
        // Después de que usePlanPops lea `plus=ok` y deje de reintentar.
        const timer = setTimeout(limpiar, 20000)
        return () => clearTimeout(timer)
    }, [])
    const abrirPagos = () => irAStripe('portal')
    // Make a Pop (handoff "Nuevo Pop"): abre su menú Para mí / Enviar. Con 3 de
    // 3 Pops activos (Free), el aviso de límite en lugar del menú.
    const [crearAbierto, setCrearAbierto] = useState(false) // false · 'menu' · 'mail'
    const makePopRef = useRef(null)
    const crear = () => (plan.enLimite ? setModal(true) : setCrearAbierto(v => (v ? false : 'menu')))
    const enviarPop = () => (plan.enLimite ? setModal(true) : setCrearAbierto('mail'))
    const sinPops = todos.length === 0
    const nombre = user?.name?.split(' ')[0] ?? ''
    const inicial = (user?.name || '?').trim().charAt(0).toUpperCase()

    const pctPops = (plan.activos / plan.tope) * 100
    const pctMb = (plan.mbUsados / plan.mbTope) * 100
    const mbTexto = t('pops_app.mb_of', { used: plan.mbUsados, total: plan.mbTope })
    const popsTexto = t('pops_app.of', { n: plan.activos, total: plan.tope })

    const tipoAviso = plan.plus ? null : plan.enLimite ? 'limite' : plan.espacioCasiLleno ? 'espacio' : null
    const aviso = tipoAviso && (
        <AvisoLimite
            tipo={tipoAviso}
            mb={plan.mbUsados}
            mbTope={plan.mbTope}
            onSecundaria={() => onPagina('mispops')}
            onPlus={pasarPlus}
            movil={movil}
        />
    )

    const pestanas = [
        { key: 'inicio', label: t('pops_app.tab_home') },
        { key: 'mispops', label: t('pops_app.tab_my_pops'), n: pops.length || null },
        ...(MOSTRAR_IDEAS ? [{ key: 'ideas', label: t('pops_app.tab_ideas') }] : []),
    ]

    // Pastilla deslizante de las pestañas: se mide la activa (sin pestaña
    // activa, p. ej. en Pagos, se esconde). La primera medida va sin
    // transición para que no entre deslizándose desde la izquierda.
    // `activa` cambia al tocar (la pastilla sale al instante) y la página
    // nueva se pinta después, con menos prioridad (startTransition): si no,
    // la pastilla esperaba a que terminara de pintarse Mis Pops / Inicio.
    const navRef = useRef(null)
    const [activa, setActiva] = useState(pagina)
    useEffect(() => { setActiva(pagina) }, [pagina])
    const irA = (key) => {
        setActiva(key)
        startTransition(() => onPagina(key))
    }
    const [pastilla, setPastilla] = useState({ x: 0, w: 0, lista: false })
    useLayoutEffect(() => {
        const medir = () => {
            const boton = navRef.current?.querySelector(`[data-pestana="${activa}"]`)
            setPastilla(prev => (boton
                ? { x: boton.offsetLeft, w: boton.offsetWidth, lista: prev.lista || prev.w > 0 }
                : { ...prev, w: 0 }))
        }
        medir()
        window.addEventListener('resize', medir)
        return () => window.removeEventListener('resize', medir)
    }, [activa, pops.length, movil])
    useEffect(() => {
        if (pastilla.w && !pastilla.lista) {
            const id = requestAnimationFrame(() => setPastilla(prev => ({ ...prev, lista: true })))
            return () => cancelAnimationFrame(id)
        }
        return undefined
    }, [pastilla.w, pastilla.lista])

    const espacios = {
        items: ['weddings', 'pops'].map(key => ({
            key,
            label: (
                <span className={s.espacioItem}>
                    <b>{t(key === 'pops' ? 'invitations.space_pops' : 'invitations.space_weddings')}</b>
                    <small>{resumenEspacios?.[key]}</small>
                </span>
            ),
        })),
        onClick: ({ key }) => key !== 'pops' && onCambiarEspacio?.(key),
    }
    const selector = (
        <button type='button' ref={botonRef} className={s.selector} disabled={!puedeCambiarEspacio}>
            <LogoPops plus={plan.plus} />
            <span className={s.byIattend}>by I attend</span>
            {puedeCambiarEspacio && <ChevronDown size={15} className={s.flechita} />}
        </button>
    )

    const irAPagos = () => { setMenu(false); onPagina('pagos') }
    const renovacion = plan.renovacion
        ? new Date(plan.renovacion).toLocaleDateString(i18n.language?.startsWith('en') ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')
        : '—'

    const contenidoCuenta = (
        <>
            <div className={s.menuCabeza}>
                <span className={`${s.avatar} ${s.avatarChico}`}>{inicial}</span>
                <span className={s.menuNombre}><b>{nombre}</b><small>{user?.email}</small></span>
            </div>
            {plan.plus ? (
                <div className={s.planPlus}>
                    <div className={s.planPlusCabeza}>
                        <LogoPops plus tam={26} />
                        <span className={s.activa}>{t(plan.prueba ? 'pops_app.trial' : 'pops_app.active')}</span>
                    </div>
                    {/* Prueba gratis: solo el chip "Prueba gratis", sin cobro, fechas ni pagos. */}
                    {!plan.prueba && (
                        <div className={s.planDatos}>
                            <span><small>{t(plan.cancelada ? 'pops_app.ends_on' : 'pops_app.next_renewal')}</small><b>{renovacion}</b></span>
                            <span><small>{t('pops_app.charge')}</small><b>{t('pops_app.price_month_mxn', { price: PRECIO_PLUS })}</b></span>
                        </div>
                    )}
                    {plan.prueba ? (movil && (
                        <div className={s.planEspacio}>
                            <div><small>{t('pops_app.space')}</small><b>{mbTexto}</b></div>
                            <div className={s.pista}><span style={{ width: `${Math.max(2, pctMb)}%` }} /></div>
                        </div>
                    )) : movil ? (
                        <>
                            <div className={s.planEspacio}>
                                <div><small>{t('pops_app.space')}</small><b>{mbTexto}</b></div>
                                <div className={s.pista}><span style={{ width: `${Math.max(2, pctMb)}%` }} /></div>
                            </div>
                            <div className={s.planBotones}>
                                <button type='button' onClick={irAPagos}>{t('pops_app.billing_short')}</button>
                                <button type='button' onClick={() => message.info(t('pops_app.soon'))}>{t('pops_app.buy_space')}</button>
                            </div>
                        </>
                    ) : (
                        <button type='button' className={s.planLink} onClick={irAPagos}>{t('pops_app.billing_link')}</button>
                    )}
                </div>
            ) : (
                <div className={s.planFree}>
                    <div className={s.planFreeCabeza}><b>{t('pops_app.plan_free')}</b><span>$0</span></div>
                    <Medidor etiqueta={t('pops_app.active_pops')} texto={popsTexto} pct={pctPops} alerta={plan.enLimite} />
                    <Medidor etiqueta={t('pops_app.space')} texto={mbTexto} pct={pctMb} alerta={pctMb >= 90} />
                    <button type='button' className={s.ctaLima} onClick={pasarPlus} disabled={yendo}>{t(yendo ? 'pops_app.going_stripe' : 'pops_app.go_plus', { price: PRECIO_PLUS })}</button>
                </div>
            )}
            {plan.plus && !movil && (
                <div className={s.planFree}>
                    <div className={s.planFreeCabeza}><b>{t('pops_app.space')}</b><span><b>{mbTexto}</b></span></div>
                    <div className={s.pista}><span style={{ width: `${Math.max(2, pctMb)}%` }} /></div>
                </div>
            )}
            <div className={s.cuadros}>
                <button type='button' className={s.cuadro} onClick={() => message.info(t('pops_app.account_soon'))}><UserRound size={18} />{t('pops_app.my_account')}</button>
                {/* Ayuda = el formulario de sugerencias ("¿Qué te gustaría ver en I attend?"). */}
                <button type='button' className={s.cuadro} onClick={() => { setMenu(false); setSugerencias(true) }}><CircleHelp size={18} />{t('pops_app.help')}</button>
                {MOSTRAR_TEMA && (
                    <button type='button' className={s.cuadro} onClick={() => setTema(v => (v === 'dark' ? 'light' : 'dark'))}>
                        {tema === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
                        {t(tema === 'dark' ? 'pops_app.theme_dark' : 'pops_app.theme_light')}
                    </button>
                )}
            </div>
            {esAdmin && (
                <button type='button' className={s.admin} onClick={() => { setMenu(false); navigate('/admin') }}>
                    <Shield size={17} />
                    <span>{t('invitations.planner_menu_admin')}</span>
                    <ChevronRight size={16} className={s.adminFlecha} />
                </button>
            )}
            <button type='button' className={s.salir} onClick={onLogout}><LogOut size={15} />{t('invitations.planner_menu_logout')}</button>
        </>
    )

    // Celular (handoff §10) ---------------------------------------------------
    const cabeceraMovil = (
        <header className={s.barraMovil}>
            <button
                type='button'
                ref={botonRef}
                className={s.selectorMovil}
                disabled={!puedeCambiarEspacio}
                onClick={() => setHojaEspacio(true)}
                aria-label={t('invitations.space_switch_title')}
            >
                <LogoPops plus={plan.plus} tam={24} />
                <span className={s.byIattend}>by I attend</span>
                {puedeCambiarEspacio && <ChevronDown size={13} className={s.flechita} />}
            </button>
            <div className={s.derechaMovil}>
                {plan.prueba && (
                    <span className={`${s.chipPops} ${s.chipPrueba}`}>{t('pops_app.trial_days_short', { count: plan.prueba.dias })}</span>
                )}
                {!plan.plus && (
                    <span className={s.chipPops} data-alerta={plan.enLimite || undefined}>
                        <span aria-hidden />{popsTexto}
                    </span>
                )}
                <button type='button' className={s.avatarMovil} data-abierto={menu || undefined} onClick={() => setMenu(true)} aria-label={user?.name}>
                    {inicial}
                </button>
            </div>
        </header>
    )
    const tabMovil = (key, label, Icono, onClick, activa) => (
        <button key={key} type='button' className={s.tabMovil} data-activa={activa || undefined} aria-current={activa ? 'page' : undefined} onClick={onClick}>
            <span className={s.tabIcono}><Icono size={19} strokeWidth={2.2} /></span>
            {label}
        </button>
    )
    const barraInferior = (
        <nav className={s.barraInferior} data-sin-ideas={!MOSTRAR_IDEAS || undefined} aria-label={t('invitations.space_pops')}>
            {tabMovil('inicio', t('pops_app.tab_home'), House, () => onPagina('inicio'), pagina === 'inicio' && !menu)}
            {tabMovil('mispops', t('pops_app.tab_my_pops'), LayoutList, () => onPagina('mispops'), pagina === 'mispops' && !menu)}
            <span className={s.masCelda}>
                {puedeCrear && (
                    <button type='button' className={s.masMovil} onClick={crear} aria-label={t('pops_app.make_a_pop')}>
                        <Plus size={30} strokeWidth={2.6} />
                    </button>
                )}
            </span>
            {MOSTRAR_IDEAS && tabMovil('ideas', t('pops_app.tab_ideas'), Sparkles, () => onPagina('ideas'), pagina === 'ideas' && !menu)}
            {tabMovil('cuenta', t('pops_app.tab_account'), CircleUserRound, () => setMenu(true), menu || pagina === 'pagos')}
        </nav>
    )

    return (
        <div className={s.app} data-tema={tema} data-movil={movil || undefined}>
            {movil ? cabeceraMovil : (
            <header className={s.barra}>
                <div className={s.izquierda}>
                    {puedeCambiarEspacio
                        ? <Dropdown menu={espacios} trigger={['click']} placement='bottomLeft'>{selector}</Dropdown>
                        : selector}
                    <nav className={s.pestanas} ref={navRef} aria-label={t('invitations.space_pops')}>
                        {/* La pastilla de la activa se desliza (con un rebote) en lugar de saltar. */}
                        <span
                            className={s.pestanaPastilla}
                            aria-hidden
                            data-lista={pastilla.lista || undefined}
                            style={{ transform: `translateX(${pastilla.x}px)`, width: pastilla.w, opacity: pastilla.w ? 1 : 0 }}
                        />
                        {pestanas.map(p => (
                            <button
                                key={p.key}
                                type='button'
                                data-pestana={p.key}
                                className={s.pestana}
                                data-activa={activa === p.key || undefined}
                                aria-current={activa === p.key ? 'page' : undefined}
                                onClick={() => irA(p.key)}
                            >
                                {p.label}
                                {p.n != null && <span className={s.cuenta}>{p.n}</span>}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className={s.derecha}>
                    {plan.prueba && (
                        <span className={s.pillPrueba}>
                            <LogoPops plus tam={16} />
                            {t('pops_app.trial_days', { count: plan.prueba.dias })}
                        </span>
                    )}
                    {!plan.plus && (
                        <div className={s.uso}>
                            <Medidor etiqueta={t('pops_app.active_pops')} texto={popsTexto} pct={pctPops} alerta={plan.enLimite} ancho={130} />
                            <Medidor etiqueta={t('pops_app.space')} texto={mbTexto} pct={pctMb} alerta={pctMb >= 90} ancho={150} />
                        </div>
                    )}
                    {pagina !== 'inicio' && !sinPops && puedeCrear && (
                        <button type='button' ref={makePopRef} className={s.makePop} data-abierto={crearAbierto === 'menu' || undefined} aria-expanded={crearAbierto === 'menu'} onClick={crear}>
                            <span className={s.makePopMas}><Plus size={20} strokeWidth={2.6} /></span>
                            {t('pops_app.make_a_pop')}
                        </button>
                    )}
                    <div className={s.avatarWrap} ref={menuRef}>
                        <button type='button' className={s.avatarBoton} data-abierto={menu || undefined} onClick={() => setMenu(v => !v)} aria-expanded={menu} aria-label={user?.name}>
                            <span className={s.avatar}>{inicial}</span>
                            <ChevronDown size={14} className={s.flechita} />
                        </button>
                        {menu && !movil && (
                            <div className={s.menu} role='menu'>
                                {contenidoCuenta}
                            </div>
                        )}
                    </div>
                </div>
            </header>
            )}

            <main ref={mainRef} className={s.main}>
                {pagina === 'inicio' && (
                    <PopsAppInicio
                        movil={movil}
                        cargando={cargando}
                        greeting={greeting}
                        pops={pops}
                        confirmados={confirmados}
                        plan={plan}
                        aviso={aviso}
                        puedeCrear={puedeCrear}
                        onCrear={crear}
                        onConoce={onConoce}
                        onAbrir={onAbrir}
                        onVerMisPops={() => onPagina('mispops')}
                        onPasarPlus={pasarPlus}
                    />
                )}
                {pagina === 'mispops' && (
                    <PopsAppMisPops
                        movil={movil}
                        cargando={cargando}
                        pops={pops}
                        clientes={clientes}
                        confirmados={confirmados}
                        plan={plan}
                        aviso={aviso}
                        esCliente={esCliente}
                        puedeCrear={puedeCrear}
                        onCrear={crear}
                        onEnviarPop={enviarPop}
                        onEnviarACliente={onEnviarACliente}
                        onAbrir={onAbrir}
                        onPasarPlus={pasarPlus}
                    />
                )}
                {MOSTRAR_IDEAS && pagina === 'ideas' && <PopsAppIdeas movil={movil} plan={plan} puedeCrear={puedeCrear} onUsarIdea={crear} />}
                {pagina === 'pagos' && (
                    <PopsAppPagos plan={plan} yendo={yendo} onVolver={() => onPagina('inicio')} onPortal={abrirPagos} onPlus={pasarPlus} />
                )}
                {pie}
            </main>

            <MakeAPop
                abierto={Boolean(crearAbierto)}
                pasoInicial={crearAbierto || 'menu'}
                onCerrar={() => setCrearAbierto(false)}
                anclaRef={pagina !== 'inicio' && !sinPops ? makePopRef : null}
                movil={movil}
                plus={plan.plus}
                onSoloPlus={() => message.info(t('pop_flow.plus_only'))}
            />
            <PlannerFeedback variante='oculta' abierto={sugerencias} onCerrar={() => setSugerencias(false)} />
            <ModalLimite movil={movil} open={modal} onClose={() => setModal(false)} onArchivar={() => { setModal(false); onPagina('mispops') }} onPlus={pasarPlus} />

            {movil && (
                <>
                    {barraInferior}
                    <HojaPops open={menu} onClose={() => setMenu(false)} etiqueta={user?.name} className={s.hojaCuenta}>
                        {contenidoCuenta}
                    </HojaPops>
                    <HojaPops open={hojaEspacio} onClose={() => setHojaEspacio(false)} etiqueta={t('invitations.space_switch_title')}>
                        <MenuEspacios
                            espacio='pops'
                            resumen={resumenEspacios}
                            enHoja
                            onElegir={(e) => { setHojaEspacio(false); if (e !== 'pops') onCambiarEspacio?.(e) }}
                        />
                    </HojaPops>
                </>
            )}
        </div>
    )
}

export default PopsApp
