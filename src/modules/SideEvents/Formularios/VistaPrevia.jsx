import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check } from 'lucide-react'
import styles from './VistaPrevia.module.css'
import { campoPublicado, esSeccion, incompleta, inicialesDe } from './modelo'

/*
  Columna "Así lo ve tu invitado" de la pestaña Preguntas: la pregunta activa
  (o la primera de la sección activa) en la tarjeta de vidrio del formulario
  sobre la portada del Flash, con las medidas de la página del invitado
  (iattend-events components/SideEvent/Registro/registro.module.css). Solo
  muestra; no se responde aquí.
*/

const Control = ({ f, t }) => {
    switch (f.type) {
        case 'single':
            return (
                <div className={styles.single}>
                    {(f.options ?? []).map((o, i) => <span key={i} className={styles.option}><span className={styles.radio} />{o}</span>)}
                </div>
            )
        case 'multi':
            return <div className={styles.multi}>{(f.options ?? []).map((o, i) => <span key={i} className={styles.chip}>{o}</span>)}</div>
        case 'yesno':
            return (
                <div className={styles.yesno}>
                    <span className={styles.choice}>{t('side_events.frm_guest_yes')}</span>
                    <span className={styles.choice}>{t('side_events.frm_guest_no')}</span>
                </div>
            )
        case 'check':
            return (
                <div className={styles.check}>
                    <span className={styles.box}><Check size={14} strokeWidth={3.2} /></span>
                    <span className={styles.checkCol}>
                        <span className={styles.checkLabel}>{f.label}</span>
                        {f.help && <span className={styles.checkHelp}>{f.help}</span>}
                    </span>
                </div>
            )
        case 'long':
            return <div className={styles.input} data-largo>{t('side_events.frm_guest_long_ph')}</div>
        case 'date':
            return <div className={styles.input}>{t('side_events.frm_guest_date_ph')}</div>
        default:
            return (
                <div className={styles.input}>
                    {f.prefix && <span className={styles.prefix}>{f.prefix}</span>}
                    <span>{f.placeholder ?? ''}</span>
                </div>
            )
    }
}

export const VistaPrevia = ({ formulario, activa, fondo }) => {
    const { t } = useTranslation()
    const items = useMemo(() => formulario.items ?? [], [formulario.items])

    // Preguntas en orden, con su sección (para las barras y la etiqueta).
    const lista = useMemo(() => {
        const out = []
        let seccion = -1
        let titulo = ''
        let hayInicio = false
        for (const it of items) {
            if (esSeccion(it)) { seccion += 1; titulo = it.title ?? ''; continue }
            if (seccion < 0 && !hayInicio) { hayInicio = true; seccion = 0 }
            out.push({ it, seccion: Math.max(0, seccion), titulo })
        }
        return out
    }, [items])

    const nSecciones = Math.max(1, (lista[lista.length - 1]?.seccion ?? 0) + 1)
    const idx = (() => {
        const i = lista.findIndex((x) => x.it.id === activa)
        if (i >= 0) return i
        const s = items.findIndex((it) => it.id === activa)
        if (s >= 0) {
            const siguiente = lista.findIndex((x) => items.indexOf(x.it) > s)
            if (siguiente >= 0) return siguiente
        }
        return lista.length ? 0 : -1
    })()
    const actual = idx >= 0 ? lista[idx] : null
    const f = actual ? campoPublicado(actual.it) : null
    const label = f?.label || t('side_events.frm_untitled_q')
    const visibles = lista.filter((x) => !incompleta(x.it)).length

    return (
        <aside className={styles.columna}>
            <div className={styles.cabecera}>
                <span>{t('side_events.frm_preview_title')}</span>
                {actual && <span className={styles.paso}>{t('side_events.frm_preview_step', { n: idx + 1, total: lista.length })}</span>}
            </div>

            <div className={styles.escenario}>
                {fondo && <img src={fondo} alt="" className={styles.fondo} />}
                <div className={styles.card}>
                    <div className={styles.header}>
                        <span className={styles.hostAv}>{inicialesDe(formulario.title) || '✓'}</span>
                        <span className={styles.headerCol}>
                            <span className={styles.title}>{formulario.title || t('side_events.frm_untitled')}</span>
                        </span>
                    </div>
                    {f ? (
                        <>
                            <div className={styles.topRow}>
                                <span className={styles.memberPill}><span>🎉</span>{t('side_events.frm_preview_guest')}</span>
                                <span className={styles.stepLabel}>{t('side_events.frm_preview_of', { n: idx + 1, total: lista.length })}</span>
                            </div>
                            <div className={styles.bars}>
                                {Array.from({ length: nSecciones }, (_, i) => (
                                    <span key={i}><span style={{ width: i < actual.seccion ? '100%' : i === actual.seccion ? '40%' : '0%' }} /></span>
                                ))}
                            </div>
                            {actual.titulo && <span className={styles.sectionLabel}>{actual.titulo}</span>}
                            <div className={styles.field}>
                                {f.type !== 'check' && (
                                    <div className={styles.labelRow}>
                                        <span className={styles.label} data-vacio={!f.label || undefined}>{label}</span>
                                        {!f.required && <span className={styles.optional}>{t('side_events.frm_optional')}</span>}
                                    </div>
                                )}
                                <Control f={{ ...f, label }} t={t} />
                                {f.help && f.type !== 'check' && <span className={styles.help}>{f.help}</span>}
                            </div>
                            <div className={styles.nav}>
                                <span className={styles.back}><ArrowLeft size={18} strokeWidth={2.2} /></span>
                                <span className={styles.espacio} />
                                <span className={styles.primary}>{t('side_events.frm_guest_next')}</span>
                            </div>
                        </>
                    ) : (
                        <span className={styles.vacio}>{t('side_events.frm_preview_empty')}</span>
                    )}
                </div>
            </div>
            <span className={styles.nota}>
                {visibles < lista.length
                    ? t('side_events.frm_preview_hidden', { count: lista.length - visibles })
                    : t('side_events.frm_preview_note')}
            </span>
        </aside>
    )
}
