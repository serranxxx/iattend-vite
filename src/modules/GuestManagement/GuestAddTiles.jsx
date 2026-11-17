import React, { useRef, useState } from 'react'
import { UserPlus, Sparkles, Download, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import './guest-add-tiles.css'

// Menú de Agregar invitados (boda, side events, Pop, Save the Date): filas
// (`topExtra` —De otro evento / copiar de la boda—, Individual) y el bloque
// "Desde Excel" con dos pasos: 1 · descargar la plantilla (opcional;
// public/plantillas, scripts/plantilla-invitados.mjs) y 2 · subir el Excel
// (Lia lo organiza). El bloque es solo PRO; sin PRO se ve bloqueado.
// `sinExcel`: sin el bloque (un Pop no lo tiene).
const PLANTILLA = '/plantillas/plantilla-invitados-iattend.xlsx'

export const GuestAddTiles = ({ onIndividual, onFile, topExtra, plan, sinExcel = false }) => {
    const { t } = useTranslation()
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef(null)
    const esPro = plan === 'pro'

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragOver(false)
        if (!esPro) return
        const file = e.dataTransfer.files?.[0]
        if (file) onFile(file)
    }

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (file) onFile(file)
    }

    return (
        <div className="guest-add-tiles">
            {topExtra}

            <button type="button" className="guest-add-tile guest-add-tile--individual" onClick={onIndividual}>
                <span className="guest-add-tile-icon">
                    <UserPlus size={18} />
                </span>
                <span className="guest-add-tile-text">
                    <span className="guest-add-tile-title">{t('guests_import.tile_individual_title')}</span>
                    <span className="guest-add-tile-sub">{t('guests_import.tile_individual_sub')}</span>
                </span>
            </button>

            {!sinExcel && (
                <div className={`guest-add-excel ${esPro ? '' : 'pro_badge'}`} data-bloqueado={!esPro || undefined}>
                    <div className="guest-add-excel-head">
                        <span className="guest-add-excel-title">{t('guests_import.tile_excel_title')}</span>
                        <span className="guest-add-excel-lia"><Sparkles size={14} />{t('guests_import.tile_excel_lia')}</span>
                    </div>

                    <a
                        className="guest-add-paso guest-add-paso--plantilla"
                        href={esPro ? PLANTILLA : undefined}
                        download={esPro ? 'Plantilla de invitados - I attend.xlsx' : undefined}
                        aria-disabled={!esPro || undefined}
                        tabIndex={esPro ? undefined : -1}
                    >
                        <span className="guest-add-paso-num">1</span>
                        <span className="guest-add-paso-text">
                            <span className="guest-add-paso-title">{t('guests_import.tile_template_title')}</span>
                            <span className="guest-add-paso-sub">{t('guests_import.tile_template_sub')}</span>
                        </span>
                        <Download size={18} className="guest-add-paso-icono" />
                    </a>

                    <button
                        type="button"
                        className={`guest-add-paso guest-add-paso--subir ${isDragOver ? 'is-dragover' : ''}`}
                        aria-disabled={!esPro || undefined}
                        onClick={() => esPro && fileInputRef.current?.click()}
                        onDragEnter={(e) => { e.preventDefault(); if (esPro) setIsDragOver(true) }}
                        onDragOver={(e) => { e.preventDefault(); if (esPro) setIsDragOver(true) }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                    >
                        <span className="guest-add-paso-num">2</span>
                        <span className="guest-add-paso-text">
                            <span className="guest-add-paso-title">{t('guests_import.drop_title')}</span>
                            <span className="guest-add-paso-sub">{t('guests_import.tile_upload_sub')}</span>
                        </span>
                        <Upload size={18} className="guest-add-paso-icono" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv,.ods,.numbers"
                        style={{ display: 'none' }}
                        onChange={handleFileInputChange}
                    />
                    {!esPro && <span className="guest-add-tile-lock-overlay" />}
                </div>
            )}
        </div>
    )
}
