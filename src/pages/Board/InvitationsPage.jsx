import React, { useContext, useEffect, useState } from 'react'
import { message, Button, notification, Tooltip } from 'antd';
import { toFirstString } from '../../helpers/invitation/newInvitation';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { appContext } from '../../context';
import { RegalaIAttend } from '../../components/RegalaIAttend/RegalaIAttend';
import { ArrowRight, ClipboardList, FlaskConical, Gift, QrCode, Send, Share, Zap } from 'lucide-react';
import { NewInvitationDrawer } from '../../components/Create/NewInvitationDrawer';
import { GiftDrawer } from '../../components/Gift/GiftDrawer';
import { useTranslation } from 'react-i18next';
import { OnboardingWizard } from '../PreviewMood/OnboardingWizard';
import { useOnboardingDemoData } from '../PreviewMood/useOnboardingDemoData';
import { PlannerDashboard } from '../../components/PlannerDashboard/PlannerDashboard';
import { PlannerLayout } from './PlannerLayout';
import { fetchBeneficios } from '../PlannerEvent/plannerEventApi';
import { PlannerEventDrawer } from '../PlannerEvent/PlannerEventDrawer';
import { PlannerSendDrawer } from '../PlannerEvent/PlannerSendDrawer';
import { POP_PUBLIC_URL, fetchPopEvents, popComoInvitacion } from '../../helpers/invitation/popEvents';
import { esRolPlanner } from '../../helpers/roles';

const baseProd = "https://www.iattend.events"

export const InvitationsPage = () => {
    const { t } = useTranslation();

    const getGreeting = (name) => {
        const hour = new Date().getHours();
        const key = hour >= 6 && hour < 13 ? 'greet_morning'
            : hour >= 13 && hour < 20 ? 'greet_afternoon'
                : 'greet_night';
        const pool = t(`invitations.${key}`, { returnObjects: true, name });
        return pool[Math.floor(Math.random() * pool.length)];
    };

    const [invitationsCopy, setInvitationsCopy] = useState(null)
    const [loader, setLoader] = useState(false)
    const { pathname } = useLocation();
    const [invitationsNI, setInvitationsNI] = useState(null)
    const { logout, logged } = useContext(appContext)
    const sessions = JSON.parse(localStorage.getItem("session"));
    const [visible, setVisible] = useState(false)
    const [giftVisible, setGiftVisible] = useState(false)
    const [regalaVisible, setRegalaVisible] = useState(false)
    const [onboardingOpen, setOnboardingOpen] = useState(false)
    const { invitation: demoInvitation, buttons: demoButtons, invitationID: demoInvitationID } = useOnboardingDemoData()

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Planner o Administración (mismas funciones, helpers/roles.js).
    const isPlanner = esRolPlanner(sessions?.user?.role)
    // Vista del planner: sus invitaciones o la pestaña "Dashboard". Va en la
    // URL (?view=data) para que recargar no lo regrese a las cards.
    const view = isPlanner && searchParams.get('view') === 'data' ? 'data' : 'invitations'
    // Nodo del encabezado donde PlannerDashboard monta su filtro de eventos
    const [filterSlot, setFilterSlot] = useState(null)
    const setView = (value) => {
        if (value === 'data') searchParams.set('view', 'data')
        else searchParams.delete('view')
        setSearchParams(searchParams, { replace: true })
    }

    // "Mis clientes" = eventos ajenos que organiza; "Mis eventos" = los suyos
    // (incluida su invitación de prueba). "Dashboard" = todo evento donde está
    // asignado como planner, aunque también sea el dueño. La invitación de
    // prueba (`is_test`, copia de la plantilla de planners) solo entra mientras
    // no tenga ningún evento real: después inflaría sus números.
    const esDeCliente = (inv) => inv.planner_id === sessions?.user?.uid && inv.user_id !== sessions?.user?.uid
    // Badge "Ejemplo" (y estado solo con punto): la invitación de prueba de un
    // planner. Las de prueba de un admin son sus eventos de trabajo: sin badge.
    // Solo en la página del planner: un cliente cuya invitación quedó marcada
    // is_test (la de prueba de un planner es de un cliente real) la ve normal.
    const esEjemplo = (inv) => isPlanner && inv.is_test && sessions?.user?.role !== 'Administration'
    // Creado "para enviar después": todavía no tiene cliente (user_id vacío).
    const esPorEnviar = (inv) => esDeCliente(inv) && !inv.user_id
    // El dashboard del planner es de invitaciones: los Pops no entran.
    const asignadas = (invitationsNI ?? []).filter(inv => inv.planner_id === sessions?.user?.uid && !inv._pop)
    const plannerInvitations = asignadas.some(inv => !inv.is_test)
        ? asignadas.filter(inv => !inv.is_test)
        : asignadas

    // Beneficios del planner (eventos gratis y descuento) para las acciones de
    // arriba; un cliente también puede tener Pops gratis (Admin → Usuarios ›
    // Clientes). Si fallan, la página sigue sin ellos.
    const [beneficios, setBeneficios] = useState(null)
    const cargarBeneficios = () => fetchBeneficios()
        .then(({ data }) => setBeneficios(data.beneficios))
        .catch(error => console.error('No se pudieron cargar los beneficios del planner:', error.response?.data || error.message))
    useEffect(() => {
        cargarBeneficios()
    }, [isPlanner])

    // Alta de evento del planner (drawer): 'compra' | 'gratis' | 'pop-gratis' | null.
    const [altaEvento, setAltaEvento] = useState(null)
    // Evento "para enviar después" que el planner le va a mandar a su cliente.
    const [porEnviar, setPorEnviar] = useState(null)
    // Sus clientes que ya tienen cuenta (los dueños de sus eventos de cliente),
    // para mandarles otro evento sin volver a escribir su correo.
    const clientesExistentes = Object.values((invitationsNI ?? [])
        .filter(inv => esDeCliente(inv) && inv.user_id && inv.user_email)
        .reduce((acc, inv) => {
            const correo = String(inv.user_email).toLowerCase()
            const titulo = inv.data?.cover?.title?.text?.value || inv.name
            acc[correo] ??= { correo, eventos: [] }
            if (titulo && !acc[correo].eventos.includes(titulo)) acc[correo].eventos.push(titulo)
            return acc
        }, {}))
        .sort((a, b) => a.correo.localeCompare(b.correo))

    useEffect(() => {
        if (searchParams.get('welcome') === '1') {
            notification.success({
                message: '¡Bienvenido a I attend!',
                description: 'Tu evento ha sido creado. Personalízalo y compártelo cuando estés listo.',
                placement: 'topRight',
                duration: 6,
            })
            searchParams.delete('welcome')
            setSearchParams(searchParams, { replace: true })
        }
    }, [])

    // El evento free es solo el Save the Date: su título de portada es el de la
    // plantilla default, no el de la pareja. La tarjeta y el buscador usan este.
    const cardTitle = (inv) => inv?.plan === 'free'
        ? t('invitations.free_std_title')
        : (inv?.data?.cover?.title?.text?.value ?? '')

    const copyToClipboard = async (textToCopy) => {
        try {
            await navigator.clipboard.writeText(textToCopy);
            message.success('Link copiado')
        } catch (err) {
            console.error('Error al copiar el texto: ', err);
        }
    };

    // `sinBotones`: Explora I attend (PlannerExplore) ya tiene sus botones al lado.
    // `stats`: tarjetas de Mis clientes del planner (PlannerLayout): días que
    // faltan, confirmados y esperando, de buildStats (PlannerDashboard).
    const renderInvitationCard = (invitation, { sinBotones = false, stats = null } = {}) => (
        <div
            key={invitation.id}
            className="invitation-container"
        >
            {/* Full-bleed background image */}
            {toFirstString(invitation?.data?.cover?.image?.prod) && (
                <img
                    src={toFirstString(invitation.data.cover.image.prod)}
                    alt=""
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
            )}
            {/* Dark overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.5)',
                mixBlendMode: 'multiply',
            }} />

            {/* Text + buttons — pushed to bottom */}
            <div style={{
                position: 'relative', zIndex: 1,
                width: '100%', marginTop: 'auto',
                display: 'flex', flexDirection: 'column', gap: '4px',
                // Sin botones, el nombre quedaría pegado al borde de abajo.
                paddingBottom: sinBotones ? '14px' : 0,
            }}>
                <span className='invitation_name'>
                    {cardTitle(invitation)}
                </span>
                <span className='invitation_path'>
                    {invitation?.name}
                </span>
                {stats && (
                    <div className='invitation_stats'>
                        <div>
                            <strong>
                                {stats.daysLeft == null ? '—'
                                    : stats.daysLeft > 0 ? stats.daysLeft
                                        : stats.daysLeft === 0 ? t('invitations.stats_today') : '✓'}
                            </strong>
                            <span>
                                {stats.daysLeft == null ? t('invitations.stats_no_date')
                                    : stats.daysLeft > 0 ? t('invitations.stats_days', { count: stats.daysLeft })
                                        : stats.daysLeft === 0 ? t('invitations.stats_is_today') : t('invitations.stats_done')}
                            </span>
                        </div>
                        <div>
                            <strong>{stats.confirmed}</strong>
                            <span>{t('invitations.stats_confirmed')}</span>
                        </div>
                        <div>
                            <strong>{stats.waiting}</strong>
                            <span>{t('invitations.stats_waiting')}</span>
                        </div>
                    </div>
                )}
                {!sinBotones && <div className='invitation_btns_cont'>
                    <Button
                        disabled={!invitation.active}
                        icon={<ArrowRight size={16} />}
                        className='invitation_start_button'
                        onClick={() => abrirEvento(invitation)}
                    >
                        {t('invitations.btn_start')}
                    </Button>
                    {/* En Mis clientes del planner (llega `stats`): el lector de
                        pases en lugar de compartir, o "enviar a mi cliente" si
                        todavía no tiene cliente. */}
                    {esPorEnviar(invitation) ? (
                        <Tooltip title={t('invitations.send_to_client')}>
                            <Button
                                icon={<Send size={16} />}
                                className='invitation_url_button'
                                aria-label={t('invitations.send_to_client')}
                                onClick={() => setPorEnviar(invitation)}
                            />
                        </Tooltip>
                    ) : stats ? (
                        <Tooltip title={t('invitations.open_scanner')}>
                            <Button
                                disabled={!invitation.active}
                                icon={<QrCode size={16} />}
                                className='invitation_url_button'
                                aria-label={t('invitations.open_scanner')}
                                onClick={() => navigate(`/scanner?id=${invitation.id}`)}
                            />
                        </Tooltip>
                    ) : (
                        <Button
                            disabled={!invitation.active}
                            icon={<Share size={16} />}
                            className='invitation_url_button'
                            onClick={() => copyToClipboard(invitation._pop
                                ? POP_PUBLIC_URL(invitation._pop)
                                : `${baseProd}/${invitation?.data?.generals?.event?.label}/${invitation?.data?.generals?.event?.name}`)}
                        />
                    )}
                </div>}
            </div>

            {/* Status badge. En la invitación de prueba va solo el punto: su
                badge de la izquierda ("Ejemplo") ocupa más. */}
            <div
                className={`invitation_status${esEjemplo(invitation) ? ' invitation_status--dot' : ''}`}
                style={{ position: 'absolute', top: '22px', right: '22px', zIndex: 2 }}
                title={invitation.active ? t('invitations.status_active') : t('invitations.status_paused')}
                aria-label={invitation.active ? t('invitations.status_active') : t('invitations.status_paused')}
            >
                <div className='status_indicator' style={{ backgroundColor: invitation.active ? '#4ADE80' : '#FBBF24' }} />
                {!esEjemplo(invitation) && <span>{invitation.active ? t('invitations.status_active') : t('invitations.status_paused')}</span>}
            </div>

            {/* Esquina izquierda: invitación de prueba (`is_test`, no cuenta en
                estadísticas) y evento de un cliente que este usuario organiza
                como planner. Pueden coincidir, por eso van en fila. */}
            {(esEjemplo(invitation) || invitation._pop || esDeCliente(invitation)) && (
                <div style={{ position: 'absolute', top: '22px', left: '22px', zIndex: 2, display: 'flex', gap: '6px' }}>
                    {invitation._pop && (
                        <div className='invitation_status'>
                            <Zap size={12} />
                            <span>{t('invitations.pop_badge')}</span>
                        </div>
                    )}
                    {esEjemplo(invitation) && (
                        <div className='invitation_status'>
                            <FlaskConical size={12} />
                            <span>{t('invitations.test_badge')}</span>
                        </div>
                    )}
                    {esDeCliente(invitation) && (!invitation._pop || esPorEnviar(invitation)) && (
                        <div className='invitation_status'>
                            {esPorEnviar(invitation) ? <Send size={12} /> : <ClipboardList size={12} />}
                            <span>{esPorEnviar(invitation) ? t('invitations.pending_send_badge') : t('invitations.planner_badge')}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )

    const handleMoode = (id) => {
        const params = new URLSearchParams({ id });
        navigate(`/dashboard?${params.toString()}`);
    };

    // Un Pop no tiene dashboard de invitación: se abre su editor
    // (su id `flash-…` no es un uuid de invitations).
    const abrirEvento = (inv) => (inv._pop
        ? navigate(`/dashboard/side?pop=${inv._pop.id}`)
        : handleMoode(inv.id))

    const getNewInvitations = async () => {

        if (!sessions) {
            console.log("No hay usuario autenticado");
            logout();
            navigate(`/login`);
            setLoader(false);
            return;
        }

        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Error al obtener la sesión:", sessionError);
            return;
        }

        if (!session) {
            console.log("No hay usuario autenticado");
            return;
        }

        setLoader(true)

        // Un planner ve sus eventos propios más los de sus clientes
        // (invitations.planner_id); en pantalla se separan en dos secciones.
        // Se filtra por rol, igual que can_manage_invitation en la base.
        const uid = session.user.id
        let query = supabase.from("invitations").select("*")
        query = isPlanner
            ? query.or(`user_id.eq.${uid},planner_id.eq.${uid}`)
            : query.eq("user_id", uid)

        // Los Pops (side events sin invitación) van en la misma lista,
        // adaptados a la forma de una invitación (ver popEvents.js).
        const [{ data, error }, pop] = await Promise.all([
            query,
            fetchPopEvents(uid, { esPlanner: isPlanner }),
        ]);

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setLoader(false)
            setInvitationsNI([...(data ?? []), ...pop.map(popComoInvitacion)])
        }
    };

    useEffect(() => {
        getNewInvitations();
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    useEffect(() => {
        if (!logged) {
            getNewInvitations()
        }
    }, [logged])

    // Regreso de Stripe tras comprar un evento: el webhook lo crea por su
    // cuenta, así que se avisa y se vuelve a pedir la lista en unos segundos.
    useEffect(() => {
        if (searchParams.get('evento_planner') !== 'ok') return
        notification.success({
            message: t('invitations.planner_paid_title'),
            description: t('invitations.planner_paid_text'),
            placement: 'topRight',
            duration: 8,
        })
        searchParams.delete('evento_planner')
        setSearchParams(searchParams, { replace: true })
        const timer = setTimeout(() => getNewInvitations(), 5000)
        return () => clearTimeout(timer)
    }, [])

    useEffect(() => {
        if (searchParams.get("success") === "true") {
            getNewInvitations();
            setVisible(false);
            setSearchParams({});
        }
    }, [])



    useEffect(() => {
        setInvitationsCopy(invitationsNI)
    }, [invitationsNI])

    const name = sessions?.user?.name?.split(' ')[0] || 'Usuario';
    const [greeting] = useState(() => getGreeting(name));

    // Planner: layout propio con barra lateral (PlannerLayout). Los drawers y
    // el onboarding son los mismos que en la página de siempre.
    const modales = (
        <>
            <NewInvitationDrawer visible={visible} setVisible={setVisible} user={{ user_id: sessions?.user?.uid, user_email: sessions?.user?.email }} refreshInvitations={getNewInvitations} />
            <RegalaIAttend visible={regalaVisible} onClose={() => setRegalaVisible(false)} />
            <GiftDrawer visible={giftVisible} setVisible={setGiftVisible} />
            <OnboardingWizard
                open={onboardingOpen && !!demoInvitation}
                onClose={() => setOnboardingOpen(false)}
                invitation={demoInvitation}
                buttons={demoButtons}
                invitationID={demoInvitationID}
            />
        </>
    )

    // Todos usan el layout con barra lateral (PlannerLayout). Un cliente lo ve
    // sin Clientes, Dashboard, Administrador, "¿Te falta algo?" ni la
    // invitación de ejemplo; su "Comprar evento" es el checkout de siempre y
    // sus Pops gratis (Admin → Usuarios › Clientes) son siempre para él.
    return (
        <>
            <PlannerLayout
                esCliente={!isPlanner}
                greeting={greeting}
                user={sessions?.user}
                invitations={invitationsCopy}
                beneficios={beneficios}
                esDeCliente={esDeCliente}
                renderInvitationCard={renderInvitationCard}
                view={view}
                onViewChange={setView}
                dashboard={isPlanner ? <PlannerDashboard invitations={plannerInvitations} filterSlot={filterSlot} userId={sessions?.user?.uid} /> : null}
                setFilterSlot={setFilterSlot}
                // También antes de la primera carga (loader arranca en false
                // y el efecto corre después del primer pintado).
                loading={loader || invitationsCopy === null}
                onComprar={isPlanner ? () => setAltaEvento('compra') : () => navigate('/checkout')}
                onGratis={() => setAltaEvento('gratis')}
                onGratisPop={() => setAltaEvento('pop-gratis')}
                onEventoPersonal={() => navigate('/checkout')}
                onRegalar={() => setRegalaVisible(true)}
                onTour={() => setOnboardingOpen(true)}
                onLogout={() => { logout(); navigate('/login') }}
                onAbrir={abrirEvento}
                onCompartir={(inv) => copyToClipboard(`${baseProd}/${inv?.data?.generals?.event?.label}/${inv?.data?.generals?.event?.name}`)}
            />
            <PlannerEventDrawer
                open={!!altaEvento}
                modo={altaEvento ?? 'compra'}
                soloParaMi={!isPlanner}
                onClose={() => setAltaEvento(null)}
                onCreated={() => { getNewInvitations(); cargarBeneficios() }}
            />
            {isPlanner && (
                <PlannerSendDrawer
                    invitation={porEnviar}
                    clientes={clientesExistentes}
                    onClose={() => setPorEnviar(null)}
                    onSent={getNewInvitations}
                />
            )}
            {modales}
        </>
    )
}
