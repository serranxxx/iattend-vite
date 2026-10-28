import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { message } from 'antd'
import { GripVertical, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react'
import { liaHeaders } from '../../../../pages/Lia/liaApi'
import { startLayerDrag } from './layerItems'
import base from './ToolPanels.module.css'
import styles from './AiTextPanel.module.css'

// "Texto con Lia" (etapa 4 del editor de escritorio): Lia redacta 3 opciones
// para un texto de la invitación (POST /api/ai/write, cobra créditos de Lia
// como el chat). "Usar" la escribe en su campo; arrastrar una opción la
// suelta en la invitación como texto suelto (igual que Elementos).

// Destino → dónde se escribe, sección del editor y estilo si se arrastra.
const TARGETS = {
    greeting_text: { path: 'greeting.description', module: 'greeting', section: 'greeting', variant: 'body', w: 76 },
    greeting_title: { path: 'greeting.title', module: 'greeting', section: 'greeting', variant: 'title', w: 70 },
    quote: { path: 'quote.text.font.value', module: 'quote', section: 'quote', variant: 'subtitle', w: 76 },
    notice: { path: 'notices.notices', module: 'notices', section: 'notices', variant: 'body', w: 76, append: true },
}
const TONES = ['romantic', 'formal', 'fun']

const getPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj)

// *negritas* → <strong>
const Rich = ({ text }) => text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <strong key={i}>{part.slice(1, -1)}</strong> : part)

export const AiTextPanel = ({ invitation, invitationID, setInvitation, setSaved, onSelectSection, activeLang }) => {
    const { t, i18n } = useTranslation()
    const [target, setTarget] = useState('greeting_text')
    const [prompt, setPrompt] = useState('')
    const [tone, setTone] = useState('romantic')
    const [options, setOptions] = useState([])
    const [loading, setLoading] = useState(false)
    // Índice de la opción que se está cambiando por "Otra".
    const [replacing, setReplacing] = useState(null)
    const conf = TARGETS[target]

    const request = async (count, avoid = []) => {
        const current = conf.append ? '' : getPath(invitation, conf.path)
        const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/api/ai/write`,
            { invitation_id: invitationID, target, prompt, tone, lang: activeLang || i18n.language, count, current: typeof current === 'string' ? current : '', avoid },
            { headers: await liaHeaders() },
        )
        return data?.options ?? []
    }

    const onError = (err) => {
        const code = err?.response?.data?.code
        if (code === 'NO_CREDITS') message.warning(t('build_editor.ai_no_credits'))
        else if (code === 'NOT_AVAILABLE') message.info(t('build_editor.ai_not_in_plan'))
        else message.error(t('build_editor.ai_error'))
    }

    const generate = async () => {
        setLoading(true)
        try {
            const next = await request(3, options)
            if (next.length) setOptions(next)
        } catch (err) {
            onError(err)
        } finally {
            setLoading(false)
        }
    }

    const another = async (index) => {
        setReplacing(index)
        try {
            const [one] = await request(1, options)
            if (one) setOptions((prev) => prev.map((o, i) => (i === index ? one : o)))
        } catch (err) {
            onError(err)
        } finally {
            setReplacing(null)
        }
    }

    const use = (text) => {
        setInvitation((prev) => {
            const keys = conf.path.split('.')
            const next = { ...prev, [conf.module]: { ...prev[conf.module], active: true } }
            let cursor = next
            keys.slice(0, -1).forEach((key) => {
                cursor[key] = Array.isArray(cursor[key]) ? [...cursor[key]] : { ...(cursor[key] ?? {}) }
                cursor = cursor[key]
            })
            const last = keys[keys.length - 1]
            cursor[last] = conf.append ? [...(cursor[last] ?? []), text] : text
            return next
        })
        setSaved(false)
        onSelectSection?.(conf.section)
        message.success(t('build_editor.ai_used'))
    }

    return (
        <>
            <div className={base.group}>
                <span className={base.groupLabel}>{t('build_editor.ai_target')}</span>
                <div className={styles.chips}>
                    {Object.keys(TARGETS).map((id) => (
                        <button key={id} type="button" className={styles.chip} data-on={target === id || undefined} onClick={() => { setTarget(id); setOptions([]) }}>
                            {t(`build_editor.ai_t_${id}`)}
                        </button>
                    ))}
                </div>
            </div>

            <div className={styles.promptBox}>
                <textarea
                    className={styles.prompt}
                    rows={4}
                    value={prompt}
                    maxLength={600}
                    placeholder={t(`build_editor.ai_ph_${target}`)}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !loading) generate() }}
                />
                <div className={styles.tones}>
                    {TONES.map((id) => (
                        <button key={id} type="button" className={styles.tone} data-on={tone === id || undefined} onClick={() => setTone(id)}>
                            {t(`build_editor.ai_tone_${id}`)}
                        </button>
                    ))}
                </div>
            </div>

            <button type="button" className={styles.cta} disabled={loading} onClick={generate}>
                {loading ? <LoaderCircle size={15} className={styles.spin} /> : <Sparkles size={15} />}
                {loading ? t('build_editor.ai_generating') : t(options.length ? 'build_editor.ai_regenerate' : 'build_editor.ai_generate')}
            </button>

            {options.length > 0 && (
                <div className={base.group}>
                    <span className={base.groupLabel}>{t('build_editor.ai_results_hint')}</span>
                    {options.map((text, i) => (
                        <div
                            key={`${i}-${text.slice(0, 12)}`}
                            className={styles.result}
                            data-busy={replacing === i || undefined}
                            onPointerDown={(e) => {
                                if (e.target.closest('button')) return
                                startLayerDrag(e, { kind: 'text', variant: conf.variant, text: text.replace(/\*/g, ''), w: conf.w, rot: 0, opacity: 1 })
                            }}
                        >
                            <div className={styles.resultText}>
                                <GripVertical size={14} className={styles.grip} />
                                <span><Rich text={text} /></span>
                            </div>
                            <div className={styles.resultActions}>
                                <button type="button" className={styles.another} disabled={replacing !== null} onClick={() => another(i)}>
                                    {replacing === i ? <LoaderCircle size={13} className={styles.spin} /> : <RefreshCw size={13} />}
                                    {t('build_editor.ai_another')}
                                </button>
                                <button type="button" className={styles.use} onClick={() => use(text)}>
                                    {t(conf.append ? 'build_editor.ai_add' : 'build_editor.ai_use')}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}
