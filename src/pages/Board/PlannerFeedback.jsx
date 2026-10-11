import { useState } from 'react'
import { Checkbox, ConfigProvider, Drawer, Grid, Modal, message } from 'antd'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Sparkle, X } from 'lucide-react'
import { supabaseAuthHeaders } from '../../lib/authHeaders'
import styles from './PlannerFeedback.module.css'

const TIPOS = ['feature', 'data', 'improve']

/**
 * "¿Te falta algo?" en la barra del planner (PlannerLayout) y su formulario.
 * Se guarda como reporte en support_tickets (POST /api/support/tickets, el
 * mismo del botón de soporte) con tema `improvement`; el tipo de solicitud y
 * si se le puede contactar van al inicio del texto. Lo ven en Admin → Buzón →
 * Reportes y llega el correo a soporte.
 *
 * variante 'fila': la versión compacta del dashboard en celular (toda la fila
 * abre el formulario). En celular el formulario es una hoja inferior.
 */
export const PlannerFeedback = ({ variante = 'tarjeta' }) => {
    const { t } = useTranslation()
    const [abierto, setAbierto] = useState(false)
    const celular = Grid.useBreakpoint().md === false

    return (
        <>
            {variante === 'fila' ? (
                <button type='button' className={styles.fila} onClick={() => setAbierto(true)}>
                    <span className={`${styles.icono} ${styles.filaIcono}`}><Sparkle size={16} fill='currentColor' /></span>
                    <span className={styles.filaTexto}>
                        <strong className={styles.titulo}>{t('planner_feedback.card_title')}</strong>
                        <span>{t('planner_feedback.row_text')}</span>
                    </span>
                    <span className={styles.filaCta}>{t('planner_feedback.row_cta')} <ArrowRight size={15} /></span>
                </button>
            ) : (
                <div className={styles.tarjeta}>
                    <span className={styles.icono}><Sparkle size={14} fill='currentColor' /></span>
                    <strong className={styles.titulo}>{t('planner_feedback.card_title')}</strong>
                    <p className={styles.texto}>{t('planner_feedback.card_text')}</p>
                    <button type='button' className={styles.enlace} onClick={() => setAbierto(true)}>
                        {t('planner_feedback.card_cta')} <ArrowRight size={15} />
                    </button>
                </div>
            )}
            {celular ? (
                <Drawer
                    open={abierto}
                    onClose={() => setAbierto(false)}
                    placement='bottom'
                    closable={false}
                    destroyOnHidden
                    height='auto'
                    styles={{ wrapper: { height: 'auto', borderRadius: '20px 20px 0 0', overflow: 'hidden' }, section: { borderRadius: '20px 20px 0 0' }, body: { padding: 0 } }}
                >
                    <Formulario hoja onClose={() => setAbierto(false)} />
                </Drawer>
            ) : (
                <Modal
                    open={abierto}
                    onCancel={() => setAbierto(false)}
                    footer={null}
                    closable={false}
                    destroyOnHidden
                    centered
                    width={620}
                    styles={{ content: { borderRadius: 28, padding: 0 } }}
                >
                    <Formulario onClose={() => setAbierto(false)} />
                </Modal>
            )}
        </>
    )
}

const Formulario = ({ onClose, hoja = false }) => {
    const { t } = useTranslation()
    const [tipo, setTipo] = useState('feature')
    const [texto, setTexto] = useState('')
    const [contactar, setContactar] = useState(true)
    const [enviando, setEnviando] = useState(false)

    const enviar = async () => {
        if (!texto.trim() || enviando) return
        setEnviando(true)
        try {
            // El reporte lo leen en Admin: siempre en español.
            const cuerpo = [
                `${t('planner_feedback.report_prefix', { lng: 'es' })} — ${t(`planner_feedback.type_${tipo}`, { lng: 'es' })}`,
                '',
                texto.trim(),
                '',
                `${t('planner_feedback.report_contact', { lng: 'es' })}: ${contactar ? 'Sí' : 'No'}`,
            ].join('\n')
            await axios.post(`${import.meta.env.VITE_API_URL}/api/support/tickets`,
                { topic: 'improvement', body: cuerpo },
                { headers: await supabaseAuthHeaders() })
            message.success(t('planner_feedback.sent'))
            onClose()
        } catch (error) {
            console.error('No se pudo enviar la solicitud:', error.response?.data || error.message)
            message.error(t('planner_feedback.error'))
            setEnviando(false)
        }
    }

    return (
        <div className={`${styles.formulario} ${hoja ? styles.formularioHoja : ''}`}>
            {hoja
                ? <span className={styles.asa} />
                : (
                    <button type='button' className={styles.cerrar} onClick={onClose} aria-label={t('planner_feedback.cancel')}>
                        <X size={18} />
                    </button>
                )}
            <h2 className={styles.formTitulo}>{t('planner_feedback.title')}</h2>
            <p className={styles.formIntro}>{t('planner_feedback.intro')}</p>

            <span className={styles.etiqueta}>{t('planner_feedback.type_label')}</span>
            <div className={styles.tipos} role='radiogroup' aria-label={t('planner_feedback.type_label')}>
                {TIPOS.map(key => (
                    <button
                        key={key}
                        type='button'
                        role='radio'
                        aria-checked={tipo === key}
                        className={`${styles.tipo} ${tipo === key ? styles.tipoActivo : ''}`}
                        onClick={() => setTipo(key)}
                    >
                        {t(`planner_feedback.type_${key}`)}
                    </button>
                ))}
            </div>

            <label className={styles.etiqueta} htmlFor='pf-texto'>{t('planner_feedback.more_label')}</label>
            <textarea
                id='pf-texto'
                className={styles.area}
                rows={4}
                maxLength={4000}
                placeholder={t('planner_feedback.placeholder')}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
            />

            <ConfigProvider theme={{ token: { colorPrimary: '#1c3249' } }}>
                <Checkbox checked={contactar} onChange={(e) => setContactar(e.target.checked)} className={styles.contacto}>
                    {t('planner_feedback.contact')}
                </Checkbox>
            </ConfigProvider>

            <div className={styles.acciones}>
                <button type='button' className={styles.cancelar} onClick={onClose}>{t('planner_feedback.cancel')}</button>
                <button
                    type='button'
                    className={styles.enviar}
                    aria-disabled={!texto.trim() || enviando}
                    onClick={enviar}
                >
                    {enviando ? t('planner_feedback.sending') : t('planner_feedback.submit')}
                </button>
            </div>
        </div>
    )
}
