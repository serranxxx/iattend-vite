import { useCallback, useEffect, useState } from 'react'
import { Dropdown, Input, Tooltip, message } from 'antd'
import { Check, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useDashboardRealtime } from '../../context/DashboardRealtimeContext'
import styles from './PassesPill.module.css'

// Un pase se consume cuando el invitado ya salió de la lista de espera y sigue
// en pie: enviados + confirmados + asistentes. Los que aún no se invitan y los
// que declinaron no ocupan lugar.
const USES_PASS = new Set(['esperando', 'confirmado', 'asistente'])

/**
 * Contador de pases del header del dashboard: usados / capacidad total, con
 * barra de avance y un "+" que abre el editor de capacidad
 * (columna invitations.tickets).
 */
export const PassesPill = ({ invitationId }) => {
    const { t } = useTranslation()
    const { subscribe } = useDashboardRealtime()

    const [total, setTotal] = useState(0)
    const [used, setUsed] = useState(0)
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState(0)
    const [saving, setSaving] = useState(false)

    const load = useCallback(async () => {
        if (!invitationId) return

        const [{ data: inv }, { data: guests }] = await Promise.all([
            supabase.from('invitations').select('tickets').eq('id', invitationId).maybeSingle(),
            supabase.from('guests').select('state').eq('invitation_id', invitationId),
        ])

        setTotal(inv?.tickets ?? 0)
        setUsed((guests ?? []).filter((g) => USES_PASS.has(g.state)).length)
    }, [invitationId])

    useEffect(() => { load() }, [load])

    // El conteo se mueve cuando se invita o confirma a alguien: se escucha por
    // el canal compartido del dashboard, sin abrir uno propio.
    useEffect(() => {
        const off = [subscribe('guests', load), subscribe('invitations', load)]
        return () => off.forEach((fn) => fn())
    }, [subscribe, load])

    // Al abrir el editor, el borrador arranca en el valor guardado
    useEffect(() => { if (open) setDraft(total) }, [open, total])

    const onSave = async () => {
        const value = Math.max(Number(draft) || 0, 0)
        setSaving(true)
        const { error } = await supabase.from('invitations').update({ tickets: value }).eq('id', invitationId)
        setSaving(false)

        if (error) {
            console.error('Error actualizando pases:', error)
            message.error(t('dashboard_header.passes_error'))
            return
        }

        setTotal(value)
        setOpen(false)
        message.success(t('dashboard_header.passes_saved'))
    }

    if (!invitationId) return null

    const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
    const over = total > 0 && used > total

    return (
        <div className={styles.pill}>
            <div className={styles.figure}>
                <span className={styles.kicker}>{t('dashboard_header.passes')}</span>
                <span className={styles.count}>
                    <b data-over={over || undefined}>{used}</b> {t('dashboard_header.passes_of', { total })}
                </span>
            </div>

            <div className={styles.rail}>
                <div className={styles.fill} data-over={over || undefined} style={{ width: `${pct}%` }} />
            </div>

            <Dropdown
                trigger={['click']}
                placement="bottomRight"
                open={open}
                onOpenChange={setOpen}
                popupRender={() => (
                    <div className={styles.editor}>
                        <span className={styles.editorLabel}>{t('dashboard_header.passes_total')}</span>
                        <div className={styles.editorRow}>
                            <button
                                type="button"
                                className={styles.step}
                                onClick={() => setDraft((v) => Math.max(Number(v) - 1, 0))}
                            >
                                <Minus size={14} />
                            </button>
                            <Input
                                value={draft}
                                onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
                                className={styles.editorInput}
                            />
                            <button
                                type="button"
                                className={styles.step}
                                onClick={() => setDraft((v) => Number(v) + 1)}
                            >
                                <Plus size={14} />
                            </button>
                            <button
                                type="button"
                                className={styles.save}
                                disabled={saving}
                                onClick={onSave}
                            >
                                <Check size={14} />
                            </button>
                        </div>
                        <span className={styles.editorHint}>
                            <b>{t('dashboard_header.passes_used', { count: used })}</b>
                            {' '}{t('dashboard_header.passes_explainer')}
                        </span>
                    </div>
                )}
            >
                <Tooltip title={t('dashboard_header.passes_edit')}>
                    <button type="button" className={styles.add} aria-label={t('dashboard_header.passes_edit')}>
                        <Plus size={13} />
                    </button>
                </Tooltip>
            </Dropdown>
        </div>
    )
}
