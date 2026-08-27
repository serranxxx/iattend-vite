import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { LAYOUTS } from './autoLayout'
import styles from './AutoLayoutModal.module.css'

/** Miniatura esquemática de cada acomodo: pista en gris, mesas en lila. */
const Thumb = ({ layoutKey }) => {
    const dot = (key, style) => <span key={key} className={styles.thumbTable} style={style} />

    if (layoutKey === 'dance-side') {
        return (
            <div className={styles.thumb}>
                <span className={styles.thumbFloor} style={{ left: 6, top: 6, width: 34, bottom: 6 }} />
                {[0, 1, 2, 3, 4, 5].map(i =>
                    dot(i, { left: 50 + (i % 3) * 20, top: 12 + Math.floor(i / 3) * 26 })
                )}
            </div>
        )
    }

    if (layoutKey === 'stage-front') {
        return (
            <div className={styles.thumb}>
                <span className={styles.thumbStage} style={{ left: 22, top: 6, right: 22, height: 10 }} />
                <span className={styles.thumbFloor} style={{ left: 36, top: 24, width: 40, height: 26 }} />
                {[0, 1].map(i => dot(`l${i}`, { left: 10, top: 26 + i * 20 }))}
                {[0, 1].map(i => dot(`r${i}`, { right: 10, top: 26 + i * 20 }))}
                {[0, 1, 2].map(i => dot(`b${i}`, { left: 26 + i * 20, bottom: 8 }))}
            </div>
        )
    }

    return (
        <div className={styles.thumb}>
            <span className={styles.thumbFloor} style={{ left: 32, top: 22, width: 40, height: 28 }} />
            {[0, 1, 2].map(i => dot(`t${i}`, { left: 28 + i * 20, top: 8 }))}
            {[0, 1, 2].map(i => dot(`b${i}`, { left: 28 + i * 20, bottom: 8 }))}
            {dot('l', { left: 10, top: 30 })}
            {dot('r', { right: 10, top: 30 })}
        </div>
    )
}

/**
 * Elige uno de los tres acomodos y reposiciona el salón (§4.4).
 *
 * Solo mueve mesas: no crea, no borra y no toca quién está sentado dónde.
 */
export const AutoLayoutModal = ({ open, tableCount, suggested, onCancel, onApply }) => {
    const [selected, setSelected] = useState(suggested ?? 'dance-center')

    // Cerrar con Escape, como cualquier diálogo.
    useEffect(() => {
        if (!open) return
        const onKey = (e) => { if (e.key === 'Escape') onCancel() }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
    }, [open, onCancel])

    if (!open) return null

    return (
        // Diálogo propio en vez de Modal de antd: el de antd se portalea a
        // <body> —sus clics cerraban el Drawer— y su padding no era el de esta
        // pantalla.
        <div className={styles.overlay} onClick={onCancel}>
            <div
                className={styles.dialog}
                role='dialog'
                aria-modal='true'
                aria-label='Elige el acomodo'
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.header}>
                    <span className={styles.title}>Elige el acomodo</span>
                    <button type='button' className={styles.close} onClick={onCancel} aria-label='Cerrar'>
                        <X size={16} />
                    </button>
                </div>

                <div className={styles.body}>
                    <p className={styles.intro}>
                        Esto solo mueve las mesas de lugar. Nadie pierde su asiento, y lo
                        puedes deshacer con la flecha de atrás.
                    </p>

                    <div className={styles.options}>
                        {LAYOUTS.map((layout) => (
                            <button
                                key={layout.key}
                                type='button'
                                className={`${styles.option} ${selected === layout.key ? styles.optionActive : ''}`}
                                onClick={() => setSelected(layout.key)}
                            >
                                <Thumb layoutKey={layout.key} />

                                <span className={styles.optionText}>
                                    <span className={styles.optionName}>{layout.name}</span>
                                    <span className={styles.optionDesc}>{layout.description}</span>
                                    <span className={styles.traits}>
                                        {layout.traits.map(trait => (
                                            <span key={trait} className={styles.trait}>{trait}</span>
                                        ))}
                                    </span>
                                </span>
                            </button>
                        ))}
                    </div>

                    <span className={styles.note}>
                        Es solo el punto de partida: después puedes mover cada mesa a mano.
                    </span>
                </div>

                <div className={styles.footer}>
                    <button type='button' className={styles.cancel} onClick={onCancel}>
                        Cancelar
                    </button>
                    <button type='button' className={styles.confirm} onClick={() => onApply(selected)}>
                        Acomodar mis {tableCount} mesas
                    </button>
                </div>
            </div>
        </div>
    )
}
