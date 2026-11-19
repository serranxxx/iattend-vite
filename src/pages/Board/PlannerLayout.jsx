import { useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Drawer, Dropdown, Grid, Popover } from 'antd'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarHeart, Check, ChevronRight, ChevronsUpDown, ChevronUp, Gift, House, Info, LayoutDashboard, LayoutGrid, LogOut, Palette, Plus, Shield, Sparkles, Users, X, Zap } from 'lucide-react'
import { PlannerExplore } from './PlannerExplore'
import { PlannerFeedback } from './PlannerFeedback'
import { PlannerEventList } from './PlannerEventList'
import { buildStats, fetchPlannerData } from '../../components/PlannerDashboard/plannerData'
import styles from './PlannerLayout.module.css'
import { PlannerSkeleton } from './PlannerSkeleton'
import { PopsSection } from './PopsSection'
import { PopsInicio } from './PopsInicio'
import { PopsTemaSwitch } from './PopsTemaSwitch'
import { PopsInicioAzul } from './PopsInicioAzul'
import { usePopsTransicion } from './usePopsTransicion'
import { TEMAS_POPS, TEMA_POPS_FIJO, temaBasePops, usePopsTema } from './usePopsTema'
import { useTextures } from '../../context/TexturesContext'
import { PopsOnboarding } from '../../components/PopsOnboarding/PopsOnboarding'
import { PopsVideo } from '../../components/PopsOnboarding/PopsVideo'
import { FooterApp } from '../../modules/Footer/FooterApp'
import { EspacioSelector } from './EspacioSelector'
import { ESPACIO_GUARDADO, claveSeccion } from '../../helpers/invitation/espacios'


/**
 * /invitations de un planner (exclusivo de ese rol; el resto de cuentas usa
 * la página de siempre). Toda la navegación vive en la barra lateral:
 *   - Comprar evento y, si tiene, sus eventos gratis → drawer de alta
 *     (PlannerEventDrawer).
 *   - Invitaciones: Explora I attend (carrusel + su invitación de ejemplo
 *     `is_test`, si la tiene), Mis clientes y Mis eventos (PlannerEventList:
 *     Próximos + Historial). La sección va en la URL (?seccion=…) y se
 *     recuerda en la pestaña; sin nada, Explora I attend.
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
 * y su avatar con el menú; abajo la barra flotante (handoff "Pops mobile"):
 * una pastilla con Explora · Clientes · Eventos · Pops · Dashboard (con 5 se
 * recorre de lado) y el "+" aparte, que abre "Comprar evento" (o la hoja con
 * sus eventos regulares gratis, si tiene). En Pops la página es PopsSection
 * `movil` a todo lo ancho, la pestaña activa va en negro y el "+" en lima.
 * "¿Te falta algo?" va como fila al final del dashboard.
 *
 * Pops en escritorio (handoff "Sección Pops"): la barra cambia a la estética
 * pop (blanca, pastillas) y el contenido es PopsSection; entrar y salir van
 * con la transición circular desde el botón Pops (usePopsTransicion).
 *
 * Espacios (handoff "Switch de espacios", 4a · Logo desplegable): la app se
 * separa en Weddings y Pops, cada uno con su menú Inicio · Clientes · Eventos
 * (nada se mezcla: Clientes de Weddings = solo bodas, de Pops = solo Pops). El
 * logo de la barra (o del header en celular) es el selector (EspacioSelector).
 * Weddings: Inicio = Explora I attend; Pops: Inicio = PopsSection con todos
 * sus Pops, y Clientes / Eventos son la lista de siempre con la estética pop.
 * Una cuenta de cliente solo con Pops (sin una boda real) entra directo a Pops
 * y sin selector; sin Pops ni Pops gratis, solo Weddings.
 *
 * `esCliente`: el mismo layout para una cuenta de cliente (InvitationsPage lo
 * usa para todos): sin Clientes, Dashboard, Administrador, "¿Te falta algo?"
 * ni invitación de ejemplo; Explora es solo el carrusel (con su slide de
 * regalo, `onRegalar`) y Eventos son todas sus invitaciones.
 */
// Espacio y sección van en la URL (?espacio=pops, Weddings = sin parámetro;
// ?seccion=clients|own, Inicio = sin parámetro) para compartir el link directo
// y que recargar deje todo donde estaba. Los dos se recuerdan en la pestaña
// (sessionStorage; la sección, por espacio): un `/invitations` pelón (salir de
// un Pop o de un evento) regresa al último espacio y a su última sección.
// `?espacio=pops` sin sección = Inicio de Pops. `?seccion=pops` (links de
// antes) se vuelve `?espacio=pops`. Una pestaña nueva entra a Inicio de Weddings.
const ESPACIO_PARAM = 'espacio'
const SECCION_PARAM = 'seccion'
// En Pops el estilo también va en la URL (?tema=pop|business|craft): un link
// compartido abre con ese estilo (y se queda guardado, usePopsTema `forzar`).
const TEMA_PARAM = 'tema'
const leer = (clave) => { try { return sessionStorage.getItem(clave) } catch { return null } }
const guardar = (clave, valor) => { try { sessionStorage.setItem(clave, valor) } catch { /* sin storage */ } }
const leerLocal = (clave) => { try { return localStorage.getItem(clave) } catch { return null } }
const guardarLocal = (clave, valor) => { try { localStorage.setItem(clave, valor) } catch { /* sin storage */ } }

// Boda "real" de un cliente: de pago o ya empezada. El alta gratis
// (/api/invitation/create-free) le crea a toda cuenta nueva una invitación
// plan free vacía, también a quien solo compró un Pop: esa no lo hace de Weddings.
const esBodaReal = (inv) => inv.started === true || Boolean(inv.plan && String(inv.plan).toLowerCase() !== 'free')
const fechaDe = (inv) => (inv.event_date ? String(inv.event_date).slice(0, 10) : null)

export const PlannerLayout = ({
    esCliente = false,
    greeting, user, invitations, beneficios, esDeCliente, renderInvitationCard,
    view, onViewChange, dashboard, setFilterSlot, loading,
    onComprar, onComprarPop, onGratis, onGratisPop, onEventoPersonal, onRegalar, onTour, onLogout, onAbrir, onCompartir,
}) => {
    const { t, i18n } = useTranslation()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
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
    const gratis = beneficios?.free_events ?? 0
    const gratisPop = beneficios?.free_flash_events ?? 0
    const descuento = beneficios?.discount_pct ?? 0

    const pops = lista.filter(inv => inv._pop)
    const bodas = lista.filter(inv => !inv._pop)

    // Tipo de cuenta (la misma clasificación de Admin › Usuarios › Clientes):
    // planner y admin ven los dos espacios. Un cliente con Pops y sin una boda
    // real es de Pops: entra a Pops y sin selector; sin Pops ni Pops gratis
    // para crearlos, de Weddings; con los dos, ve el selector y arranca en
    // Weddings (salvo que el link diga `?espacio=pops`).
    const soloPops = esCliente && pops.length > 0 && !bodas.some(esBodaReal)
    const soloWeddings = esCliente && pops.length === 0 && gratisPop === 0
    const tipoCuenta = soloPops ? 'pops' : soloWeddings ? 'weddings' : 'ambos'
    // Se recuerda por cuenta (localStorage) para que, mientras cargan sus
    // eventos, un cliente de Pops no vea primero Weddings y luego salte.
    const claveTipo = esCliente && user?.uid ? `iattend_tipo_cuenta_${user.uid}` : null
    const tipoGuardado = claveTipo ? leerLocal(claveTipo) : null
    const tipoVigente = loading ? tipoGuardado : (esCliente ? tipoCuenta : null)
    const forzado = tipoVigente === 'pops' || tipoVigente === 'weddings' ? tipoVigente : null
    const puedeCambiar = !esCliente || tipoVigente === 'ambos'
    useEffect(() => {
        if (!loading && claveTipo) guardarLocal(claveTipo, tipoCuenta)
    }, [loading, claveTipo, tipoCuenta])

    const espacioUrl = searchParams.get(ESPACIO_PARAM)
    const seccionUrl = searchParams.get(SECCION_PARAM)
    const popsViejo = seccionUrl === 'pops'
    const espacio = forzado
        ?? (popsViejo || espacioUrl === 'pops' ? 'pops'
            : espacioUrl === 'weddings' ? 'weddings'
                : leer(ESPACIO_GUARDADO) === 'pops' ? 'pops' : 'weddings')
    const enPops = espacio === 'pops'

    // Cada espacio con el mismo menú. Pops › Inicio lleva todos sus Pops;
    // Clientes y Eventos se reparten igual que en Weddings.
    const secciones = (enPops ? [
        { key: 'test', title: t('invitations.space_home'), items: pops },
        { key: 'clients', title: t('invitations.planner_tab_clients'), items: pops.filter(esDeCliente) },
        { key: 'own', title: t('invitations.space_my_pops'), items: pops.filter(inv => !esDeCliente(inv)) },
    ] : [
        { key: 'test', title: t('invitations.space_home'), items: esAdmin ? pruebasAdmin.slice(0, 1) : bodas.filter(esEjemplo) },
        { key: 'clients', title: t('invitations.planner_tab_clients'), items: bodas.filter(esDeCliente) },
        { key: 'own', title: t('invitations.planner_tab_own'), items: bodas.filter(inv => !esDeCliente(inv) && !esEjemplo(inv)) },
    ]).filter(s => !esCliente || s.key !== 'clients')

    // De la URL; con `?espacio=` y sin sección, Inicio (link directo); pelón,
    // la última de ese espacio en esta pestaña. Si no existe (p. ej. Clientes
    // en una cuenta de cliente), Inicio.
    const enUrl = popsViejo ? null : seccionUrl
    const elegida = enUrl ?? (espacioUrl || popsViejo ? null : leer(claveSeccion(espacio)))
    const activa = secciones.find(s => s.key === elegida) ?? secciones[0]


    useEffect(() => {
        guardar(ESPACIO_GUARDADO, espacio)
        guardar(claveSeccion(espacio), activa.key)
    }, [espacio, activa.key])

    // Cambia la sección (y sale del dashboard) en un solo cambio de URL. Se
    // guarda antes: sin `?seccion=` (Inicio) se lee la guardada.
    const setElegida = (key) => {
        guardar(claveSeccion(espacio), key)
        setSearchParams(prev => {
            if (key === 'test') prev.delete(SECCION_PARAM)
            else prev.set(SECCION_PARAM, key)
            prev.delete('view')
            return prev
        }, { replace: true })
    }

    // Resumen de cada espacio para el selector ("3 bodas · próxima 14 feb",
    // "6 Pops activos · próximo en 4 días").
    const resumenEspacios = useMemo(() => {
        const hoy = dayjs().startOf('day')
        const enIngles = i18n.language?.startsWith('en')
        const corta = (f) => new Date(`${f}T00:00:00`).toLocaleDateString(enIngles ? 'en-US' : 'es-MX', { day: 'numeric', month: 'short' }).replace('.', '')
        const proxima = (items) => items.map(fechaDe).filter(f => f && !dayjs(f).isBefore(hoy)).sort()[0] ?? null

        const deBodas = bodas.filter(inv => (esCliente ? esBodaReal(inv) : !esEjemplo(inv)))
        const boda = proxima(deBodas)
        const activos = pops.filter(inv => !fechaDe(inv) || !dayjs(fechaDe(inv)).isBefore(hoy))
        const pop = proxima(activos)
        const dias = pop ? dayjs(pop).diff(hoy, 'day') : null
        return {
            weddings: [
                t('invitations.space_weddings_count', { count: deBodas.length }),
                boda && t('invitations.space_weddings_next', { date: corta(boda) }),
            ].filter(Boolean).join(' · '),
            pops: [
                t('invitations.space_pops_count', { count: activos.length }),
                dias === 0 ? t('invitations.space_pops_next_today') : dias !== null && t('invitations.space_pops_next', { count: dias }),
            ].filter(Boolean).join(' · '),
        }
    }, [lista, esCliente, i18n.language])
    // "Conoce los Pops": modal con el video de onboarding (PopsOnboarding).
    const [conocePops, setConocePops] = useState(false)
    const popsRef = useRef(null)

    // Números de las tarjetas de Clientes y Eventos de Weddings (mismo
    // cálculo que el dashboard). Sin números para los Pops: con stats la
    // tarjeta pinta el lector de pases, que solo sabe abrir invitaciones.
    const conNumeros = bodas.filter(inv => esDeCliente(inv) || !esEjemplo(inv))
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
    // El dashboard es de Weddings (números de invitaciones).
    const enDashboard = view === 'data' && !enPops

    // Pie: el de la app, al fondo del contenido (no en Pops, que tiene su propia estética).
    const pie = <FooterApp className={styles.pieLegal} />

    // Pastilla de la barra inferior (celular): el botón activo siempre a la
    // vista (al montar sin animación; al cambiar de sección, deslizándose).
    const pastillaRef = useRef(null)
    const pestanaVisible = `${espacio}:${enDashboard ? 'data' : activa.key}`
    const pastillaMontada = useRef(false)
    useEffect(() => {
        const fila = pastillaRef.current
        const activo = fila?.querySelector('[data-activa]')
        if (!fila || !activo || fila.scrollWidth <= fila.clientWidth) return
        fila.scrollTo({
            left: activo.offsetLeft - (fila.clientWidth - activo.offsetWidth) / 2,
            behavior: pastillaMontada.current ? 'smooth' : 'auto',
        })
        pastillaMontada.current = true
    }, [celular, pestanaVisible])
    // Espacio Pops con su estética propia (escritorio y celular).
    const modoPops = enPops
    // Estilo de Pops (Pop | Business, handoff "Cambia tu estilo"): cambia la
    // sección, la barra lateral / inferior y el velo de entrada.
    // Con TEMA_POPS_FIJO (Collage azul) no hay selector ni ?tema= en la URL.
    const { tema: temaElegido, cambiar: cambiarTemaPops } = usePopsTema({ forzar: enPops && !TEMA_POPS_FIJO ? searchParams.get(TEMA_PARAM) : null })
    const temaPops = TEMA_POPS_FIJO ?? temaElegido
    const temaBase = temaBasePops(temaPops)
    const conSelectorTema = !TEMA_POPS_FIJO
    const business = temaBase === 'business'
    const modoBiz = modoPops && business
    const modoAzul = modoPops && temaPops === 'azul'
    const modoCraft = modoPops && temaPops === 'craft'
    // El mismo pie dentro de Pops, al final de su lista (en Craft, sobre una hoja de papel).
    const piePops = <FooterApp className={`${styles.piePops} ${temaPops === 'craft' ? styles.piePopsCraft : ''}`} />
    // El estilo de Pops en <html> mientras se está en la sección: lo leen los
    // paneles que se abren desde ahí (Comprar evento, Nuevo Pop), que antd
    // manda a <body>.
    useEffect(() => {
        if (!modoPops) return undefined
        const raiz = document.documentElement
        raiz.setAttribute('data-pops-tema', temaBase)
        return () => raiz.removeAttribute('data-pops-tema')
    }, [modoPops, temaBase])
    // Que la URL diga siempre el espacio, la sección y, en Pops, el estilo
    // (recargar, compartir el link con ese estilo).
    const temaUrl = searchParams.get(TEMA_PARAM)
    useEffect(() => {
        const quiereEspacio = enPops ? 'pops' : null
        const quiereSeccion = activa.key === 'test' ? null : activa.key
        const quiereTema = enPops && conSelectorTema ? temaPops : null
        if (espacioUrl === quiereEspacio && seccionUrl === quiereSeccion && temaUrl === quiereTema) return
        setSearchParams(prev => {
            if (quiereEspacio) prev.set(ESPACIO_PARAM, quiereEspacio)
            else prev.delete(ESPACIO_PARAM)
            if (quiereSeccion) prev.set(SECCION_PARAM, quiereSeccion)
            else prev.delete(SECCION_PARAM)
            if (quiereTema) prev.set(TEMA_PARAM, quiereTema)
            else prev.delete(TEMA_PARAM)
            return prev
        }, { replace: true })
    }, [enPops, activa.key, espacioUrl, seccionUrl, temaPops, temaUrl])

    // Craft usa la textura "Papel" del Laboratorio de texturas (tabla
    // textures); si cambia allá, cambia aquí. Sin ella, la de index.css.
    const { textures } = useTextures()
    const texturaPapel = textures.find(tx => tx.name?.trim().toLowerCase() === 'papel')?.image
    const varsCraft = modoCraft && texturaPapel ? { '--craft-textura-papel': `url("${texturaPapel}")` } : undefined
    const { ir: transicion, overlay: veloPops } = usePopsTransicion(popsRef, { tema: temaBase })
    // Al entrar a Pops (de otra sección, del dashboard o al volver de otra
    // página) se empieza siempre desde arriba. Con la transición, el salto
    // ocurre mientras el velo negro tapa la pantalla.
    useEffect(() => {
        if (modoPops) window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }, [modoPops])
    // Entrar o salir de Pops lleva la transición (origen: el selector del
    // logo); entre las secciones de un mismo espacio, directo.
    const navegar = (haciaPops, accion) => (haciaPops !== modoPops ? transicion(haciaPops, accion) : accion())

    // Crear un Pop: con uno gratis, directo a ese flujo; si no, la compra.
    const crearPop = gratisPop > 0 ? onGratisPop : onComprar
    // Un cliente solo crea Pops con los gratis que le asignaron.
    const puedeCrearPop = !esCliente || gratisPop > 0
    const comprarPop = onComprarPop ?? crearPop

    // setElegida también quita ?view=data: salir del dashboard va en el mismo cambio.
    const abrirSeccion = (key) => navegar(enPops, () => setElegida(key))

    // Otro espacio: a la última sección que se vio en él (o Inicio).
    const cambiarEspacio = (nuevo) => navegar(nuevo === 'pops', () => {
        guardar(ESPACIO_GUARDADO, nuevo)
        const seccion = leer(claveSeccion(nuevo))
        setSearchParams(prev => {
            if (nuevo === 'pops') prev.set(ESPACIO_PARAM, 'pops')
            else prev.delete(ESPACIO_PARAM)
            if (seccion && seccion !== 'test') prev.set(SECCION_PARAM, seccion)
            else prev.delete(SECCION_PARAM)
            prev.delete('view')
            return prev
        }, { replace: true })
    })

    const rolTexto = t(esAdmin ? 'invitations.role_admin'
        : !esCliente ? 'invitations.role_planner'
            : soloPops ? 'invitations.role_client_pops' : 'invitations.role_client')

    const selector = (movil) => (
        <EspacioSelector
            movil={movil}
            espacio={espacio}
            puedeCambiar={puedeCambiar}
            resumen={resumenEspacios}
            onElegir={cambiarEspacio}
            botonRef={popsRef}
            tema={enPops ? temaBase : undefined}
        />
    )

    // La flecha del bloque del usuario gira mientras su menú está abierto.
    const [menuUsuarioAbierto, setMenuUsuarioAbierto] = useState(false)
    const menuUsuario = {
        items: [
            { key: 'email', label: <span className={styles.menuCorreo}>{user?.email}</span>, disabled: true },
            { type: 'divider' },
            // Pops (handoff §10): Pops gratis con su cuenta y "Cambia tu estilo"
            // con el estilo actual; abre las tres opciones.
            ...(modoPops && gratisPop > 0 ? [{
                key: 'pops_gratis',
                label: <span className={styles.menuFila}>{t('invitations.menu_free_pops')}<span className={styles.menuCuenta}>{gratisPop}</span></span>,
                icon: <Gift size={14} />,
            }] : []),
            ...(modoPops && conSelectorTema ? [{
                key: 'estilo',
                label: <span className={styles.menuFila}>{t('pops_section.theme_title_short')}<span className={styles.menuEstilo}>{t(`pops_section.theme_${temaPops}`)}</span></span>,
                icon: <Palette size={14} />,
                popupClassName: modoCraft ? styles.menuCraft : modoBiz ? styles.menuBiz : styles.menuPop,
                children: TEMAS_POPS.map((op) => ({
                    key: `tema:${op}`,
                    label: <span className={styles.menuFila}>{t(`pops_section.theme_${op}`)}{op === temaPops && <Check size={14} />}</span>,
                })),
            }] : []),
            { key: 'tour', label: t('invitations.planner_menu_tour'), icon: <Sparkles size={14} /> },
            // En celular no hay barra lateral: Administrador va en este menú.
            ...(esAdmin && celular ? [{ key: 'admin', label: t('invitations.planner_menu_admin'), icon: <Shield size={14} /> }] : []),
            { key: 'logout', label: t('invitations.planner_menu_logout'), icon: <LogOut size={14} />, danger: true },
        ],
        onClick: ({ key }) => {
            if (key === 'pops_gratis') onGratisPop?.()
            if (key.startsWith('tema:')) {
                // El círculo del cambio sale del selector de estilo (si está a la vista).
                cambiarTemaPops(key.slice(5), document.querySelector('[aria-haspopup="listbox"]'), { movil: celular })
            }
            if (key === 'tour') onTour?.()
            if (key === 'admin') navigate('/admin')
            if (key === 'logout') onLogout?.()
        },
    }

    // Beneficios gratis en una sola tarjeta, una fila por tipo. El ⓘ de Pop
    // explica qué es: casi nadie lo sabe todavía. En celular van en la hoja
    // del "+".
    const usarGratis = (fn) => () => { setHojaAlta(false); fn?.() }
    // Cada espacio con sus gratis: los eventos en Weddings y los Pops en Pops.
    const gratisEnBarra = gratis > 0 && !enPops
    const popGratisEnBarra = gratisPop > 0 && enPops
    const regalos = (gratisEnBarra || popGratisEnBarra) && (
        <div className={styles.regalos}>
            <span className={styles.regalosTitulo}><Gift size={13} /> {t('planner_free.title')}</span>
            {gratisEnBarra && (
                <button type='button' className={styles.regalo} onClick={usarGratis(onGratis)}>
                    <span className={styles.regaloIcono}><Gift size={15} /></span>
                    <span className={styles.regaloTexto}>{t('planner_free.regular')}</span>
                    <span className={styles.regaloCuenta}>×{gratis}</span>
                    <ChevronRight size={16} className={styles.regaloFlecha} />
                </button>
            )}
            {popGratisEnBarra && (
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

    // Pops › Inicio: solo el encabezado de la sección (banda y collage, sin la
    // lista: sinLista); Clientes / Eventos, la lista sin el hero (sinHero).
    const popsSeccion = (movil, lista = false) => (
        <PopsSection
            movil={movil}
            pie={piePops}
            greeting={greeting}
            items={activa.items}
            // Los Pops gratis van en la barra lateral (el aviso era de la lista).
            gratisPop={0}
            puedeCrear={puedeCrearPop}
            onCrear={crearPop}
            onComprarPop={esCliente ? undefined : onComprarPop}
            onGratisPop={onGratisPop}
            onConoce={() => setConocePops(true)}
            onAbrir={onAbrir}
            tema={temaPops}
            onCambiarTema={conSelectorTema ? cambiarTemaPops : undefined}
            sinHero={lista}
            sinLista={!lista}
            // Debajo del encabezado de Inicio, el video de "Conoce los Pops".
            debajo={lista ? undefined : <PopsVideo movil={movil} tema={temaBase} onCrear={puedeCrearPop ? crearPop : undefined} />}
            titulo={lista ? t(activa.key === 'clients' ? 'invitations.space_pops_clients_title' : 'invitations.space_pops_own_title') : undefined}
            vacioLista={lista ? t(activa.key === 'clients' ? 'invitations.space_pops_clients_empty' : 'invitations.space_pops_own_empty') : undefined}
            // En Clientes, el correo del cliente al que le llegó cada Pop.
            conCorreo={lista && activa.key === 'clients'}
        />
    )

    // Pops › Inicio (handoff "Inicio de Pops", 1c, escritorio y celular): su
    // próximo Pop y Tu estilo, carrusel, "Así de rápido." y "Tips rápidos.".
    // En el celular, Tu estilo va compacto en el header (no en PopsInicio).
    const popsInicio = (movil) => (temaPops === 'azul' ? (
        // Collage azul · lima (handoff "App Pops", 4a / 4b).
        <PopsInicioAzul
            movil={movil}
            greeting={greeting}
            pops={activa.items}
            gratisPop={gratisPop}
            puedeCrear={puedeCrearPop}
            onCrear={crearPop}
            onConoce={() => setConocePops(true)}
            // "Ver precios →" abre la compra (con su precio); un cliente no compra.
            onVerPrecios={esCliente ? undefined : comprarPop}
            onAbrir={onAbrir}
            onVerTodos={() => abrirSeccion('own')}
            pie={piePops}
        />
    ) : (
        <PopsInicio
            movil={movil}
            tema={temaPops}
            greeting={greeting}
            pops={activa.items}
            gratisPop={gratisPop}
            puedeCrear={puedeCrearPop}
            onCrear={crearPop}
            onConoce={() => setConocePops(true)}
            onAbrir={onAbrir}
            onVerTodos={() => abrirSeccion('own')}
            pie={piePops}
            switchTema={movil || !conSelectorTema ? null : <PopsTemaSwitch enBarra tema={temaPops} onCambiar={(nuevo, el) => cambiarTemaPops(nuevo, el, { movil: false })} />}
        />
    ))

    // Mientras cargan las invitaciones: esqueleto de la vista que va a salir
    // (antes, la página se quedaba en blanco).
    const contenido = loading
        ? (enDashboard ? null : <PlannerSkeleton variante={activa.key === 'test' && !enPops ? 'explora' : 'lista'} />)
        : enDashboard ? dashboard
            : enPops ? (activa.key === 'test' ? popsInicio(false) : popsSeccion(false, true))
                : activa.key === 'test' ? (
                    <PlannerExplore
                        ejemplo={esCliente ? undefined : activa.items[0]}
                        onRegalar={esCliente ? onRegalar : undefined}
                        completo={esCliente}
                        renderInvitationCard={renderInvitationCard}
                        onVer={() => onAbrir(activa.items[0])}
                        onCompartir={() => onCompartir(activa.items[0])}
                    />
                ) : activa.items.length > 0 ? (
                    <PlannerEventList
                        key={activa.key}
                        items={activa.items}
                        statsPorId={statsPorId}
                        renderInvitationCard={renderInvitationCard}
                        onAbrir={onAbrir}
                        vacioProximos={activa.key === 'own'
                            ? { texto: t('planner_list.no_upcoming_own'), cta: t('invitations.planner_own_empty_cta'), onCta: onEventoPersonal }
                            : { texto: t('planner_list.no_upcoming_clients'), cta: t('invitations.planner_buy_title'), onCta: onComprar }}
                    />
                ) : activa.key === 'own' ? (
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

    const modalConocePops = (
        <PopsOnboarding open={conocePops} onClose={() => setConocePops(false)} onCrear={!esCliente || gratisPop > 0 ? crearPop : undefined} />
    )

    const botonComprar = enPops ? (
        puedeCrearPop && (
            <button type='button' className={styles.comprar} onClick={comprarPop}>
                <span className={styles.comprarIcono}><Plus size={16} strokeWidth={2.5} /></span>
                <span>{t('invitations.space_buy_pop')}</span>
                {descuento > 0 && <span className={styles.descuento}>−{descuento}%</span>}
            </button>
        )
    ) : (
        <button type='button' className={styles.comprar} onClick={onComprar}>
            <span className={styles.comprarIcono}><Plus size={16} strokeWidth={2.5} /></span>
            <span>{t('invitations.planner_buy_title')}</span>
            {descuento > 0 && <span className={styles.descuento}>−{descuento}%</span>}
        </button>
    )

    // Cliente que todavía no se sabe si es de Pops o de Weddings (primera vez
    // en este navegador, sin el tipo guardado): mientras cargan sus eventos,
    // un esqueleto sin barra ni espacio, para no enseñar Weddings y luego
    // saltar a Pops.
    if (esCliente && loading && !tipoGuardado) {
        return (
            <div className={styles.decidiendo}>
                <PlannerSkeleton variante='lista' />
            </div>
        )
    }

    if (celular) {
        // Barra inferior flotante (handoff "Pops mobile"): una pastilla con
        // las secciones del espacio y el botón crear aparte. Con Dashboard
        // (Weddings de un planner) son 4. El espacio se cambia desde el logo
        // del header (hoja inferior).
        const pestanas = [
            { key: 'test', label: t('invitations.space_home'), icon: House },
            { key: 'clients', label: t('invitations.planner_tab_clients'), icon: Users },
            { key: 'own', label: t(enPops ? 'invitations.space_my_pops' : 'invitations.planner_tab_own'), icon: enPops ? Zap : CalendarHeart },
            ...(!enPops ? [{ key: 'data', label: t('planner.segment_data'), icon: LayoutGrid }] : []),
        ].filter(p => !esCliente || (p.key !== 'clients' && p.key !== 'data'))
        const pestanaActiva = enDashboard ? 'data' : activa.key
        const conScroll = pestanas.length > 4
        // Weddings: con eventos regulares gratis, el "+" abre la hoja con
        // ellos; si no, directo a "Comprar evento". Pops: crear un Pop.
        const crear = enPops
            ? comprarPop
            : () => (gratis > 0 ? setHojaAlta(true) : onComprar())
        const mostrarCrear = !enPops || puedeCrearPop

        const avatarMenu = (
            <Dropdown menu={menuUsuario} trigger={['click']} placement='bottomRight'>
                <button type='button' className={styles.avatar} aria-label={user?.name}>{iniciales}</button>
            </Dropdown>
        )

        return (
            <div className={`${styles.movil} ${modoPops ? styles.movilPop : ''} ${modoBiz ? styles.movilBiz : ''} ${modoCraft ? styles.movilCraft : ''} ${modoAzul ? styles.movilAzul : ''}`} style={varsCraft}>
                {veloPops}
                {modalConocePops}
                {modoPops ? (
                    <main className={styles.mainMovilPop}>
                        <header className={`${styles.barraMovil} ${styles.barraMovilPop}`}>
                            {selector(true)}
                            {/* Tu estilo compacto (ícono + ▾) junto al avatar. */}
                            <div className={styles.barraMovilDerecha}>
                                {conSelectorTema && <PopsTemaSwitch enLinea tema={temaPops} onCambiar={(nuevo, el) => cambiarTemaPops(nuevo, el, { movil: true })} />}
                                {avatarMenu}
                            </div>
                        </header>
                        {loading
                            ? <PlannerSkeleton variante='lista' />
                            : activa.key === 'test' ? popsInicio(true) : popsSeccion(true, true)}
                    </main>
                ) : (
                    <main className={`${styles.main} ${styles.mainMovil}`}>
                        <header className={styles.barraMovil}>
                            {enDashboard
                                ? <h1 className={styles.tituloMovilDashboard}>{t('planner.segment_data')}</h1>
                                : selector(true)}
                            {avatarMenu}
                        </header>

                        {!enDashboard && <h1 className={styles.titulo}>{greeting}</h1>}
                        {!enDashboard && activa.key === 'test' && (
                            <button type='button' className={`${styles.conoce} ${styles.conoceMovil}`} onClick={onTour}>
                                <Sparkles size={15} /> {t('invitations.planner_menu_tour')}
                            </button>
                        )}

                        <div className={styles.contenidoMovil}>{contenido}</div>

                        {enDashboard && <PlannerFeedback variante='fila' />}

                        {pie}
                    </main>
                )}

                <div className={styles.barraInferior}>
                    <nav className={styles.pastilla} aria-label={t(enPops ? 'invitations.space_pops' : 'invitations.space_weddings')}>
                        <div ref={pastillaRef} className={`${styles.pastillaFila} ${conScroll ? styles.pastillaScroll : ''}`}>
                            {pestanas.map(p => {
                                const Icono = p.icon
                                const activaP = pestanaActiva === p.key
                                return (
                                    <button
                                        key={p.key}
                                        type='button'
                                        data-activa={activaP || undefined}
                                        className={styles.pestana}
                                        aria-current={activaP ? 'page' : undefined}
                                        onClick={() => (p.key === 'data' ? onViewChange('data') : abrirSeccion(p.key))}
                                    >
                                        <Icono size={19} strokeWidth={activaP ? 2.3 : 1.8} />
                                        <span>{p.label}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </nav>
                    {mostrarCrear && (
                        <button type='button' className={styles.crear} aria-label={t(enPops ? 'invitations.space_buy_pop' : 'invitations.planner_new_title')} onClick={crear}>
                            <Plus size={30} strokeWidth={2.2} />
                        </button>
                    )}
                </div>

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
        <div className={`${styles.layout} ${modoPops ? styles.layoutPop : ''} ${modoCraft ? styles.layoutCraft : ''}`} style={varsCraft}>
            {veloPops}
            {modalConocePops}
            <aside className={`${styles.sidebar} ${modoPops ? styles.sidebarPop : ''} ${modoBiz ? styles.sidebarBiz : ''} ${modoCraft ? styles.sidebarCraft : ''} ${modoAzul ? styles.sidebarAzul : ''}`}>
                {selector(false)}

                {(botonComprar || regalos) && (
                    <div className={styles.acciones}>
                        {botonComprar}
                        {regalos}
                    </div>
                )}

                <nav className={styles.nav} aria-label={t(enPops ? 'invitations.space_pops' : 'invitations.space_weddings')}>
                    <span className={styles.navTitulo}>{t(enPops ? 'invitations.space_pops' : 'invitations.space_weddings_eyebrow')}</span>
                    {secciones.map(s => {
                        const activo = !enDashboard && activa.key === s.key
                        // En Pops el activo toma la pastilla de cada estilo (.navPops).
                        const popActivo = activo && enPops
                        return (
                            <button
                                key={s.key}
                                type='button'
                                className={`${styles.navItem} ${activo ? styles.navItemActivo : ''} ${popActivo ? styles.navPops : ''}`}
                                aria-current={activo ? 'page' : undefined}
                                onClick={() => abrirSeccion(s.key)}
                            >
                                <span>{s.title}</span>
                                {/* Inicio sin contador; en Pops, tampoco sin Pops. */}
                                {s.key !== 'test' && !(enPops && s.items.length === 0) && (
                                    <small className={popActivo ? styles.navPopsCuenta : undefined}>{s.items.length}</small>
                                )}
                            </button>
                        )
                    })}

                    {!esCliente && !enPops && (
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
                        <button type='button' className={`${styles.navItem} ${enPops ? styles.navDashboard : ''}`} onClick={() => navigate('/admin')}>
                            <span className={styles.navConIcono}><Shield size={16} /> {t('invitations.planner_menu_admin')}</span>
                        </button>
                    )}
                </nav>

                <div className={styles.pie}>
                    {!esCliente && (
                        <div className={styles.sugerencias}>
                            <PlannerFeedback variante={modoCraft ? 'craft' : modoAzul ? 'azul' : modoPops && !modoBiz ? 'pop' : 'tarjeta'} />
                        </div>
                    )}
                    <Dropdown
                        menu={menuUsuario}
                        trigger={['click']}
                        placement='topLeft'
                        onOpenChange={setMenuUsuarioAbierto}
                        // Pops: el menú en el estilo de la sección (handoff §10).
                        rootClassName={modoPops ? (modoCraft ? styles.menuCraft : modoBiz ? styles.menuBiz : styles.menuPop) : undefined}
                    >
                        <button type='button' className={styles.usuario} data-abierto={menuUsuarioAbierto || undefined}>
                            <span className={styles.avatar}>{iniciales}</span>
                            <span className={styles.usuarioTextos}>
                                <span className={styles.usuarioNombre}>{user?.name?.split(' ')[0]}</span>
                                {/* Su rol (handoff "Switch de espacios": ADMINISTRADOR, CLIENTE POPS…). */}
                                <span className={styles.usuarioSub}>{rolTexto}</span>
                            </span>
                            {modoPops && (modoBiz
                                ? <ChevronsUpDown size={18} className={styles.usuarioFlecha} aria-hidden />
                                : <ChevronUp size={18} strokeWidth={2.4} className={styles.usuarioFlecha} aria-hidden />)}
                        </button>
                    </Dropdown>
                </div>
            </aside>

            <main className={`${styles.main} ${modoPops ? styles.mainPop : ''}`}>
                {!modoPops && <div className={`${styles.encabezadoWrap} ${enDashboard ? styles.encabezadoOculto : ''}`} aria-hidden={enDashboard}>
                    <div className={styles.encabezadoInner}>
                        <div className={styles.encabezado}>
                            <h1 className={styles.titulo}>{greeting}</h1>
                            <button type='button' className={styles.conoce} onClick={onTour} tabIndex={enDashboard ? -1 : undefined}>
                                <Sparkles size={15} /> {t('invitations.planner_menu_tour')}
                            </button>
                        </div>
                    </div>
                </div>}

                {contenido}

                {!modoPops && pie}
            </main>
        </div>
    )
}
