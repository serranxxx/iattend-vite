import { useTranslation } from 'react-i18next'
import { ImageIcon, Share2, Star } from 'lucide-react'
import { CountUp } from './CountUp'
import styles from './DashboardMobile.module.css'

/* ═══════════════════════════════════════════════════════════════
   Tablero del evento en móvil — handoff "1b · Hero + carriles".

   El bento de escritorio responde "¿qué módulos tengo?"; en una
   columna eso se vuelve una fila de tarjetas que hay que scrollear
   completa. Aquí la pantalla responde "¿cómo va mi evento?": la
   invitación manda, los pases se resumen en tres números y los
   módulos secundarios se van a un carril horizontal. La navegación
   sigue siendo la del resto de la app: el botón flotante del header
   y el footer.

   Los datos llegan ya calculados desde DashboardPage; este
   componente solo los acomoda.
   ═══════════════════════════════════════════════════════════════ */

// El escalonado de entrada se reparte con una variable por bloque.
const rise = (i) => ({ style: { '--i': i }, className: styles.rise })

export const DashboardMobile = ({
    coverTitle,
    coverChip,
    coverImg,
    published,
    stats,
    totalPasses,
    passesCap,
    guests,
    avatarBgs,
    isConfirmed,
    sideCount,
    photoCount,
    stdImg,
    stdChip,
    wallThumbs,
    feedbackVisible,
    onOpenFeedback,
    onShare,
    onOpen,
}) => {
    const { t } = useTranslation()

    const initials = (name) => (name ?? '')
        .trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '·'

    return (
        <div className={styles.page}>

            {/* ── Hero: la invitación ── */}
            <button type="button" {...rise(0)} className={`${styles.hero} ${styles.rise}`} onClick={onOpen('build')}>
                <span className={styles.heroThumb}>
                    {coverImg
                        ? <img src={coverImg} alt="" />
                        : <span className={styles.heroThumbEmpty}><ImageIcon size={20} /></span>
                    }
                    <span className={styles.heroThumbName}>{coverTitle}</span>
                </span>

                <span className={styles.heroCol}>
                    {coverChip && (
                        <span className={styles.heroDate}>
                            {coverChip.day} · {coverChip.month.toUpperCase()} · {coverChip.year}
                        </span>
                    )}
                    <h1 className={styles.heroTitle}>{t('dashboard.card_invitation')}</h1>
                    <span className={styles.heroMeta}>
                        {t(published ? 'dashboard.mob_published' : 'dashboard.mob_draft')}
                        {' · '}
                        {t('dashboard.mob_passes_sent', { sent: totalPasses, total: passesCap })}
                    </span>

                    <span className={styles.heroActions}>
                        {/* Los dos viven dentro del hero, que ya es clickable: el
                            stopPropagation evita abrir el editor al compartir. */}
                        <span
                            role="button"
                            tabIndex={0}
                            className={styles.heroEdit}
                            style={{ display: 'grid', placeItems: 'center' }}
                            onClick={(e) => { e.stopPropagation(); onOpen('build')() }}
                        >
                            {t('dashboard.mob_edit')}
                        </span>
                        <span
                            role="button"
                            tabIndex={0}
                            aria-label={t('dashboard.mob_share')}
                            className={styles.heroShare}
                            onClick={(e) => { e.stopPropagation(); onShare() }}
                        >
                            <Share2 size={15} />
                        </span>
                    </span>
                </span>
            </button>

            {/* ── Tira de pases ── */}
            <div {...rise(1)} className={`${styles.metrics} ${styles.rise}`}>
                <button type="button" className={`${styles.metric} ${styles.metricConfirmed}`} onClick={onOpen('guests')}>
                    <CountUp className={styles.metricNum} value={stats.confirmed} duration={400} />
                    <div className={styles.metricLabel}>{t('dashboard.stat_confirmed')}</div>
                </button>
                <button type="button" className={`${styles.metric} ${styles.metricWaiting}`} onClick={onOpen('guests')}>
                    <CountUp className={styles.metricNum} value={stats.waiting} duration={400} />
                    <div className={styles.metricLabel}>{t('dashboard.stat_waiting')}</div>
                </button>
                <button type="button" className={`${styles.metric} ${styles.metricAvailable}`} onClick={onOpen('guests')}>
                    <CountUp className={styles.metricNum} value={stats.available} duration={400} />
                    <div className={styles.metricLabel}>{t('dashboard.stat_available')}</div>
                </button>
            </div>

            {/* ── Invitados ── */}
            <div {...rise(2)} className={styles.rise}>
                <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>{t('dashboard.card_guests')}</h2>
                    <button type="button" className={styles.sectionLink} onClick={onOpen('guests')}>
                        {t('dashboard.mob_see_all')}
                    </button>
                </div>

                <div className={styles.guestCard}>
                    {guests.length > 0
                        ? guests.map((g, i) => (
                            <button type="button" key={g.id ?? i} className={styles.guestRow} onClick={onOpen('guests')}>
                                <span className={styles.guestAvatar} style={{ background: avatarBgs[i % avatarBgs.length] }}>
                                    {initials(g.name)}
                                </span>
                                <span className={styles.guestText}>
                                    <span className={styles.guestName}>{g.name}</span>
                                    {g.tag && <span className={styles.guestSub}>{g.tag}</span>}
                                </span>
                                <span className={`${styles.guestBadge} ${isConfirmed(g.state) ? styles.badgeOk : styles.badgeWait}`}>
                                    {t(isConfirmed(g.state) ? 'dashboard.bento_status_ok' : 'dashboard.bento_status_wait')}
                                </span>
                            </button>
                        ))
                        : (
                            <div className={styles.guestEmpty}>
                                <span className={styles.guestEmptyTitle}>{t('dashboard.mob_guests_empty')}</span>
                                <button type="button" className={styles.guestEmptyBtn} onClick={onOpen('guests')}>
                                    {t('dashboard.mob_guests_empty_cta')}
                                </button>
                            </div>
                        )
                    }
                </div>
            </div>

            {/* ── Carril de módulos ──
                Se arma desde un array: agregar un módulo es una tarjeta más. */}
            <div {...rise(3)} className={styles.rise}>
                <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>{t('dashboard.mob_more')}</h2>
                </div>

                <div className={styles.rail}>
                    <button type="button" className={`${styles.railCard} ${styles.railWall}`} onClick={onOpen('photowall')}>
                        <span className={styles.railTitle}>Photo Wall</span>
                        <span className={styles.railSub}>{t('dashboard.mob_wall_count', { count: photoCount })}</span>
                        <span className={styles.wallScene}>
                            {wallThumbs.map((src, i) => (
                                <span key={i} className={styles.polaroid}><img src={src} alt="" /></span>
                            ))}
                        </span>
                    </button>

                    <button type="button" className={`${styles.railCard} ${styles.railSide}`} onClick={onOpen('side')}>
                        <span className={styles.railTitle}>{t('dashboard.card_side_events')}</span>
                        <span className={styles.railSub}>{t('dashboard.mob_side_count', { count: sideCount })}</span>
                        <span className={styles.envScene}>
                            <span className={styles.env} />
                            <span className={styles.env} />
                            <span className={styles.env} />
                        </span>
                    </button>

                    <button type="button" className={`${styles.railCard} ${styles.railStd}`} onClick={onOpen('savethedate')}>
                        <span className={styles.railStdBg}>{stdImg && <img src={stdImg} alt="" />}</span>
                        <span className={styles.railStdGrad} />
                        <span className={styles.railStdText}>
                            <span className={styles.railTitle}>{t('dashboard.card_save_the_date')}</span>
                            {stdChip && (
                                <span className={styles.railSub} style={{ display: 'block' }}>
                                    {stdChip.month.toUpperCase()} {stdChip.day}
                                </span>
                            )}
                        </span>
                    </button>
                </div>
            </div>

            {/* ── Feedback ── */}
            {feedbackVisible && (
                <button type="button" {...rise(4)} className={`${styles.feedback} ${styles.rise}`} onClick={onOpenFeedback}>
                    <span className={styles.feedbackIcon}><Star size={16} strokeWidth={1.4} /></span>
                    <span className={styles.feedbackText}>
                        <span className={styles.feedbackTitle}>{t('feedback_prompt.banner_title')}</span>
                        <span className={styles.feedbackSub} style={{ display: 'block' }}>{t('dashboard.mob_feedback_sub')}</span>
                    </span>
                    <span className={styles.feedbackCta}>{t('dashboard.mob_feedback_cta')}</span>
                </button>
            )}

        </div>
    )
}
