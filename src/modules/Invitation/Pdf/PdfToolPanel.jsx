/*
  Herramienta "Mi PDF" del riel del editor de la invitación (EditorWorkspace),
  con el mismo acomodo que Subidos:
  - "Subir PDF" (clic o arrastrar): lo convierte y lo pone como la invitación.
    El mismo PDF no se sube dos veces (carpeta = huella del archivo).
  - "Tus PDF": los que ya se subieron a esta invitación (`<id>/pdf/<huella>/`).
    Tocar uno lo usa sin volver a subirlo; la papelera lo borra de Storage
    (no deja borrar el que está en el editor ni el publicado).
  - Medidor del espacio de la invitación: los PDF cuentan (lo mide la base) y
    "Ampliar" abre la compra de Subidos.
  - En modo PDF, "Volver al diseño de I attend".
  Lo demás del riel (Diseño, texturas, pase…) sigue igual. El cambio llega a
  los invitados hasta publicar. Ver docs/invitacion-pdf.md.
*/

import { useEffect, useState } from 'react'
import { Modal, message } from 'antd'
import { ArrowLeftRight, Check, FileUp, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { MB, getStorageQuota } from '../../../helpers/services/storageQuota'
import { esPdf } from './pdfInvitacion'
import { useSubirPdf, usarFichaPdf } from './useSubirPdf'
import { confirmarVolverADiseno } from './volverADiseno'
import { borrarPdf, carpetaDePdf, enUsoPublicado, listarPdfs } from './pdfsSubidos'
import { MAX_MB, MAX_PAGINAS } from './convertirPdf'
import styles from './PdfToolPanel.module.css'

const mb = (bytes) => (bytes / MB).toFixed(1)

export const PdfToolPanel = ({ invitation, invitationID, setInvitation, setSaved, activeLang, onOpenTool }) => {
    const { cargar, elegir, input, progreso, textoProgreso } = useSubirPdf({ invitationID, setInvitation, setSaved })
    const enPdf = esPdf(invitation)
    const carpetaActual = enPdf ? carpetaDePdf(invitation?.pdf) : null

    const [pdfs, setPdfs] = useState(null)
    const [quota, setQuota] = useState(null)
    const [arrastrando, setArrastrando] = useState(false)
    const [borrando, setBorrando] = useState(null)

    const cargarLista = () => {
        if (!invitationID) return
        listarPdfs(invitationID).then(setPdfs).catch(() => setPdfs([]))
        getStorageQuota(invitationID).then(setQuota).catch(() => {})
    }
    useEffect(() => {
        cargarLista()
        window.addEventListener('iattend-storage-changed', cargarLista)
        return () => window.removeEventListener('iattend-storage-changed', cargarLista)
    }, [invitationID])

    const usar = (item) => {
        if (activeLang) { message.info('Cambia al idioma original para usar un PDF.'); return }
        usarFichaPdf(setInvitation, setSaved, item.ficha)
    }

    const borrar = async (item, e) => {
        e.stopPropagation()
        if (item.carpeta === carpetaActual) {
            message.info('Es el PDF de tu invitación. Elige o sube otro (o vuelve al diseño de I attend) antes de borrarlo.')
            return
        }
        if (await enUsoPublicado(invitationID, item.carpeta)) {
            message.info('Tus invitados ven este PDF. Publica con otro antes de borrarlo.')
            return
        }
        Modal.confirm({
            title: '¿Borrar este PDF?',
            content: 'Se borran sus páginas y el archivo original. Libera espacio y no se puede deshacer.',
            okText: 'Borrar',
            okButtonProps: { danger: true },
            cancelText: 'Cancelar',
            onOk: async () => {
                setBorrando(item.carpeta)
                try {
                    await borrarPdf(item.carpeta)
                    message.success('PDF borrado')
                } catch (err) {
                    console.error('No se pudo borrar el PDF:', err)
                    message.error('No se pudo borrar el PDF')
                } finally {
                    setBorrando(null)
                }
            },
        })
    }

    const ampliar = () => {
        onOpenTool?.('uploads')
        // Subidos abre su compra de espacio con este aviso.
        setTimeout(() => window.dispatchEvent(new CustomEvent('iattend-storage-full', { detail: { invitationID } })), 350)
    }

    const used = quota?.used ?? (pdfs ?? []).reduce((s, x) => s + x.bytes, 0)
    const limitMb = quota?.limitMb ?? null
    const ratio = limitMb ? used / (limitMb * MB) : 0
    const bloqueado = Boolean(activeLang)

    return (
        <div className={styles.panel}>
            {input}

            <div className={styles.beta}>
                <span className={styles.betaBadge}><Sparkles size={11} strokeWidth={2.4} /> Nuevo · En pruebas</span>
                <p>
                    Las invitaciones en PDF son nuevas y todavía las estamos probando. Si algo no se ve bien, avísanos desde el botón de soporte.
                </p>
            </div>

            {!enPdf && (
                <p className={styles.texto}>
                    Sube tu invitación ya diseñada en PDF: tus invitados la ven completa, con los botones de I attend encima.
                </p>
            )}

            {progreso ? (
                <div className={styles.drop} data-ocupado>
                    <span className={styles.dropIcon}><Loader2 size={18} className={styles.gira} /></span>
                    <span className={styles.dropText}>
                        <strong>Subiendo PDF</strong>
                        <span>{textoProgreso}</span>
                    </span>
                </div>
            ) : (
                <button
                    type="button"
                    className={styles.drop}
                    data-over={arrastrando || undefined}
                    disabled={bloqueado}
                    onClick={elegir}
                    onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
                    onDragLeave={() => setArrastrando(false)}
                    onDrop={(e) => { e.preventDefault(); setArrastrando(false); cargar(e.dataTransfer.files?.[0]) }}
                >
                    <span className={styles.dropIcon}><FileUp size={18} /></span>
                    <span className={styles.dropText}>
                        <strong>Subir PDF</strong>
                        <span>{bloqueado ? 'Cambia al idioma original para usar un PDF' : `Arrastra aquí o haz clic · hasta ${MAX_PAGINAS} páginas y ${MAX_MB} MB`}</span>
                    </span>
                </button>
            )}

            <span className={styles.etiqueta}>Tus PDF</span>
            {pdfs === null ? (
                <span className={styles.vacio}><Loader2 size={14} className={styles.gira} /> Cargando…</span>
            ) : pdfs.length ? (
                <div className={styles.grid}>
                    {pdfs.map((item) => {
                        const enUso = item.carpeta === carpetaActual
                        return (
                            <div
                                key={item.carpeta}
                                role="button"
                                tabIndex={0}
                                className={styles.tarjeta}
                                data-en-uso={enUso || undefined}
                                data-borrando={borrando === item.carpeta || undefined}
                                title={enUso ? 'Es el PDF de tu invitación' : 'Usar este PDF'}
                                onClick={() => !enUso && usar(item)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !enUso) usar(item) }}
                            >
                                <div className={styles.miniatura}>
                                    <img src={item.ficha.pages[0].url} alt="" loading="lazy" draggable={false} />
                                    {enUso && <span className={styles.enUso}><Check size={11} strokeWidth={3} /> En uso</span>}
                                    <button type="button" className={styles.borrar} aria-label="Borrar PDF" onClick={(e) => borrar(item, e)}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                                <span className={styles.nombre} title={item.ficha.fileName || 'PDF'}>{item.ficha.fileName || 'PDF'}</span>
                                <span className={styles.meta}>{item.ficha.paginas} {item.ficha.paginas === 1 ? 'pág.' : 'págs.'} · {mb(item.bytes)} MB</span>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <span className={styles.vacio}>Todavía no subes ningún PDF.</span>
            )}

            <div className={styles.meter} data-level={ratio >= 1 ? 'full' : ratio >= 0.8 ? 'high' : undefined}>
                <div className={styles.meterBar}><span style={{ width: `${Math.min(100, ratio * 100)}%` }} /></div>
                <div className={styles.meterRow}>
                    <span>{limitMb ? `${mb(used)} MB de ${limitMb} MB` : `${mb(used)} MB usados`}</span>
                    {limitMb != null && limitMb < 30 && (
                        <button type="button" className={styles.ampliar} onClick={ampliar}>Ampliar a 30 MB</button>
                    )}
                </div>
                <span className={styles.meterNote}>Tus PDF cuentan para tu espacio, junto con lo de Subidos.</span>
            </div>

            {enPdf && (
                <button type="button" className={styles.volver} onClick={() => confirmarVolverADiseno(setInvitation, setSaved)}>
                    <ArrowLeftRight size={14} /> Volver al diseño de I attend
                </button>
            )}
        </div>
    )
}
