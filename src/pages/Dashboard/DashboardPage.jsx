import React, { useEffect, useRef, useState } from 'react'
import './dashboard.css'
import { Button, message } from 'antd'
import { toFirstString } from '../../helpers/invitation/newInvitation';
import { FooterApp } from '../../modules/Footer/FooterApp'
import { supabase } from '../../lib/supabase'
import { HeaderDashboard } from '../../modules/Header/Header'
import { load } from '../../helpers/assets/images'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, Sparkles, Star } from 'lucide-react'
import { ProModal } from '../../components/Payment/UpgradeBanner/UpgradeBanner'
import { PlansModal } from '../../components/Payment/PlansModal/PlansModal'
import { PlanActivationModal } from '../../components/Payment/PlanActivation/PlanActivationModal'
import { clearPendingPlan, readPendingPlan } from '../../components/Payment/functions'
import { FeedbackModal } from '../../components/FeedbackPrompt/FeedbackModal'
import { useFeedbackTrigger } from '../../components/FeedbackPrompt/useFeedbackTrigger'


const LANDING = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing';

// Contenido de muestra para las tarjetas bloqueadas del plan free. Sin él las
// tarjetas salen vacías (una invitación free no tiene portada ni invitados) y
// no se entiende qué se está comprando.
const LOCKED_DEMO = {
    cover: `${LANDING}/cover.jpg`,
    title: 'Andrés & Julieta',
    date: '2026-08-08',
    stats: { confirmed: 84, waiting: 12, available: 24 },
    guests: [
        { id: 'demo-1', name: 'Mariana Robles', tag: 'Familia', state: 'confirmado' },
        { id: 'demo-2', name: 'Diego Fuentes', tag: 'Amigos', state: 'confirmado' },
        { id: 'demo-3', name: 'Sofía Márquez', tag: 'Trabajo', state: 'esperando' },
    ],
};

export const DashboardPage = () => {

    const { t, i18n } = useTranslation()
    const [confirmed, setConfirmed] = useState(0)
    const [waiting, setWaiting] = useState(0)
    const [available, setAvailable] = useState(0)
    const [invitation, setInvitation] = useState(null)
    const [plan, setPlan] = useState(null)
    const [saveTheDate, setSaveTheDate] = useState(null)
    const [guestsSample, setGuestsSample] = useState([])
    const [sideNames, setSideNames] = useState([])
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const id = searchParams.get("id");
    const [createdAt, setCreatedAt] = useState(null)
    const [proOpen, setProOpen] = useState(false)
    const [plansOpen, setPlansOpen] = useState(false)
    const [activation, setActivation] = useState(null)
    const [activatedPlan, setActivatedPlan] = useState(null)
    const interBubbleRef = useRef(null)

    // El feedback dejó de vivir en el header: ahora es un banner del dashboard.
    const {
        visible: feedbackVisible,
        modalOpen: feedbackModalOpen,
        openModal: openFeedbackModal,
        closeModal: closeFeedbackModal,
        submit: submitFeedback,
    } = useFeedbackTrigger(id, createdAt)

    useEffect(() => {
        const el = interBubbleRef.current
        if (!el) return
        let curX = 0, curY = 0, tgX = 0, tgY = 0
        let rafId
        const move = () => {
            curX += (tgX - curX) / 20
            curY += (tgY - curY) / 20
            el.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`
            rafId = requestAnimationFrame(move)
        }
        const onMouseMove = (e) => { tgX = e.clientX; tgY = e.clientY }
        window.addEventListener('mousemove', onMouseMove)
        move()
        return () => { window.removeEventListener('mousemove', onMouseMove); cancelAnimationFrame(rafId) }
    }, [invitation, plan])

    const getData = async (invitation_id) => {

        // 1️⃣ Obtener invitación
        const { data: invitation, error } = await supabase
            .from("invitations")
            .select("tickets, plan, data, created_at")
            .eq("id", invitation_id)
            .single();

        if (error || !invitation) {
            console.error("Error al obtener invitación:", error);
            return;
        }

        setPlan(invitation?.plan)
        setInvitation(invitation?.data);
        setCreatedAt(invitation?.created_at ?? null);

        // Save the Date (quinto producto): la tarjeta cambia según exista o no la fila
        const { data: std } = await supabase
            .from("save_the_dates")
            .select("id, cover, event_date, active")
            .eq("invitation_id", invitation_id)
            .maybeSingle();
        setSaveTheDate(std ?? null);

        // Contenido real para las celdas del bento (best-effort, decorativo)
        const { data: sides } = await supabase
            .from("side_events")
            .select("id, name")
            .eq("invitation_id", invitation_id)
            .limit(3);
        setSideNames((sides ?? []).map(s => s.name).filter(Boolean));

        // 2️⃣ Obtener invitados
        const { data: guests, error: guestsError } = await supabase
            .from("guests")
            .select("*")
            .eq("invitation_id", invitation_id);

        if (guestsError) {
            console.error("Error al obtener invitados:", guestsError);
            return;
        }
        // 3️⃣ Filtrar estados
        const conf = guests.filter(g => g.state === "confirmado" || g.state === 'asistente').length;
        const wait = guests.filter(g => g.state === "esperando").length;

        setAvailable(invitation.tickets - (conf + wait))
        setConfirmed(conf);
        setWaiting(wait);
        setGuestsSample(guests.slice(0, 3));
    };

    useEffect(() => {
        if (id) {
            getData(id)
        } else {
            navigate("/invitations");
        }
    }, [id]);

    // Comprueba si el webhook ya escribió el plan comprado. Devuelve el plan
    // vigente cuando coincide con lo esperado, o null si todavía no.
    const checkActivation = async (invitationId, expected) => {
        const { data } = await supabase
            .from("invitations")
            .select("plan")
            .eq("id", invitationId)
            .maybeSingle();

        const current = data?.plan;
        return current && (!expected || current === expected) ? current : null;
    };

    // Stripe devuelve el navegador en cuanto cobra, pero el webhook que escribe
    // `invitations.plan` corre por su cuenta: se sondea hasta ver el cambio en
    // vez de dar por hecho que ya ocurrió.
    useEffect(() => {
        if (!id) return;

        const success = searchParams.get('success') === 'true';
        const canceled = searchParams.get('canceled') === 'true';
        if (!success && !canceled) return;

        // La URL se limpia de inmediato: recargar no debe repetir el flujo.
        setSearchParams({ id }, { replace: true });

        if (canceled) {
            clearPendingPlan();
            message.info(t('plan_activation.canceled'));
            return;
        }

        const expected = readPendingPlan(id);
        let dropped = false;
        let timer;

        const poll = async (attempt) => {
            const current = await checkActivation(id, expected);
            if (dropped) return;

            if (current) {
                clearPendingPlan();
                setActivatedPlan(current);
                setActivation('done');
                getData(id);
                return;
            }

            if (attempt >= 9) { setActivation('timeout'); return; }
            timer = setTimeout(() => poll(attempt + 1), 2000);
        };

        setActivatedPlan(expected);
        setActivation('pending');
        poll(0);

        return () => { dropped = true; clearTimeout(timer); };
    }, [id]);

    const retryActivation = async () => {
        setActivation('pending');
        const current = await checkActivation(id, readPendingPlan(id));

        if (current) {
            clearPendingPlan();
            setActivatedPlan(current);
            setActivation('done');
            getData(id);
            return;
        }
        setActivation('timeout');
    };

    // Gating del plan free: solo se muestra el módulo de Save the Date (§5.4)
    const isFree = plan === 'free';
    // Lite: el Photo Wall está bloqueado y el upsell a PRO deja de ser un banner
    // flotante para ocupar su propia celda del bento (col 4, fila 1).
    const isLite = plan === 'lite';

    // En free lo único usable es Save the Date: el resto se muestra bloqueado
    // y cualquier click lleva al selector de planes.
    const openSection = (path) => () => {
        if (isFree) { setPlansOpen(true); return }
        if (path === 'photowall' && isLite) { setProOpen(true); return }
        handleMoode(path)
    };

    // Módulo no contratado: la tarjeta conserva su color, pierde el detalle del
    // contenido y gana una barra de acción abajo. La barra va en absoluto para
    // no alterar la rejilla interna de cada tarjeta, que es distinta en cada una.
    const lockBar = (labelKey) => (
        <div className='bento_lock_bar'>
            <span className='bento_lock_bar_label'>
                <Lock size={14} strokeWidth={2.4} />
                <span>{t(labelKey)}</span>
            </span>
            <button type='button' className='bento_lock_bar_cta'>
                {t('dashboard.bento_unlock')}
            </button>
        </div>
    );

    const freeBar = lockBar('dashboard.bento_locked_free');
    // En lite el único módulo bloqueado es el Photo Wall, y su etiqueta apunta
    // a PRO en vez de a contratar.
    const wallLocked = isFree || isLite;

    const handleMoode = (path) => {
        const params = new URLSearchParams({ id });
        navigate(`/dashboard/${path}/?${params.toString()}`);
    };

    // ── Bento: datos derivados ──────────────────────────────
    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX';
    const fmtChip = (iso) => {
        const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
        const month = d.toLocaleDateString(lang, { month: 'short' }).replace('.', '');
        return { day: d.getDate(), month: month.charAt(0).toUpperCase() + month.slice(1), year: d.getFullYear() };
    };

    const realCoverImg = toFirstString(invitation?.cover?.image?.prod);
    const coverImg = isFree ? LOCKED_DEMO.cover : realCoverImg;
    const coverTitle = isFree ? LOCKED_DEMO.title : (invitation?.cover?.title?.text?.value ?? '');
    const coverChip = isFree
        ? fmtChip(LOCKED_DEMO.date)
        : (invitation?.cover?.date?.value ? fmtChip(invitation.cover.date.value) : null);

    // Con fondo de video no hay imagen que mostrar: se usa la "imagen para el
    // link" que el editor pide en ese caso.
    const stdMediaList = Array.isArray(saveTheDate?.cover?.image?.prod)
        ? saveTheDate.cover.image.prod
        : [toFirstString(saveTheDate?.cover?.image?.prod)].filter(Boolean);
    const stdFirstImage = stdMediaList.find((u) => typeof u === 'string' && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u));
    const stdImg = saveTheDate?.cover?.image?.poster || stdFirstImage || realCoverImg;
    const stdChip = saveTheDate?.event_date ? fmtChip(saveTheDate.event_date) : null;

    const stats = isFree ? LOCKED_DEMO.stats : { confirmed, waiting, available };
    const shownGuests = isFree ? LOCKED_DEMO.guests : guestsSample;
    const totalPasses = stats.confirmed + stats.waiting + stats.available;
    const totalGuests = Math.max(stats.confirmed + stats.waiting + Math.max(stats.available, 0), 1);
    const pctConfirmed = Math.min(100, Math.round((stats.confirmed / totalGuests) * 100));
    const pctWaiting = Math.min(100 - pctConfirmed, Math.round((stats.waiting / totalGuests) * 100));

    const initials = (name) => (name ?? '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '·';
    const AVATAR_BGS = ['#eeeadf', '#D1BEDD', '#b9bba6'];
    const isConfirmedState = (s) => s === 'confirmado' || s === 'asistente';

    const ENVELOPES = [
        { bg: '#1c3249', flap: '#16323d', color: '#fff', style: { left: 0, top: '6px', transform: 'rotate(-8deg)', width: '62%' } },
        { bg: '#b9bba6', flap: '#a9ab95', color: '#1c3249', style: { left: '22%', top: '34%', transform: 'rotate(3deg)', width: '62%' } },
        { bg: '#D1BEDD', flap: '#c1abd0', color: '#1c3249', style: { right: '-4%', top: '-4px', transform: 'rotate(10deg)', width: '58%' } },
    ];
    const envDefaults = ['Brunch', 'Despedida', 'Civil'];

    // Free y lite usan exactamente la rejilla de pro; la única diferencia es que
    // la celda del card de feedback la ocupa el CTA del plan.
    const hasCta = isFree || isLite;
    // Con CTA, la fila 3 deja de ser dos celdas de la rejilla y pasa a ser una
    // fila flex (`.bento_row3`): es la única forma de que Save the Date crezca
    // con `flex: 1` mientras el CTA queda topado por `max-width`.
    const stdGridStyle = plan === 'paperless'
        ? { gridColumn: '2 / span 3', gridRow: '1' }
        : { gridColumn: feedbackVisible ? '1 / span 2' : '1 / span 4', gridRow: '3' };
    const feedbackGridStyle = plan === 'paperless'
        ? { gridColumn: '2 / span 3', gridRow: '2' }
        : { gridColumn: '3 / span 2', gridRow: '3' };

    const ctaCard = isFree
        ? (
            <div className='bento_card bento_hire' onClick={() => setPlansOpen(true)}>
                <div className='bento_pro_badge'>
                    <Sparkles size={12} strokeWidth={2.6} />
                    <span>I ATTEND</span>
                </div>
                <div className='bento_title'>{t('dashboard.bento_hire_title')}</div>
                <div className='bento_pro_caption'>{t('dashboard.bento_hire_caption')}</div>
                <button type='button' className='bento_pro_cta'>
                    {t('dashboard.bento_hire_cta')}
                </button>
            </div>
        )
        : isLite ? (
            <div className='bento_card bento_pro' onClick={() => setProOpen(true)}>
                <div className='bento_pro_badge'>
                    <Sparkles size={12} strokeWidth={2.6} />
                    <span>PRO</span>
                </div>
                <div className='bento_title'>{t('dashboard.bento_pro_title')}</div>
                <div className='bento_pro_caption'>{t('dashboard.bento_pro_caption')}</div>
                <button type='button' className='bento_pro_cta'>
                    {t('dashboard.bento_pro_cta')}
                </button>
            </div>
        ) : null;

    const stdCard = (
        <div className='bento_card bento_std' style={hasCta ? undefined : stdGridStyle} onClick={() => handleMoode('savethedate')}>
            <div className='bento_std_bg'>
                {stdImg && <img src={stdImg} alt='' />}
            </div>
            <div className='bento_std_grad' />
            <div className='bento_std_row'>
                <div>
                    <div className='bento_title' style={{ color: '#fff' }}>{t('dashboard.card_save_the_date')}</div>
                    <div className='bento_std_caption'>{t('dashboard.bento_std_caption')}</div>
                </div>
                {saveTheDate && stdChip ?
                    <div className='bento_chip'>
                        <div className='bento_chip_month'>{stdChip.month}</div>
                        <div className='bento_chip_day'>{stdChip.day}</div>
                    </div>
                    :
                    <div className='bento_chip' style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap' }}>{t('dashboard.card_std_add')}</span>
                    </div>
                }
            </div>
        </div>
    );

    return (

        invitation && plan ?
            <div className='dashboard-page-container' style={{ overflow: 'hidden' }}>

                <HeaderDashboard mode={'dashboard'} invitation={invitation} />

                {/* <img src='/images/loop2.svg' alt='' className='loop_1' /> */}
                {/* <img src='/images/loop2.svg' alt='' className='loop_1_1' /> */}
                <div className='dashboard_body'>

                    {/* ── Gradient background ── */}
                    <div className="gradient-bg">

                        <div className="gradients-container">
                            <div className="g1" />
                            <div className="g2" />
                            <div className="g3" />
                            <div className="g4" />
                            <div className="g5" />
                            <div className="interactive" ref={interBubbleRef} />
                        </div>
                    </div>

                    <div className='dashboard_stack'>

                        <div className='bento_grid'>

                            {/* ── Invitación Paperless — lila, alta ── */}
                            <div
                                className={`bento_card bento_inv${isFree ? ' bento_locked' : ''}`}
                                onClick={openSection('build')}
                            >
                                    <div className='bento_title'>{t('dashboard.card_invitation')}</div>
                                    <div className='bento_inv_scene'>
                                        <div className='bento_inv_minicard'>
                                            <div className='bento_inv_photo'>
                                                {coverImg && <img src={coverImg} alt='' />}
                                            </div>
                                            <div className='bento_inv_names'>{coverTitle}</div>
                                            {coverChip && <div className='bento_inv_date'>{coverChip.day} · {coverChip.month} · {coverChip.year}</div>}
                                        </div>
                                    </div>
                                {isFree && freeBar}
                            </div>

                            {/* ── Gestión de invitados — salvia, ancha ── */}
                            {plan !== 'paperless' &&
                                <div
                                    className={`bento_card bento_guests${isFree ? ' bento_locked' : ''}`}
                                    onClick={openSection('guests')}
                                >
                                    <div className='bento_guests_left'>
                                        <div>
                                            <div className='bento_title'>{t('dashboard.card_guests')}</div>
                                            <div className='bento_caption' style={{ marginTop: '10px' }}>{t('dashboard.bento_guests_caption')}</div>
                                        </div>
                                        <div className='bento_stats'>
                                            <div><div className='bento_stat_num'>{stats.confirmed}</div><div className='bento_stat_label'>{t('dashboard.stat_confirmed')}</div></div>
                                            <div><div className='bento_stat_num'>{stats.waiting}</div><div className='bento_stat_label'>{t('dashboard.stat_waiting')}</div></div>
                                            <div><div className='bento_stat_num'>{stats.available}</div><div className='bento_stat_label'>{t('dashboard.stat_available')}</div></div>
                                        </div>
                                    </div>
                                    <div className='bento_sheet_wrap'>
                                        <div className='bento_sheet'>
                                            <div className='bento_sheet_head'>
                                                <span>{t('dashboard.card_guests')}</span>
                                                <span>{totalPasses} {t('dashboard.bento_passes')}</span>
                                            </div>
                                            <div className='bento_progress'>
                                                <div style={{ width: `${pctConfirmed}%`, background: '#1c3249' }} />
                                                <div style={{ width: `${pctWaiting}%`, background: '#D1BEDD' }} />
                                            </div>
                                            {shownGuests.map((g, i) => (
                                                <div className='bento_guest_row' key={g.id ?? i}>
                                                    <div className='bento_avatar' style={{ background: AVATAR_BGS[i % AVATAR_BGS.length] }}>{initials(g.name)}</div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div className='bento_guest_name'>{g.name}</div>
                                                        {g.tag && <div className='bento_guest_sub'>{g.tag}</div>}
                                                    </div>
                                                    <div className={isConfirmedState(g.state) ? 'bento_pill_ok' : 'bento_pill_wait'}>
                                                        {isConfirmedState(g.state) ? t('dashboard.bento_status_ok') : t('dashboard.bento_status_wait')}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {isFree && freeBar}
                                </div>
                            }

                            {/* ── Side events — crema ── */}
                            {plan !== 'paperless' &&
                                <div
                                    className={`bento_card bento_side${isFree ? ' bento_locked' : ''}`}
                                    onClick={openSection('side')}
                                >
                                    <div className='bento_side_left'>
                                        <div className='bento_title'>{t('dashboard.card_side_events')}</div>
                                        <div className='bento_caption'>{t('dashboard.bento_side_caption')}</div>
                                    </div>
                                    <div className='bento_env_scene'>
                                        {ENVELOPES.map((env, i) => (
                                            <div key={i} className='bento_env' style={{ ...env.style, background: env.bg }}>
                                                <div className='bento_env_flap' style={{ background: env.flap }} />
                                                <div className='bento_env_name' style={{ color: env.color }}>{sideNames[i] ?? envDefaults[i]}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {isFree && freeBar}
                                </div>
                            }

                            {/* ── Photo Wall — navy (color de Lia reservado, pero este es el original del mockup) ── */}
                            {plan !== 'paperless' &&
                                <div
                                    className={`bento_card bento_wall${wallLocked ? ' bento_locked' : ''}`}
                                    onClick={openSection('photowall')}
                                >
                                    <div className='bento_title'>Photo Wall</div>
                                    <div className='bento_caption'>{t('dashboard.bento_wall_caption')}</div>
                                    <div className='bento_wall_scene'>
                                            {/* La posición vive en CSS y no inline para que la tarjeta
                                                bloqueada pueda reencuadrarlas sin pelear con !important. */}
                                            <div className='bento_polaroid bento_polaroid--a'>
                                                <div><img src={`${LANDING}/wall-1.jpg`} alt='' /></div>
                                            </div>
                                            <div className='bento_polaroid bento_polaroid--b'>
                                                <div><img src={`${LANDING}/wall-2.jpg`} alt='' /></div>
                                            </div>
                                    </div>
                                    {wallLocked && lockBar('dashboard.bento_wall_locked')}
                                </div>
                            }



                            {/* ── Save the Date + CTA del plan ── */}
                            {hasCta
                                ? <div className='bento_row3'>{stdCard}{ctaCard}</div>
                                : stdCard
                            }

                            {/* ── Ayúdanos a mejorar — blanca ── */}
                            {feedbackVisible && !hasCta &&
                                <div className='bento_card bento_feedback' style={feedbackGridStyle}>
                                    <div className='bento_feedback_head'>
                                        <div className='bento_feedback_icon'>
                                            <Star size={20} style={{ color: '#1c3249' }} />
                                        </div>
                                        <div>
                                            <div className='bento_feedback_title'>{t('feedback_prompt.banner_title')}</div>
                                            <div className='bento_feedback_text'>{t('feedback_prompt.banner_text')}</div>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={openFeedbackModal}
                                        style={{ alignSelf: 'flex-start', background: '#1c3249', color: '#fff', border: 'none', borderRadius: '999px', height: '44px', padding: '0 22px', fontWeight: 700 }}
                                    >
                                        {t('feedback_prompt.banner_cta')}
                                    </Button>
                                </div>
                            }

                        </div>
                    </div>

                </div>

                <ProModal open={proOpen} onClose={() => setProOpen(false)} invitationId={id} />

                <PlansModal open={plansOpen} onClose={() => setPlansOpen(false)} invitationId={id} />

                <PlanActivationModal
                    status={activation}
                    plan={activatedPlan}
                    onClose={() => setActivation(null)}
                    onRetry={retryActivation}
                />

                <FeedbackModal
                    open={feedbackModalOpen}
                    onClose={closeFeedbackModal}
                    onSubmit={submitFeedback}
                />

                <FooterApp />
            </div>
            :

            <div className='build-loading-container'>
                <img alt='' src={load} style={{
                    width: '200px'
                }} />
            </div>

    )
}
