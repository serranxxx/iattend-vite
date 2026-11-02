import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Drawer, Dropdown, Grid, Popover } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { CalendarHeart, ChevronRight, Compass, Gift, Info, LayoutDashboard, LogOut, Plus, Shield, Sparkles, Users, X, Zap } from 'lucide-react'
import { PlannerExplore } from './PlannerExplore'
import { PlannerFeedback } from './PlannerFeedback'
import { PlannerEventList } from './PlannerEventList'
import { buildStats, fetchPlannerData } from '../../components/PlannerDashboard/plannerData'
import logoBlue from '/images/logo_blue.png'
import styles from './PlannerLayout.module.css'
import { PlannerSkeleton } from './PlannerSkeleton'


/**
 * /invitations de un planner (exclusivo de ese rol; el resto de cuentas usa
 * la página de siempre). Toda la navegación vive en la barra lateral:
 *   - Comprar evento y, si tiene, sus eventos gratis → drawer de alta
 *     (PlannerEventDrawer).
 *   - Invitaciones: Explora I attend (carrusel + su invitación de ejemplo
 *     `is_test`, si la tiene), Mis clientes y Mis eventos (PlannerEventList:
 *     Próximos + Historial). Siempre se entra a Explora I attend.
 *   - Dashboard (?view=data) → PlannerDashboard.
 *   - Administración: además, Administrador bajo Dashboard.
 *   - Abajo, "¿Te falta algo?" (PlannerFeedback, solicitudes que llegan a
 *     Admin → Buzón → Reportes) y su usuario (menú con "Conoce I attend" y
 *     cerrar sesión).
 * El contenido queda en un solo nivel: título + "Conoce I attend" y las tarjetas. En el
 * dashboard el encabezado se colapsa (todo sube con transición) y el filtro de
 * eventos del dashboard se muestra en la barra, bajo "Dashboard".
 *
 * En celular (< 768 px) no hay barra lateral: arriba el logo (o "Dashboard")
 * y su avatar con el menú; abajo una barra de pestañas (Explora, Clientes,
 * Mis eventos, Dashboard) con un "+" al centro que abre la hoja de alta
 * (comprar o usar sus eventos gratis). "¿Te falta algo?" va como fila al
 * final del dashboard.
 *
 * `esCliente`: el mismo layout para una cuenta de cliente (InvitationsPage lo
 * usa para todos): sin Clientes, Dashboard, Administrador, "¿Te falta algo?"
 * ni invitación de ejemplo; Explora es solo el carrusel (con su slide de
 * regalo, `onRegalar`) y Eventos son todas sus invitaciones.
 */
export const PlannerLayout = ({
    esCliente = false,
    greeting, user, invitations, beneficios, esDeCliente, renderInvitationCard,
    view, onViewChange, dashboard, setFilterSlot, loading,
    onComprar, onGratis, onGratisPop, onEventoPersonal, onRegalar, onTour, onLogout, onAbrir, onCompartir,
}) => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const [elegida, setElegida] = useState(null)
    const celular = Grid.useBreakpoint().md === false
    const [hojaAlta, setHojaAlta] = useState(false)
    // Administración usa este mismo layout (helpers/roles.js) y aquí no está
    // el header de la app: su acceso a Administrador va en la barra, bajo Dashboard.
    const esAdmin = !esCliente && user?.role === 'Administration'

    const lista = invitations ?? []
    // La invitación `is_test` de un planner es su ejemplo (Explora I attend).
    // Un admin tiene muchas de prueba que son sus eventos de trabajo: todas van
    // a Mis eventos y Explora usa la primera como ejemplo.
    const esEjemplo = (inv) => !esCliente && !esDeCliente(inv) && inv.is_test && !esAdmin
    // Su copia de la plantilla de planners (helpers/plannerTemplate.js en el
    // backend: dueño y planner son la propia cuenta) va primero, así es la que
    // sale como ejemplo; si no tiene, la primera de sus pruebas, como antes.
    const esCopiaDePlantilla = (inv) => inv.planner_id && inv.planner_id === inv.user_id && inv.user_id === user?.uid
    const pruebasAdmin = esAdmin
        ? lista
            .filter(inv => !esDeCliente(inv) && inv.is_test && !inv._pop)
            .sort((a, b) => Number(esCopiaDePlantilla(b)) - Number(esCopiaDePlantilla(a)))
        : []
    // Clientes manda: todo lo de un cliente (invitación o Pop) va ahí. Los
    // Pops propios van en Pops y Eventos queda con sus invitaciones propias.
    const secciones = [
        { key: 'test', title: t('invitations.section_test'), items: esAdmin ? pruebasAdmin.slice(0, 1) : lista.filter(inv => !inv._pop && esEjemplo(inv)) },
        { key: 'clients', title: t('invitations.planner_tab_clients'), items: lista.filter(esDeCliente) },
        { key: 'own', title: t('invitations.planner_tab_own'), items: lista.filter(inv => !inv._pop && !esDeCliente(inv) && !esEjemplo(inv)) },
        { key: 'pops', title: t('invitations.planner_tab_pops'), items: lista.filter(inv => inv._pop && !esDeCliente(inv)) },
    ].filter(s => !esCliente || s.key !== 'clients')

    // Siempre se entra a Explora I attend; después, la que elija.
    const activa = secciones.find(s => s.key === (elegida ?? 'test'))

    // Números de las tarjetas de Mis clientes y Mis eventos (mismo cálculo
    // que el dashboard). Sin números para los Pops: con stats la tarjeta
    // pinta el lector de pases, que solo sabe abrir invitaciones.
    const conNumeros = secciones
        .filter(s => s.key === 'clients' || s.key === 'own')
        .flatMap(s => s.items)
        .filter(i => !i._pop)
    const conNumerosKey = conNumeros.map(i => i.id).join(',')
    const [datosEventos, setDatosEventos] = useState(null)
    useEffect(() => {
        let vivo = true
        fetchPlannerData(conNumeros.map(i => i.id))
            .then(datos => { if (vivo) setDatosEventos(datos) })
            .catch(error => console.error('No se pudieron cargar los números de los eventos:', error))
        return () => { vivo = false }
    }, [conNumerosKey])
    const statsPorId = useMemo(() => {
        if (!datosEventos) return {}
        const hoy = dayjs().startOf('day')
        return Object.fromEntries(conNumeros.map(inv => [inv.id, buildStats(inv, datosEventos, hoy)]))
    }, [datosEventos, conNumerosKey])
    const enDashboard = view === 'data'

    const gratis = beneficios?.free_events ?? 0
    const gratisPop = beneficios?.free_flash_events ?? 0
    const descuento = beneficios?.discount_pct ?? 0

    // Crear un Pop: con uno gratis, directo a ese flujo; si no, la compra.
    const crearPop = gratisPop > 0 ? onGratisPop : onComprar

    const abrirSeccion = (key) => {
        setElegida(key)
        if (enDashboard) onViewChange('invitations')
    }

    const menuUsuario = {
        items: [
            { key: 'email', label: <span className={styles.menuCorreo}>{user?.email}</span>, disabled: true },
            { type: 'divider' },
            { key: 'tour', label: t('invitations.planner_menu_tour'), icon: <Sparkles size={14} /> },
            // En celular no hay barra lateral: Administrador va en este menú.
            ...(esAdmin && celular ? [{ key: 'admin', label: t('invitations.planner_menu_admin'), icon: <Shield size={14} /> }] : []),
            { key: 'logout', label: t('invitations.planner_menu_logout'), icon: <LogOut size={14} />, danger: true },
        ],
        onClick: ({ key }) => {
            if (key === 'tour') onTour?.()
            if (key === 'admin') navigate('/admin')
            if (key === 'logout') onLogout?.()
        },
    }

    // Beneficios gratis en una sola tarjeta, una fila por tipo. El ⓘ de Pop
    // explica qué es: casi nadie lo sabe todavía. En celular van en la hoja
    // del "+".
    const usarGratis = (fn) => () => { setHojaAlta(false); fn?.() }
    const regalos = (gratis > 0 || gratisPop > 0) && (
        <div className={styles.regalos}>
            <span className={styles.regalosTitulo}><Gift size={13} /> {t('planner_free.title')}</span>
            {gratis > 0 && (
                <button type='button' className={styles.regalo} onClick={usarGratis(onGratis)}>
                    <span className={styles.regaloIcono}><Gift size={15} /></span>
                    <span className={styles.regaloTexto}>{t('planner_free.regular')}</span>
                    <span className={styles.regaloCuenta}>×{gratis}</span>
                    <ChevronRight size={16} className={styles.regaloFlecha} />
                </button>
            )}
            {gratisPop > 0 && (
                <button type='button' className={styles.regalo} onClick={usarGratis(onGratisPop)}>
                    <span className={styles.regaloIcono}><Zap size={15} /></span>
                    <span className={styles.regaloTexto}>
                        {t('planner_free.pop')}
                        <Popover
                            trigger={['hover', 'click']}
                            placement={celular ? 'top' : 'right'}
                            content={<p className={styles.queEsPop}>{t('planner_free.pop_what')}</p>}
                            title={t('planner_free.pop_what_title')}
                        >
                            <span
                                className={styles.info}
                                role='button'
                                tabIndex={0}
                                aria-label={t('planner_free.pop_what_title')}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Info size={13} />
                            </span>
                        </Popover>
                    </span>
                    <span className={styles.regaloCuenta}>×{gratisPop}</span>
                    <ChevronRight size={16} className={styles.regaloFlecha} />
                </button>
            )}
        </div>
    )

    // Mientras cargan las invitaciones: esqueleto de la vista que va a salir
    // (antes, la página se quedaba en blanco).
    const contenido = loading
        ? (enDashboard ? null : <PlannerSkeleton variante={!activa || activa.key === 'test' ? 'explora' : 'lista'} />)
        : enDashboard ? dashboard : activa?.key === 'test' ? (
        <PlannerExplore
            ejemplo={esCliente ? undefined : activa.items[0]}
            onRegalar={esCliente ? onRegalar : undefined}
            completo={esCliente}
            renderInvitationCard={renderInvitationCard}
            onVer={() => onAbrir(activa.items[0])}
            onCompartir={() => onCompartir(activa.items[0])}
        />
    ) : activa?.items.length > 0 ? (
        <PlannerEventList
            key={activa.key}
            items={activa.items}
            statsPorId={statsPorId}
            renderInvitationCard={renderInvitationCard}
            onAbrir={onAbrir}
            vacioProximos={activa.key === 'own'
                ? { texto: t('planner_list.no_upcoming_own'), cta: t('invitations.planner_own_empty_cta'), onCta: onEventoPersonal }
                : activa.key === 'pops'
                    ? { texto: t('planner_list.no_upcoming_pops'), ...(!esCliente || gratisPop > 0 ? { cta: t('invitations.planner_pops_empty_cta'), onCta: crearPop } : {}) }
                    : { texto: t('planner_list.no_upcoming_clients'), cta: t('invitations.planner_buy_title'), onCta: onComprar }}
        />
    ) : activa?.key === 'pops' ? (
        <div className={styles.vacio}>
            <Zap size={28} />
            <strong>{t('invitations.planner_pops_empty_title')}</strong>
            <span>{t(esCliente ? 'invitations.planner_pops_empty_text_client' : 'invitations.planner_pops_empty_text')}</span>
            {(!esCliente || gratisPop > 0) && (
                <button type='button' className={styles.vacioBoton} onClick={crearPop}>
                    <Plus size={16} /> {t('invitations.planner_pops_empty_cta')}
                </button>
            )}
        </div>
    ) : activa?.key === 'own' ? (
        <div className={styles.vacio}>
            <CalendarHeart size={28} />
            <strong>{t(esCliente ? 'invitations.empty_title' : 'invitations.planner_own_empty_title')}</strong>
            <span>{t(esCliente ? 'invitations.empty_text' : 'invitations.planner_own_empty_text')}</span>
            <button type='button' className={styles.vacioBoton} onClick={esCliente ? onComprar : onEventoPersonal}>
                <Plus size={16} /> {t(esCliente ? 'invitations.empty_cta' : 'invitations.planner_own_empty_cta')}
            </button>
        </div>
    ) : (
        <div className={styles.vacio}>
            <CalendarHeart size={28} />
            <strong>{t('invitations.planner_clients_empty_title')}</strong>
            <span>{t('invitations.planner_clients_empty_text')}</span>
            <button type='button' className={styles.vacioBoton} onClick={onComprar}>
                <Plus size={16} /> {t('invitations.planner_buy_title')}
            </button>
        </div>
    )

    const iniciales = (user?.name || '?').trim().charAt(0).toUpperCase()

    if (celular) {
        const pestanas = [
            { key: 'test', label: t('invitations.planner_tab_explore'), icon: Compass },
            { key: 'clients', label: t('invitations.planner_tab_clients'), icon: Users },
            { key: 'nuevo' },
            { key: 'own', label: t('invitations.planner_tab_own'), icon: CalendarHeart },
            { key: 'pops', label: t('invitations.planner_tab_pops'), icon: Zap },
            { key: 'data', label: t('planner.segment_data'), icon: LayoutDashboard },
        ].filter(p => !esCliente || (p.key !== 'clients' && p.key !== 'data'))
        // Cliente: Explora · Eventos · + · Pops (el "+" sigue entre las pestañas).
        if (esCliente) pestanas.splice(1, 0, ...pestanas.splice(pestanas.findIndex(p => p.key === 'own'), 1))
        const pestanaActiva = enDashboard ? 'data' : activa?.key
        const tieneGratis = gratis > 0 || gratisPop > 0

        return (
            <div className={styles.movil}>
                <main className={`${styles.main} ${styles.mainMovil}`}>
                    <header className={styles.barraMovil}>
                        {enDashboard
                            ? <h1 className={styles.tituloMovilDashboard}>{t('planner.segment_data')}</h1>
                            : <img src={logoBlue} alt='I attend' className={styles.logoMovil} />}
                        <Dropdown menu={menuUsuario} trigger={['click']} placement='bottomRight'>
                            <button type='button' className={styles.avatar} aria-label={user?.name}>{iniciales}</button>
                        </Dropdown>
                    </header>

                    {!enDashboard && <h1 className={styles.titulo}>{greeting}</h1>}
                    {!enDashboard && activa?.key === 'test' && (
                        <button type='button' className={`${styles.conoce} ${styles.conoceMovil}`} onClick={onTour}>
                            <Sparkles size={15} /> {t('invitations.planner_menu_tour')}
                        </button>
                    )}

                    <div className={styles.contenidoMovil}>{contenido}</div>

                    {enDashboard && <PlannerFeedback variante='fila' />}
                </main>

                <nav className={styles.pestanas} style={{ gridTemplateColumns: `repeat(${pestanas.length}, minmax(0, 1fr))` }} aria-label={t('invitations.planner_nav_label')}>
                    {pestanas.map(p => {
                        if (p.key === 'nuevo') {
                            return (
                                <button
                                    key='nuevo'
                                    type='button'
                                    className={styles.pestanaNuevo}
                                    aria-label={t('invitations.planner_new_title')}
                                    onClick={() => (tieneGratis ? setHojaAlta(true) : onComprar())}
                                >
                                    <Plus size={26} strokeWidth={2.5} />
                                </button>
                            )
                        }
                        const Icono = p.icon
                        const activaP = pestanaActiva === p.key
                        return (
                            <button
                                key={p.key}
                                type='button'
                                className={`${styles.pestana} ${activaP ? styles.pestanaActiva : ''}`}
                                aria-current={activaP ? 'page' : undefined}
                                onClick={() => (p.key === 'data' ? onViewChange('data') : abrirSeccion(p.key))}
                            >
                                <span className={styles.pestanaIcono}><Icono size={20} strokeWidth={activaP ? 2.4 : 1.8} /></span>
                                <span>{p.label}</span>
                            </button>
                        )
                    })}
                </nav>

                <Drawer
                    open={hojaAlta}
                    onClose={() => setHojaAlta(false)}
                    placement='bottom'
                    closable={false}
                    height='auto'
                    styles={{ wrapper: { height: 'auto', borderRadius: '20px 20px 0 0', overflow: 'hidden' }, section: { borderRadius: '20px 20px 0 0' }, body: { padding: 0 } }}
                >
                    <div className={styles.hoja}>
                        <span className={styles.hojaAsa} />
                        <div className={styles.hojaCabeza}>
                            <h2 className={styles.hojaTitulo}>{t('invitations.planner_new_title')}</h2>
                            <button type='button' className={styles.hojaCerrar} onClick={() => setHojaAlta(false)} aria-label={t('planner_feedback.cancel')}>
                                <X size={18} />
                            </button>
                        </div>
                        <button type='button' className={styles.comprar} onClick={usarGratis(onComprar)}>
                            <span className={styles.comprarIcono}><Plus size={16} strokeWidth={2.5} /></span>
                            <span>{t('invitations.planner_buy_title')}</span>
                            {descuento > 0 && <span className={styles.descuento}>−{descuento}%</span>}
                        </button>
                        {regalos}
                    </div>
                </Drawer>
            </div>
        )
    }

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <img src={logoBlue} alt='I attend' className={styles.logo} />

                <div className={styles.acciones}>
                    <button type='button' className={styles.comprar} onClick={onComprar}>
                        <span className={styles.comprarIcono}><Plus size={16} strokeWidth={2.5} /></span>
                        <span>{t('invitations.planner_buy_title')}</span>
                        {descuento > 0 && <span className={styles.descuento}>−{descuento}%</span>}
                    </button>
                    {regalos}
                </div>

                <nav className={styles.nav} aria-label={t('invitations.planner_nav_label')}>
                    <span className={styles.navTitulo}>{t('invitations.planner_nav_label')}</span>
                    {secciones.map(s => (
                        <button
                            key={s.key}
                            type='button'
                            className={`${styles.navItem} ${!enDashboard && activa?.key === s.key ? styles.navItemActivo : ''}`}
                            aria-current={!enDashboard && activa?.key === s.key ? 'page' : undefined}
                            onClick={() => abrirSeccion(s.key)}
                        >
                            <span>{s.title}</span>
                            {!(esCliente && s.key === 'test') && <small>{s.items.length}</small>}
                        </button>
                    ))}

                    {!esCliente && (
                        <button
                            type='button'
                            className={`${styles.navItem} ${styles.navDashboard} ${enDashboard ? styles.navItemActivo : ''}`}
                            aria-current={enDashboard ? 'page' : undefined}
                            onClick={() => onViewChange('data')}
                        >
                            <span className={styles.navConIcono}><LayoutDashboard size={16} /> {t('planner.segment_data')}</span>
                        </button>
                    )}
                    {enDashboard && (
                        // PlannerDashboard dibuja aquí su filtro de eventos (portal)
                        <div ref={setFilterSlot} className={styles.filtro} />
                    )}

                    {esAdmin && (
                        <button type='button' className={styles.navItem} onClick={() => navigate('/admin')}>
                            <span className={styles.navConIcono}><Shield size={16} /> {t('invitations.planner_menu_admin')}</span>
                        </button>
                    )}
                </nav>

                <div className={styles.pie}>
                    {!esCliente && (
                        <div className={styles.sugerencias}>
                            <PlannerFeedback />
                        </div>
                    )}
                    <Dropdown menu={menuUsuario} trigger={['click']} placement='topLeft'>
                        <button type='button' className={styles.usuario}>
                            <span className={styles.avatar}>{iniciales}</span>
                            <span className={styles.usuarioNombre}>{user?.name?.split(' ')[0]}</span>
                        </button>
                    </Dropdown>
                </div>
            </aside>

            <main className={styles.main}>
                <div className={`${styles.encabezadoWrap} ${enDashboard ? styles.encabezadoOculto : ''}`} aria-hidden={enDashboard}>
                    <div className={styles.encabezadoInner}>
                        <div className={styles.encabezado}>
                            <h1 className={styles.titulo}>{greeting}</h1>
                            <button type='button' className={styles.conoce} onClick={onTour} tabIndex={enDashboard ? -1 : undefined}>
                                <Sparkles size={15} /> {t('invitations.planner_menu_tour')}
                            </button>
                        </div>
                    </div>
                </div>

                {contenido}
            </main>
        </div>
    )
}
