import React, { useRef, useState } from 'react'
import { UserPlus, UploadCloud, Sparkles } from 'lucide-react'
import './guest-add-tiles.css'

export const GuestAddTiles = ({ onIndividual, onFile, topExtra, plan }) => {
    const [isDragOver, setIsDragOver] = useState(false)
    const fileInputRef = useRef(null)

    const handleDrop = (e) => {
        e.preventDefault()
        if (plan !== 'pro') return
        setIsDragOver(false)
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
                    <UserPlus size={14} />
                </span>
                <span className="guest-add-tile-text">
                    <span className="guest-add-tile-title">Individual</span>
                    <span className="guest-add-tile-sub">Agrega uno a la vez</span>
                </span>
            </button>

            <button
                type="button"
                disabled={plan !== 'pro' ? true : false}
                style={{overflow:'hidden'}}
                className={`guest-add-tile guest-add-tile--excel ${isDragOver ? 'is-dragover' : ''} ${plan !== 'pro' ? 'pro_badge' : ''} `}
                onClick={() => plan === 'pro' && fileInputRef.current?.click()}
                onDragEnter={(e) => { e.preventDefault(); if (plan === 'pro') setIsDragOver(true) }}
                onDragOver={(e) => { e.preventDefault(); if (plan === 'pro') setIsDragOver(true) }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
            >
                <div 
                style={{
                    position:'absolute', width:'100%', height:'100%',
                    backgroundColor: '#00000020',
                    backdropFilter:'blur(1px)', 
                    left:0, top:0
                }}>
                    
                </div>
                <span className="guest-add-tile-icon guest-add-tile-icon--excel">
                    <Sparkles size={14} />
                </span>
                <span className="guest-add-tile-text">
                    <span className="guest-add-tile-title">Arrastra tu Excel aquí</span>
                    <span className="guest-add-tile-sub">o haz clic — Lia lo organiza por ti</span>
                </span>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={handleFileInputChange}
                />
                {plan !== 'pro' && <span className="guest-add-tile-lock-overlay" />}
            </button>
        </div>
    )
}
