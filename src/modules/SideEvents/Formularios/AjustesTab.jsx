import { useTranslation } from 'react-i18next'
import styles from './FormularioVista.module.css'

/*
  Pestaña Ajustes de la vista completa (handoff 1b): reglas de ESTE Pop
  (body.form), no del formulario: quién responde, si es obligatorio (al
  confirmar se abre solo y no se puede cerrar hasta responderlo), si acepta
  respuestas, si se puede dejar para después, prefijo del folio y link del
  aviso de privacidad. Entran al historial del editor y se guardan con el Pop.
*/

const Interruptor = ({ on, onClick, label }) => (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={styles.switchGrande} data-on={on || undefined} onClick={onClick}>
        <span />
    </button>
)

export const AjustesTab = ({ reglas, updateForm }) => {
    const { t } = useTranslation()
    const set = (patch, opts) => updateForm((prev) => ({ ...(prev ?? {}), ...patch }), opts)
    const scope = reglas?.scope === 'grupo' ? 'grupo' : 'persona'
    const abierto = reglas?.accepting !== false
    const despues = reglas?.allowLater !== false
    const obligatorio = reglas?.required === true

    return (
        <div className={styles.ajustes}>
            <section className={styles.ajuste}>
                <span className={styles.ajusteTitulo}>{t('side_events.frm_set_who')}</span>
                <div className={styles.segmentado} role="tablist">
                    {['persona', 'grupo'].map((id) => (
                        <button key={id} type="button" role="tab" aria-selected={scope === id} className={scope === id ? styles.segOn : undefined} onClick={() => set({ scope: id })}>
                            {t(`side_events.frm_scope_${id}`)}
                        </button>
                    ))}
                </div>
                <span className={styles.ajusteNota}>{t(`side_events.frm_scope_${scope}_hint`)}</span>
            </section>

            <section className={styles.ajuste} data-fila>
                <span className={styles.ajusteCol}>
                    <span className={styles.ajusteTitulo}>{t('side_events.frm_set_required')}</span>
                    <span className={styles.ajusteNota}>{t(obligatorio ? 'side_events.frm_set_required_on' : 'side_events.frm_set_required_off')}</span>
                </span>
                <Interruptor on={obligatorio} label={t('side_events.frm_set_required')} onClick={() => set({ required: !obligatorio })} />
            </section>

            <section className={styles.ajuste} data-fila>
                <span className={styles.ajusteCol}>
                    <span className={styles.ajusteTitulo}>{t('side_events.frm_set_accepting')}</span>
                    <span className={styles.ajusteNota}>{t(abierto ? 'side_events.frm_set_accepting_on' : 'side_events.frm_set_accepting_off')}</span>
                </span>
                <Interruptor on={abierto} label={t('side_events.frm_set_accepting')} onClick={() => set({ accepting: !abierto })} />
            </section>

            {scope === 'persona' && (
                <section className={styles.ajuste} data-fila>
                    <span className={styles.ajusteCol}>
                        <span className={styles.ajusteTitulo}>{t('side_events.frm_set_later')}</span>
                        <span className={styles.ajusteNota}>{t('side_events.frm_set_later_hint')}</span>
                    </span>
                    <Interruptor on={despues} label={t('side_events.frm_set_later')} onClick={() => set({ allowLater: !despues })} />
                </section>
            )}

            <section className={styles.ajuste}>
                <div className={styles.ajusteGrid}>
                    <label className={styles.ajusteCampo}>
                        <span>{t('side_events.frm_set_prefix')}</span>
                        <input
                            value={reglas?.folioPrefix ?? ''}
                            maxLength={5}
                            placeholder="REG"
                            onChange={(e) => set({ folioPrefix: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }, { coalesce: 'form.folioPrefix' })}
                        />
                    </label>
                    <label className={styles.ajusteCampo}>
                        <span>{t('side_events.frm_set_privacy')}</span>
                        <input
                            value={reglas?.privacyUrl ?? ''}
                            placeholder="https://…"
                            inputMode="url"
                            onChange={(e) => set({ privacyUrl: e.target.value.trim() }, { coalesce: 'form.privacyUrl' })}
                        />
                    </label>
                </div>
                <span className={styles.ajusteNota}>{t('side_events.frm_set_prefix_hint')}</span>
            </section>

            <span className={styles.ajustesNota}>{t('side_events.frm_set_note')}</span>
        </div>
    )
}
