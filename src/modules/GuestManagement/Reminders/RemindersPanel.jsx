import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Bell, Check, Loader2, Plus, Search, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'
import {
    SEGMENTS,
    RULE_FIELDS,
    isValidPhone,
    matchesRules,
    matchesSegment,
    bodyParts,
    renderHeaderImage,
    resolveParams,
    ruleValues,
    templateBlockReason,
} from './reminderVariables'
import { WhatsappBubble } from './WhatsappBubble'
import { DeadlineDialog } from './DeadlineDialog'
import { fetchFailureKinds, mainFailureKind } from './sendFailures'
import styles from './RemindersPanel.module.css'

const MAX_REQUEST = 500
// Misma ventana que el backend (crearLoteRecordatorio) para no repetir el
// mismo recordatorio al mismo invitado.
const REPEAT_WINDOW_MS = 20 * 60 * 60 * 1000

const isLeader = (g) => g.companion_id === null || g.companion_id === undefined

/**
 * Guest management → Recordatorios (Claude Design, "Guest Management -
 * Recordatorios.dc.html"). El organizador elige un mensaje del banco
 * (`reminder_templates`) y a qué titulares se lo manda; sale por WhatsApp en
 * un lote de la misma cola que el envío masivo de invitaciones.
 *
 * `preset` lo cambian los atajos (Seguimiento, la barra de selección de las
 * listas): { nonce, templateSlug, segment, manualIds, manualFrom }.
 */
export const RemindersPanel = ({
    invitationId,
    rowData = [],
    dispatchMap = {},
    tables = [],
    tags = [],
    owners = [],
    invitation = null,
    name = null,
    rsvpDeadline = null,
    eventDate = null,
    urlImage = null,
    onSaveRsvpDeadline,
    rsvpDisabledDate,
    plan = null,
    credits = 0,
    preset = null,
    onSend,
    activeBatch = null,
    onNeedCredits,
    onBack,
}) => {
    const { t } = useTranslation()

    const [templates, setTemplates] = useState(null)
    const [tplId, setTplId] = useState(null)
    const [segment, setSegment] = useState('todos')
    const [rules, setRules] = useState([])
    const [comb, setComb] = useState('and')
    const [excluded, setExcluded] = useState(() => new Set())
    const [manual, setManual] = useState(null)
    const [manualFrom, setManualFrom] = useState('')
    const [search, setSearch] = useState('')
    const [liaOn, setLiaOn] = useState(false)
    const [recent, setRecent] = useState(() => new Set())
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(null)
    // Motivos de los fallidos del último lote ({ config, recipient, other }).
    const [failureKinds, setFailureKinds] = useState(null)

    const [reqEditing, setReqEditing] = useState(false)
    const [reqText, setReqText] = useState('')
    const [reqSending, setReqSending] = useState(false)
    const [requested, setRequested] = useState(false)
    const [reqError, setReqError] = useState(null)

    const isPro = plan === 'pro'
    const eventCtx = { invitation, name, rsvpDeadline, eventDate, urlImage }

    useEffect(() => {
        let alive = true
        supabase
            .from('reminder_templates')
            .select('id, slug, name, description, body, footer, header_image_variable, body_variables, button_label, button_url, button_variable, suggestion, sort_order')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .then(({ data, error }) => {
                if (!alive) return
                if (error) console.error('Error al cargar recordatorios:', error)
                setTemplates(data ?? [])
            })
        return () => { alive = false }
    }, [])

    const template = useMemo(() => templates?.find((tp) => tp.id === tplId) ?? null, [templates, tplId])

    // Quién ya recibió este mismo recordatorio hace poco: no se puede repetir.
    useEffect(() => {
        if (!template || !invitationId) { setRecent(new Set()); return }
        let alive = true
        supabase
            .from('invitation_reminder_dispatches')
            .select('guest_id, status')
            .eq('invitation_id', invitationId)
            .eq('reminder_template_id', template.id)
            .gte('created_at', new Date(Date.now() - REPEAT_WINDOW_MS).toISOString())
            .then(({ data }) => {
                if (!alive) return
                setRecent(new Set((data ?? []).filter((d) => d.status !== 'failed').map((d) => Number(d.guest_id))))
            })
        return () => { alive = false }
    }, [template?.id, invitationId, sent])

    // Cuando el lote termina con fallidos, se lee por qué (Meta lo guarda por item).
    // Copia del último estado del lote: si cierran la isla de progreso,
    // activeBatch vuelve a null y el resultado no se debe perder.
    const [sentBatch, setSentBatch] = useState(null)
    useEffect(() => {
        if (sent?.batchId && activeBatch?.id === sent.batchId) setSentBatch(activeBatch)
        if (!sent) setSentBatch(null)
    }, [activeBatch, sent?.batchId])
    const sentBatchDone = Boolean(sentBatch && sentBatch.status === 'completed' && sentBatch.failed > 0)
    useEffect(() => {
        if (!sentBatchDone) { setFailureKinds(null); return }
        let alive = true
        fetchFailureKinds(sent.batchId).then((counts) => { if (alive) setFailureKinds(counts) })
        return () => { alive = false }
    }, [sentBatchDone, sent?.batchId])

    const resetSelection = () => setExcluded(new Set())

    const applySuggestion = (tp) => {
        const s = tp?.suggestion ?? {}
        setSegment(SEGMENTS.includes(s.segment) ? s.segment : 'todos')
        setRules(Array.isArray(s.rules) ? s.rules.map((r) => ({ ...r })) : [])
        setComb(s.comb === 'or' ? 'or' : 'and')
        resetSelection()
        setLiaOn(Boolean(s.title))
    }

    const selectTemplate = (tp) => {
        setTplId(tp.id)
        setSent(null)
        if (!manual) applySuggestion(tp)
    }

    // Atajos que abren la sección con algo ya elegido.
    useEffect(() => {
        if (!preset || !templates) return
        setSent(null)
        setSearch('')
        resetSelection()
        const tp = preset.templateSlug ? templates.find((x) => x.slug === preset.templateSlug) : null
        if (preset.manualIds?.length) {
            setManual(preset.manualIds)
            setManualFrom(preset.manualFrom ?? '')
            setLiaOn(false)
            if (tp) setTplId(tp.id)
            return
        }
        setManual(null)
        if (tp) {
            setTplId(tp.id)
            applySuggestion(tp)
        }
        if (preset.segment) {
            setSegment(preset.segment)
            setRules([])
            setLiaOn(false)
        }
    }, [preset?.nonce, templates])

    // ── Universo y audiencia ─────────────────────────────────────────────
    const companionsOf = useMemo(() => {
        const map = new Map()
        rowData.forEach((g) => {
            if (isLeader(g)) return
            const key = Number(g.companion_id)
            map.set(key, (map.get(key) ?? 0) + 1)
        })
        return map
    }, [rowData])

    const leaders = useMemo(() => rowData.filter(isLeader), [rowData])
    const invitedLeaders = useMemo(() => leaders.filter((g) => g.state !== 'creado'), [leaders])

    const segmentCounts = useMemo(() => Object.fromEntries(
        SEGMENTS.map((s) => [s, invitedLeaders.filter((g) => matchesSegment(g, s, dispatchMap)).length])
    ), [invitedLeaders, dispatchMap])

    const audience = useMemo(() => {
        if (manual) {
            const ids = new Set(manual.map(Number))
            return leaders.filter((g) => ids.has(Number(g.id)))
        }
        return invitedLeaders.filter((g) => matchesSegment(g, segment, dispatchMap) && matchesRules(g, rules, comb, dispatchMap))
    }, [manual, leaders, invitedLeaders, segment, rules, comb, dispatchMap])

    // Motivo por el que un titular no puede recibirlo (null = puede).
    const blockOf = (g) => {
        if (!isValidPhone(g.phone_number)) return 'phone'
        if (recent.has(Number(g.id))) return 'recent'
        if (template && !resolveParams(template, { ...eventCtx, guest: g })) return 'data'
        return null
    }

    const selected = useMemo(
        () => audience.filter((g) => !blockOf(g) && !excluded.has(g.id)),
        [audience, excluded, recent, template, invitation, name, rsvpDeadline, eventDate, urlImage]
    )
    const invalidCount = audience.filter((g) => blockOf(g) === 'phone').length
    const people = selected.reduce((sum, g) => sum + 1 + (companionsOf.get(Number(g.id)) ?? 0), 0)

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return audience
        return audience.filter((g) => g.name?.toLowerCase().includes(q) || String(g.phone_number ?? '').includes(q))
    }, [audience, search])

    const tplBlock = (tp) => templateBlockReason(tp, eventCtx)

    // Sin fecha límite el recordatorio no se bloquea: al elegirlo se pide la
    // fecha en una ventana y, al guardarla, queda elegido.
    const DEADLINE_REASON = 'reminders.missing_deadline'
    const [deadlineFor, setDeadlineFor] = useState(null)
    const pickTemplate = (tp) => {
        const block = tplBlock(tp)
        if (!block) return selectTemplate(tp)
        if (block === DEADLINE_REASON && onSaveRsvpDeadline) setDeadlineFor(tp)
    }
    // Cuando la fecha ya llegó (rsvpDeadline cambió), se elige el recordatorio.
    useEffect(() => {
        if (deadlineFor?.pending && rsvpDeadline) {
            selectTemplate(deadlineFor.tp)
            setDeadlineFor(null)
        }
    }, [rsvpDeadline, deadlineFor])

    // ── Cambios manuales (desmarcan la sugerencia de Lia) ────────────────
    const changeSegment = (s) => { setSegment(s); resetSelection(); setLiaOn(false) }
    const changeRules = (next) => { setRules(next); resetSelection(); setLiaOn(false) }
    const changeComb = (c) => { setComb(c); resetSelection(); setLiaOn(false) }

    const addRule = () => changeRules([...rules, { field: 'state', op: 'es', value: 'esperando' }])
    const updateRule = (i, patch) => changeRules(rules.map((r, idx) => {
        if (idx !== i) return r
        const next = { ...r, ...patch }
        if (patch.field) next.value = ruleValues(patch.field, { tags, owners })[0] ?? ''
        return next
    }))
    const removeRule = (i) => changeRules(rules.filter((_, idx) => idx !== i))

    const toggleGuest = (g) => {
        setExcluded((prev) => {
            const next = new Set(prev)
            if (next.has(g.id)) next.delete(g.id)
            else next.add(g.id)
            return next
        })
        setLiaOn(false)
    }

    const useFiltersInstead = () => {
        setManual(null)
        setManualFrom('')
        resetSelection()
        if (template) applySuggestion(template)
    }

    // ── Envío ────────────────────────────────────────────────────────────
    const canSend = Boolean(template) && selected.length > 0 && isPro && !sending

    const send = async () => {
        if (!canSend) return
        if (credits < selected.length) {
            onNeedCredits?.()
            return
        }
        const items = selected.map((g) => ({ guestId: g.id, ...resolveParams(template, { ...eventCtx, guest: g }) }))
        setSending(true)
        try {
            const batch = await onSend?.(template, items)
            if (batch?.total) {
                setSent({ name: template.name, n: batch.total, batchId: batch.batchId })
                setExcluded(new Set())
            }
        } finally {
            setSending(false)
        }
    }

    const ctaLabel = !template
        ? t('reminders.cta_pick_template')
        : selected.length === 0
            ? t('reminders.cta_pick_recipients')
            : !isPro
                ? t('reminders.cta_pro_only')
                : t('reminders.cta_send', { count: selected.length })

    // ── Solicitar recordatorio ───────────────────────────────────────────
    const submitRequest = async () => {
        const body = reqText.trim()
        if (!body || reqSending) return
        setReqSending(true)
        setReqError(null)
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/support/tickets`, {
                topic: 'reminder_request',
                body,
                invitation_id: invitationId,
                event_name: invitation?.cover?.title?.text?.value || null,
            }, { headers: await supabaseAuthHeaders() })
            setRequested(true)
            setReqEditing(false)
            setReqText('')
        } catch (error) {
            console.error('Error al solicitar recordatorio:', error)
            setReqError(t('reminders.request_error'))
        } finally {
            setReqSending(false)
        }
    }

    // ── Pintado ──────────────────────────────────────────────────────────
    const step = !template ? 1 : selected.length === 0 ? 2 : 3
    const previewGuest = selected[0] ?? audience[0] ?? null
    const previewCtx = { ...eventCtx, guest: previewGuest ?? { name: t('reminders.preview_guest') } }

    const tableName = (id) => tables.find((tb) => tb.id === id)?.name
    const stateLabel = (g) => t(`reminders.state_${g.state === 'asistente' ? 'confirmado' : g.state}`)
    const metaOf = (g) => {
        const parts = [stateLabel(g)]
        if (g.side) parts.push(g.side)
        if (g.table != null) parts.push(tableName(g.table) || t('reminders.meta_table'))
        const comp = companionsOf.get(Number(g.id)) ?? 0
        if (comp > 0) parts.push(t('reminders.meta_companions', { count: comp }))
        return parts.join(' · ')
    }

    const valueLabel = (field, value) => {
        if (field === 'state') return t(`reminders.state_${value}`)
        if (field === 'table') return t(`reminders.table_${value}`)
        if (field === 'read') return t(`reminders.read_${value}`)
        if (field === 'tier') return t('reminders.tier_value', { tier: value })
        return value
    }

    const banner = (
        <div className={styles.banner}>
            <div className={styles.bannerTexts}>
                <span className={styles.bannerTitle}>{t('reminders.banner_title')}</span>
                <span className={styles.bannerText}>{t('reminders.banner_text')}</span>
            </div>
            <div className={styles.progress}>
                {[1, 2, 3].map((n) => (
                    <span key={n} className={styles.progressPill} data-on={step >= n || undefined}>
                        {`${n} · ${t(`reminders.progress_${n}`)}`}
                    </span>
                ))}
            </div>
        </div>
    )

    if (sent) {
        // El lote se procesa en el backend: el resultado real llega por el
        // polling de activeBatch en GuestsPage. Mientras no termine, "enviando".
        const batch = sentBatch?.id === sent.batchId ? sentBatch : null
        const done = batch?.status === 'completed'
        const ok = batch?.sent ?? 0
        const failed = batch?.failed ?? 0
        const outcome = !done ? 'sending' : failed === 0 ? 'ok' : ok === 0 ? 'failed' : 'partial'
        const reason = failureKinds ? t(`reminders.fail_reason_${mainFailureKind(failureKinds)}`) : ''

        return (
            <div className={styles.wrapper}>
                {banner}
                <div className={styles.sentCard} data-outcome={outcome}>
                    <span className={styles.sentCheck}>
                        {outcome === 'sending' && <Loader2 size={28} className={styles.spin} />}
                        {outcome === 'ok' && <Check size={28} strokeWidth={2.5} />}
                        {outcome === 'partial' && <AlertTriangle size={26} strokeWidth={2.2} />}
                        {outcome === 'failed' && <X size={28} strokeWidth={2.5} />}
                    </span>
                    <span className={styles.sentTitle}>
                        {outcome === 'sending' && t('reminders.sending_title', { name: sent.name, count: sent.n })}
                        {outcome === 'ok' && t('reminders.sent_title', { name: sent.name, count: ok })}
                        {outcome === 'partial' && t('reminders.partial_title', { name: sent.name, sent: ok, count: sent.n })}
                        {outcome === 'failed' && t('reminders.failed_title', { name: sent.name })}
                    </span>
                    <span className={styles.sentText}>
                        {outcome === 'sending' && t('reminders.sending_text')}
                        {outcome === 'ok' && t('reminders.sent_text')}
                        {(outcome === 'partial' || outcome === 'failed') && (
                            <>
                                {reason}{reason && ' '}
                                {t('reminders.fail_refund', { count: failed })}
                            </>
                        )}
                    </span>
                    {outcome !== 'sending' && (
                        <div className={styles.sentActions}>
                            <button type="button" className={styles.btnDark} onClick={() => setSent(null)}>
                                {outcome === 'failed' ? t('reminders.failed_retry') : t('reminders.sent_again')}
                            </button>
                            <button type="button" className={styles.btnOutline} onClick={onBack}>
                                {t('reminders.sent_back')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={styles.wrapper}>
            {banner}

            <DeadlineDialog
                open={Boolean(deadlineFor && !deadlineFor.pending)}
                templateName={deadlineFor?.name}
                disabledDate={rsvpDisabledDate}
                onSave={onSaveRsvpDeadline}
                onClose={(saved) => setDeadlineFor(saved ? { pending: true, tp: deadlineFor } : null)}
            />

            <div className={styles.grid}>
                <div className={styles.col}>

                    {/* ── Paso 1: banco de recordatorios ─────────────────── */}
                    <section className={styles.card}>
                        <div className={styles.cardHead}>
                            <div className={styles.cardTitles}>
                                <span className={styles.kicker}>{t('reminders.step1_kicker')}</span>
                                <h2 className={styles.cardTitle}>{t('reminders.step1_title')}</h2>
                            </div>
                            <span className={styles.cardAside}>{t('reminders.step1_aside')}</span>
                        </div>

                        {templates === null ? (
                            <div className={styles.bankEmpty}>{t('reminders.loading')}</div>
                        ) : templates.length === 0 ? (
                            <div className={styles.bankEmpty}>{t('reminders.bank_empty')}</div>
                        ) : (
                            <div className={styles.bank}>
                                {templates.map((tp, i) => {
                                    const block = tplBlock(tp)
                                    const active = tp.id === tplId
                                    return (
                                        <button
                                            key={tp.id}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            aria-disabled={(Boolean(block) && block !== DEADLINE_REASON) || undefined}
                                            className={styles.tpl}
                                            data-active={active || undefined}
                                            onClick={() => pickTemplate(tp)}
                                        >
                                            <span className={styles.tplTop}>
                                                <span className={styles.tplNum}>{i + 1}</span>
                                                <span className={styles.radio} data-on={active || undefined} />
                                            </span>
                                            <span className={styles.tplName}>{tp.name}</span>
                                            {tp.description && <span className={styles.tplDesc}>{tp.description}</span>}
                                            {block && <span className={styles.tplBlock}>{t(block)}</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        <div className={styles.request}>
                            {requested ? (
                                <div className={styles.requestRow}>
                                    <div className={styles.requestTexts}>
                                        <span className={styles.requestTitle}>{t('reminders.request_sent_title')}</span>
                                        <span className={styles.requestText}>{t('reminders.request_sent_text')}</span>
                                    </div>
                                    <span className={styles.reviewPill}><Check size={13} strokeWidth={3} /> {t('reminders.request_in_review')}</span>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.requestRow}>
                                        <div className={styles.requestTexts}>
                                            <span className={styles.requestTitle}>{t('reminders.request_title')}</span>
                                            <span className={styles.requestText}>{t('reminders.request_text')}</span>
                                        </div>
                                        {!reqEditing && (
                                            <button type="button" className={styles.btnOutline} onClick={() => setReqEditing(true)}>
                                                <Plus size={15} /> {t('reminders.request_cta')}
                                            </button>
                                        )}
                                    </div>
                                    {reqEditing && (
                                        <div className={styles.requestForm}>
                                            <textarea
                                                className={styles.textarea}
                                                rows={5}
                                                maxLength={MAX_REQUEST}
                                                value={reqText}
                                                onChange={(e) => setReqText(e.target.value)}
                                                placeholder={t('reminders.request_placeholder')}
                                                autoFocus
                                            />
                                            <span className={styles.helper}>
                                                {t('reminders.request_helper', { count: reqText.length, max: MAX_REQUEST })}
                                            </span>
                                            {reqError && <span className={styles.errorText}>{reqError}</span>}
                                            <div className={styles.requestActions}>
                                                <button type="button" className={styles.btnOutline} onClick={() => { setReqEditing(false); setReqText(''); setReqError(null) }}>
                                                    {t('reminders.cancel')}
                                                </button>
                                                <button
                                                    type="button"
                                                    className={styles.btnLavender}
                                                    aria-disabled={!reqText.trim() || reqSending || undefined}
                                                    onClick={submitRequest}
                                                >
                                                    {reqSending ? t('reminders.request_sending') : t('reminders.request_submit')}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </section>

                    {/* ── Paso 2: destinatarios ──────────────────────────── */}
                    <section className={styles.card} data-disabled={!template || undefined}>
                        <div className={styles.cardHead}>
                            <div className={styles.cardTitles}>
                                <span className={styles.kicker}>{t('reminders.step2_kicker')}</span>
                                <h2 className={styles.cardTitle}>{t('reminders.step2_title')}</h2>
                            </div>
                        </div>

                        {manual ? (
                            <div className={styles.manualNote}>
                                <span>
                                    <b>{t('reminders.manual_count', { count: manual.length })}</b>
                                    {' '}{t('reminders.manual_from', { from: manualFrom })}
                                </span>
                                <button type="button" className={styles.link} onClick={useFiltersInstead}>
                                    {t('reminders.manual_use_filters')}
                                </button>
                            </div>
                        ) : (
                            <>
                                {template?.suggestion?.title && (
                                    <div className={styles.lia}>
                                        <div className={styles.liaTexts}>
                                            <span className={styles.liaKicker}>✦ {t('reminders.lia_kicker')}</span>
                                            <span className={styles.liaTitle}>{template.suggestion.title}</span>
                                            {template.suggestion.reason && <span className={styles.liaReason}>{template.suggestion.reason}</span>}
                                        </div>
                                        <button
                                            type="button"
                                            className={liaOn ? styles.liaApplied : styles.btnLavender}
                                            onClick={() => applySuggestion(template)}
                                        >
                                            {liaOn ? <><Check size={14} strokeWidth={3} /> {t('reminders.lia_applied')}</> : t('reminders.lia_apply')}
                                        </button>
                                    </div>
                                )}

                                <div className={styles.block}>
                                    <span className={styles.blockLabel}>{t('reminders.segment_label')}</span>
                                    <div className={styles.chips}>
                                        {SEGMENTS.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                className={styles.chip}
                                                data-on={segment === s || undefined}
                                                onClick={() => changeSegment(s)}
                                            >
                                                {t(`reminders.segment_${s}`)}
                                                <span className={styles.chipCount}>{segmentCounts[s]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.block}>
                                    <span className={styles.blockLabel}>{t('reminders.rules_label')}</span>
                                    {rules.length >= 2 && (
                                        <div className={styles.comb}>
                                            {['and', 'or'].map((c) => (
                                                <button key={c} type="button" className={styles.combBtn} data-on={comb === c || undefined} onClick={() => changeComb(c)}>
                                                    {t(`reminders.comb_${c}`)}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {rules.map((r, i) => {
                                        const options = ruleValues(r.field, { tags, owners })
                                        return (
                                            <div key={i} className={styles.rule}>
                                                <select className={styles.select} value={r.field} onChange={(e) => updateRule(i, { field: e.target.value })}>
                                                    {RULE_FIELDS.map((f) => (
                                                        <option key={f} value={f} disabled={ruleValues(f, { tags, owners }).length === 0}>
                                                            {t(`reminders.field_${f}`)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <select className={styles.select} value={r.op} onChange={(e) => updateRule(i, { op: e.target.value })}>
                                                    <option value="es">{t('reminders.op_es')}</option>
                                                    <option value="no">{t('reminders.op_no')}</option>
                                                </select>
                                                <select className={styles.select} value={r.value} onChange={(e) => updateRule(i, { value: e.target.value })}>
                                                    {options.map((v) => <option key={v} value={v}>{valueLabel(r.field, v)}</option>)}
                                                </select>
                                                <button type="button" className={styles.ruleRemove} aria-label={t('reminders.rule_remove')} onClick={() => removeRule(i)}>
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        )
                                    })}
                                    <button type="button" className={styles.addRule} onClick={addRule}>
                                        <Plus size={14} /> {t('reminders.rule_add')}
                                    </button>
                                </div>
                            </>
                        )}

                        <div className={styles.block}>
                            <div className={styles.resultHead}>
                                <span className={styles.resultCount}>
                                    {t('reminders.result_count', { match: audience.length, selected: selected.length })}
                                </span>
                                <span className={styles.resultLinks}>
                                    <button type="button" className={styles.link} onClick={() => setExcluded(new Set())}>{t('reminders.select_all')}</button>
                                    <button type="button" className={styles.link} onClick={() => setExcluded(new Set(audience.map((g) => g.id)))}>{t('reminders.select_none')}</button>
                                </span>
                            </div>
                            <label className={styles.search}>
                                <Search size={15} />
                                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('reminders.search_placeholder')} />
                            </label>
                            <div className={styles.list}>
                                {visible.length === 0 ? (
                                    <div className={styles.listEmpty}>{t('reminders.result_empty')}</div>
                                ) : visible.map((g) => {
                                    const block = blockOf(g)
                                    const checked = !block && !excluded.has(g.id)
                                    return (
                                        <button
                                            key={g.id}
                                            type="button"
                                            role="checkbox"
                                            aria-checked={checked}
                                            aria-disabled={Boolean(block) || undefined}
                                            className={styles.row}
                                            data-blocked={block || undefined}
                                            onClick={() => { if (!block) toggleGuest(g) }}
                                        >
                                            <span className={styles.check} data-on={checked || undefined}>
                                                {checked && <Check size={13} strokeWidth={3} />}
                                            </span>
                                            <span className={styles.rowTexts}>
                                                <span className={styles.rowName}>{g.name}</span>
                                                <span className={styles.rowMeta}>{metaOf(g)}</span>
                                            </span>
                                            {block && <span className={styles.blockPill} data-kind={block}>{t(`reminders.block_${block}`)}</span>}
                                            {g.tag && <span className={styles.tag}>{g.tag}</span>}
                                            {g.tier && <span className={styles.tier} data-tier={g.tier}>{g.tier}</span>}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </section>
                </div>

                {/* ── Resumen (sticky) ─────────────────────────────────────── */}
                <aside className={styles.summary}>
                    <span className={styles.kicker}>{t('reminders.preview_kicker')}</span>
                    {template ? (
                        <WhatsappBubble
                            parts={bodyParts(template, previewCtx)}
                            imageUrl={renderHeaderImage(template, previewCtx)}
                            imageLabel={template.header_image_variable ? t('reminders.preview_image_missing') : null}
                            footer={template.footer}
                            buttonLabel={template.button_label}
                        />
                    ) : (
                        <div className={styles.chat}>
                            <span className={styles.chatEmpty}>{t('reminders.preview_empty')}</span>
                        </div>
                    )}

                    <dl className={styles.facts}>
                        <div><dt>{t('reminders.summary_template')}</dt><dd>{template?.name ?? '—'}</dd></div>
                        <div><dt>{t('reminders.summary_leaders')}</dt><dd>{selected.length}</dd></div>
                        <div><dt>{t('reminders.summary_people')}</dt><dd>{people}</dd></div>
                        <div><dt>{t('reminders.summary_credits')}</dt><dd>{t('reminders.summary_credits_value', { count: selected.length, credits })}</dd></div>
                    </dl>

                    <div className={styles.note}>{t('reminders.note_companions')}</div>
                    {invalidCount > 0 && <div className={styles.noteRed}>{t('reminders.note_invalid', { count: invalidCount })}</div>}
                    {!isPro && <div className={styles.noteLavender}>{t('reminders.note_pro')}</div>}

                    <button
                        type="button"
                        className={styles.cta}
                        aria-disabled={!canSend || undefined}
                        onClick={send}
                    >
                        <Bell size={16} />
                        {sending ? t('reminders.cta_sending') : ctaLabel}
                    </button>
                </aside>
            </div>
        </div>
    )
}
