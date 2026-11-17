/*
  Barra de la capa PDF (arriba de la pieza, como las demás barras del editor):
  sale al elegir el PDF en la pieza o en Capas. Subir / reemplazar el PDF,
  ver el original y volver al diseño de I attend.
*/

import { ArrowLeftRight, ExternalLink, FileText, FileUp, Loader2, RefreshCw } from 'lucide-react'
import { useSubirPdf } from './useSubirPdf'
import { confirmarVolverADiseno } from './volverADiseno'
import styles from '../Build/PageSections/ElementBar.module.css'
import propios from './PdfBar.module.css'

export const PdfBar = ({ invitation, invitationID, setInvitation, setSaved }) => {
    const { elegir, input, progreso, textoProgreso } = useSubirPdf({ invitationID, setInvitation, setSaved })
    const pdf = invitation?.pdf ?? {}
    const tiene = (pdf.pages?.length ?? 0) > 0

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            {input}
            {progreso ? (
                <span className={propios.estado}>
                    <Loader2 size={16} className={propios.gira} />
                    {textoProgreso}
                </span>
            ) : (
                <>
                    <span className={propios.estado} title={pdf.fileName}>
                        <FileText size={16} />
                        {tiene ? (
                            <>
                                <span className={propios.nombre}>{pdf.fileName || 'Invitación.pdf'}</span>
                                <span className={propios.paginas}>· {pdf.paginas} {pdf.paginas === 1 ? 'página' : 'páginas'}</span>
                            </>
                        ) : 'Sin PDF'}
                    </span>
                    <span className={styles.divider} />
                    <button type="button" className={styles.textBtn} onClick={elegir}>
                        {tiene ? <RefreshCw size={16} /> : <FileUp size={16} />}
                        {tiene ? 'Reemplazar PDF' : 'Subir PDF'}
                    </button>
                    {pdf.source && (
                        <a className={styles.iconBtn} href={pdf.source} target="_blank" rel="noreferrer" title="Ver el PDF original">
                            <ExternalLink size={16} />
                        </a>
                    )}
                    <span className={styles.divider} />
                    <button type="button" className={styles.textBtn} onClick={() => confirmarVolverADiseno(setInvitation, setSaved)}>
                        <ArrowLeftRight size={16} />
                        Diseño de I attend
                    </button>
                </>
            )}
        </div>
    )
}
