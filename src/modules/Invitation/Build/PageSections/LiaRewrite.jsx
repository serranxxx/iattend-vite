import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import axios from 'axios'
import { message } from 'antd'
import { LoaderCircle, Sparkles } from 'lucide-react'
import { liaHeaders } from '../../../../pages/Lia/liaApi'
import styles from './LiaRewrite.module.css'

// "Reescribir con Lia" (handoff "Panel lateral" 5.3): popover de 300px en la
// barra de texto. Tono (Romántico · Formal · Divertido · Breve), una
// instrucción opcional y 3 opciones; tocar una reemplaza el texto elegido.
// POST /api/ai/write con target rewrite_title / rewrite_body y el texto
// actual (cobra créditos de Lia como el chat).

const TONES = ['romantic', 'formal', 'fun', 'short']

// *negritas* → <strong>
const Rich = ({ text }) => text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <strong key={i}>{part.slice(1, -1)}</strong> : part)

export const LiaRewrite = ({ invitationID, current, kind, lang, onApply }) => {
    const { t, i18n } = useTranslation()
    const [tone, setTone] = useState('romantic')
    const [prompt, setPrompt] = useState('')
    const [options, setOptions] = useState([])
    const [loading, setLoading] = useState(false)

    const generate = async () => {
        setLoading(true)
        try {
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/ai/write`,
                {
                    invitation_id: invitationID,
                    target: kind === 'title' ? 'rewrite_title' : 'rewrite_body',
                    prompt, tone, count: 3, avoid: options,
                    current: current ?? '',
                    lang: lang || i18n.language,
                },
                { headers: await liaHeaders() },
            )
            if (data?.options?.length) setOptions(data.options)
        } catch (err) {
            const code = err?.response?.data?.code
            if (code === 'NO_CREDITS') message.warning(t('build_editor.ai_no_credits'))
            else if (code === 'NOT_AVAILABLE') message.info(t('build_editor.ai_not_in_plan'))
            else message.error(t('build_editor.ai_error'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={styles.wrap} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
            <span className={styles.title}><Sparkles size={15} /> {t('build_editor.lia_rewrite')}</span>

            <div className={styles.tones}>
                {TONES.map((k) => (
                    <button key={k} type="button" className={styles.tone} data-on={tone === k || undefined} onClick={() => setTone(k)}>
                        {t(`build_editor.lia_tone_${k}`)}
                    </button>
                ))}
            </div>

            <input
                className={styles.input}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !loading) generate() }}
                placeholder={t('build_editor.lia_instruction')}
            />

            <button type="button" className={styles.generate} disabled={loading || !current?.trim()} onClick={generate}>
                {loading ? <LoaderCircle size={15} className={styles.spin} /> : <Sparkles size={15} />}
                {options.length ? t('build_editor.lia_again') : t('build_editor.lia_generate')}
            </button>

            {options.length > 0 && (
                <div className={styles.options}>
                    {options.map((o, i) => (
                        <button key={i} type="button" className={styles.option} onClick={() => onApply(o)}>
                            <Rich text={o} />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
