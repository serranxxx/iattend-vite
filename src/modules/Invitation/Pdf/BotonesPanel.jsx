/*
  Herramienta "Botones" del riel (solo con la invitación en PDF): agrega
  botones con link sobre el PDF, como si fueran stickers. Tocar una muestra
  lo agrega al centro de lo que se ve (o se arrastra a donde va); ya en la
  pieza, su barra de arriba (ElementBar) le pone texto, link, colores y
  estilo, uno por uno. Abajo, "Tus botones": los que ya tiene, con aviso si
  alguno no tiene link. Reglas: botonesPdf.js. Ver docs/invitacion-pdf.md.
*/

import { useTranslation } from 'react-i18next'
import { CircleAlert, Link2 } from 'lucide-react'
import { addLayerItem, startLayerDrag, tocarParaAgregar } from '../Build/PageSections/layerItems'
import { SECCION_PDF } from './pdfInvitacion'
import { ESTILOS_BOTON, botonNuevo, estiloMuestra, linkDeBoton } from './botonesPdf'
import styles from './BotonesPanel.module.css'

// Atajos con el texto ya puesto (el link se pone en la barra del botón).
const ATAJOS = ['location', 'gifts', 'hotel', 'whatsapp', 'dresscode', 'more']

export const BotonesPanel = ({ invitation, onElegir }) => {
    const { t } = useTranslation()
    const botones = (invitation?.decorations?.[SECCION_PDF] ?? []).filter((it) => it.kind === 'boton')
    const sinLink = botones.filter((b) => !linkDeBoton(b.url)).length

    // Clic = se agrega al centro de lo que se ve; arrastrar = donde se suelte.
    // En el celular (onElegir) se agrega con un toque.
    const agregar = (e, item) => (onElegir
        ? tocarParaAgregar(e, () => onElegir(item))
        : startLayerDrag(e, item, { onTap: () => addLayerItem(item, SECCION_PDF) }))

    const elegir = (b) => window.dispatchEvent(new CustomEvent('iattend-host-layer-select', { detail: { section: SECCION_PDF, id: b.id } }))

    return (
        <div className={styles.panel}>
            <p className={styles.texto}>{t('build_editor.btn_panel_hint')}</p>

            <span className={styles.etiqueta}>{t('build_editor.btn_styles')}</span>
            <div className={styles.estilos}>
                {ESTILOS_BOTON.map((estilo) => {
                    const item = botonNuevo(invitation, { estilo, text: t('build_editor.btn_default_text') })
                    return (
                        <div
                            key={estilo}
                            className={styles.tarjeta}
                            data-estilo={estilo}
                            role="button"
                            tabIndex={0}
                            title={t(`build_editor.btn_style_${estilo}`)}
                            onPointerDown={(e) => agregar(e, item)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addLayerItem(item, SECCION_PDF) }}
                        >
                            <span className={styles.muestra} data-estilo={estilo} style={estiloMuestra(item)}>{item.text}</span>
                            <span className={styles.nombre}>{t(`build_editor.btn_style_${estilo}`)}</span>
                        </div>
                    )
                })}
            </div>

            <span className={styles.etiqueta}>{t('build_editor.btn_shortcuts')}</span>
            <div className={styles.atajos}>
                {ATAJOS.map((id) => {
                    const item = botonNuevo(invitation, { text: t(`build_editor.btn_text_${id}`) })
                    return (
                        <div
                            key={id}
                            className={styles.atajo}
                            role="button"
                            tabIndex={0}
                            onPointerDown={(e) => agregar(e, item)}
                            onKeyDown={(e) => { if (e.key === 'Enter') addLayerItem(item, SECCION_PDF) }}
                        >
                            {item.text}
                        </div>
                    )
                })}
            </div>

            {botones.length > 0 && (
                <>
                    <span className={styles.etiqueta}>
                        {t('build_editor.btn_yours', { count: botones.length })}
                    </span>
                    {sinLink > 0 && (
                        <p className={styles.aviso}>
                            <CircleAlert size={14} /> {t('build_editor.btn_missing_links', { count: sinLink })}
                        </p>
                    )}
                    <div className={styles.lista}>
                        {botones.map((b) => {
                            const link = linkDeBoton(b.url)
                            return (
                                <button key={b.id} type="button" className={styles.fila} onClick={() => elegir(b)}>
                                    <span className={styles.miniBoton} style={estiloMuestra(b)}>{b.text?.trim() || t('build_editor.lp_el_boton')}</span>
                                    <span className={styles.link} data-falta={!link || undefined}>
                                        {link ? <><Link2 size={12} /> {link.replace(/^(https?:\/\/|mailto:|tel:)/i, '')}</> : t('build_editor.btn_no_link')}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}

export default BotonesPanel
