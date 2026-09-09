import React, { useEffect, useRef, useState } from 'react'
import './dashboard.css'
import { Button } from 'antd'
import { toFirstString } from '../../helpers/invitation/newInvitation';
import { FooterApp } from '../../modules/Footer/FooterApp'
import { supabase } from '../../lib/supabase'
import { HeaderDashboard } from '../../modules/Header/Header'
import { load } from '../../helpers/assets/images'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Star } from 'lucide-react'
import { UpgradeBanner } from '../../components/Payment/UpgradeBanner/UpgradeBanner'
import { FeedbackModal } from '../../components/FeedbackPrompt/FeedbackModal'
import { useFeedbackTrigger } from '../../components/FeedbackPrompt/useFeedbackTrigger'


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
    const [searchParams] = useSearchParams();

    const id = searchParams.get("id");
    const [createdAt, setCreatedAt] = useState(null)
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

    // Gating del plan free: solo se muestra el módulo de Save the Date (§5.4)
    const isFree = plan === 'free';

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

    const coverImg = toFirstString(invitation?.cover?.image?.prod);
    const coverTitle = invitation?.cover?.title?.text?.value ?? '';
    const coverChip = invitation?.cover?.date?.value ? fmtChip(invitation.cover.date.value) : null;

    // Con fondo de video no hay imagen que mostrar: se usa la "imagen para el
    // link" que el editor pide en ese caso.
    const stdMediaList = Array.isArray(saveTheDate?.cover?.image?.prod)
        ? saveTheDate.cover.image.prod
        : [toFirstString(saveTheDate?.cover?.image?.prod)].filter(Boolean);
    const stdFirstImage = stdMediaList.find((u) => typeof u === 'string' && !/\.(mp4|webm|mov|m4v)(\?|$)/i.test(u));
    const stdImg = saveTheDate?.cover?.image?.poster || stdFirstImage || coverImg;
    const stdChip = saveTheDate?.event_date ? fmtChip(saveTheDate.event_date) : null;

    const totalGuests = Math.max(confirmed + waiting + Math.max(available, 0), 1);
    const pctConfirmed = Math.min(100, Math.round((confirmed / totalGuests) * 100));
    const pctWaiting = Math.min(100 - pctConfirmed, Math.round((waiting / totalGuests) * 100));

    const initials = (name) => (name ?? '').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '·';
    const AVATAR_BGS = ['#eeeadf', '#D1BEDD', '#b9bba6'];
    const isConfirmedState = (s) => s === 'confirmado' || s === 'asistente';

    const ENVELOPES = [
        { bg: '#1c3249', flap: '#16323d', color: '#fff', style: { left: 0, top: '6px', transform: 'rotate(-8deg)', width: '62%' } },
        { bg: '#b9bba6', flap: '#a9ab95', color: '#1c3249', style: { left: '22%', top: '34%', transform: 'rotate(3deg)', width: '62%' } },
        { bg: '#D1BEDD', flap: '#c1abd0', color: '#1c3249', style: { right: '-4%', top: '-4px', transform: 'rotate(10deg)', width: '58%' } },
    ];
    const envDefaults = ['Brunch', 'Despedida', 'Civil'];

    const stdGridStyle = isFree
        ? { gridColumn: '1 / span 4' }
        : plan === 'paperless'
            ? { gridColumn: '2 / span 3', gridRow: '1' }
            : { gridColumn: feedbackVisible ? '1 / span 2' : '1 / span 4', gridRow: '3' };
    const feedbackGridStyle = plan === 'paperless'
        ? { gridColumn: '2 / span 3', gridRow: '2' }
        : { gridColumn: '3 / span 2', gridRow: '3' };

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
                            {!isFree &&
                                <div className='bento_card bento_inv' onClick={() => handleMoode('build')}>
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
                                </div>
                            }

                            {/* ── Gestión de invitados — salvia, ancha ── */}
                            {!isFree && plan !== 'paperless' &&
                                <div className='bento_card bento_guests' onClick={() => handleMoode('guests')}>
                                    <div className='bento_guests_left'>
                                        <div>
                                            <div className='bento_title'>{t('dashboard.card_guests')}</div>
                                            <div className='bento_caption' style={{ marginTop: '10px' }}>{t('dashboard.bento_guests_caption')}</div>
                                        </div>
                                        <div className='bento_stats'>
                                            <div><div className='bento_stat_num'>{confirmed}</div><div className='bento_stat_label'>{t('dashboard.stat_confirmed')}</div></div>
                                            <div><div className='bento_stat_num'>{waiting}</div><div className='bento_stat_label'>{t('dashboard.stat_waiting')}</div></div>
                                            <div><div className='bento_stat_num'>{available}</div><div className='bento_stat_label'>{t('dashboard.stat_available')}</div></div>
                                        </div>
                                    </div>
                                    <div className='bento_sheet_wrap'>
                                        <div className='bento_sheet'>
                                            <div className='bento_sheet_head'>
                                                <span>{t('dashboard.card_guests')}</span>
                                                <span>{confirmed + waiting + available} {t('dashboard.bento_passes')}</span>
                                            </div>
                                            <div className='bento_progress'>
                                                <div style={{ width: `${pctConfirmed}%`, background: '#1c3249' }} />
                                                <div style={{ width: `${pctWaiting}%`, background: '#D1BEDD' }} />
                                            </div>
                                            {guestsSample.map((g, i) => (
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
                                </div>
                            }

                            {/* ── Side events — crema ── */}
                            {!isFree && plan !== 'paperless' &&
                                <div className='bento_card bento_side' onClick={() => handleMoode('side')}>
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
                                </div>
                            }

                            {/* ── Photo Wall — navy (color de Lia reservado, pero este es el original del mockup) ── */}
                            {!isFree && plan !== 'paperless' &&
                                <div
                                    className='bento_card bento_wall'
                                    style={{ pointerEvents: plan !== 'pro' ? 'none' : undefined }}
                                    onClick={() => handleMoode('photowall')}
                                >
                                    <div className='bento_title'>Photo Wall</div>
                                    <div className='bento_caption'>{t('dashboard.bento_wall_caption')}</div>
                                    <div className='bento_wall_scene'>
                                        <div className='bento_polaroid' style={{ left: '-2%', bottom: '-14px', transform: 'rotate(-7deg)' }}>
                                            <div><img src="https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/wall-1.jpg" alt='' /></div>
                                        </div>
                                        <div className='bento_polaroid' style={{ right: '-4%', bottom: '-6px', transform: 'rotate(6deg)' }}>
                                            <div><img src="https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/wall-2.jpg" alt='' /></div>
                                        </div>
                                    </div>
                                    {plan !== 'pro' && <div className="pro_shadow pro_badge_" />}
                                </div>
                            }

                            {/* ── Save the Date — foto full-bleed ── */}
                            <div className='bento_card bento_std' style={stdGridStyle} onClick={() => handleMoode('savethedate')}>
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

                            {/* ── Ayúdanos a mejorar — blanca ── */}
                            {feedbackVisible && !isFree &&
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

                <UpgradeBanner plan={plan} invitationId={id} />

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
