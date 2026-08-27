import React from 'react'
import styles from './SeatingChrome.module.css'

/**
 * Franja de avance del drawer (§5.2).
 *
 * Reemplaza la leyenda "Lugares ocupados / disponibles" del pie del mapa por
 * la pregunta que el organizador sí se hace: cuánta gente falta por sentar.
 * A la derecha, la señal de capacidad sobrante — el dato más accionable de la
 * pantalla, que hoy está enterrado.
 */
export const ProgressStrip = ({ seated, totalConfirmed, unseated, surplus, tableCount, onReview }) => {
    const pct = totalConfirmed > 0 ? Math.round((seated * 100) / totalConfirmed) : 0

    return (
        <div className={styles.strip}>
            <div className={styles.stripMain}>
                <div className={styles.stripText}>
                    <span className={styles.stripTitle}>
                        {seated} de {totalConfirmed} sentados
                    </span>
                    <span className={styles.stripSub}>
                        {unseated === 0
                            ? 'Todos los confirmados tienen mesa'
                            : `${unseated} invitado${unseated === 1 ? '' : 's'} confirmado${unseated === 1 ? '' : 's'} sin mesa`}
                    </span>
                </div>

                <div className={styles.stripBar}>
                    <div className={styles.stripBarFill} style={{ width: `${pct}%` }} />
                </div>
            </div>

            {surplus > 0 && (
                <div className={styles.surplus}>
                    <div className={styles.surplusText}>
                        <span className={styles.surplusTitle}>
                            {surplus} lugares de sobra
                        </span>
                        <span className={styles.surplusSub}>
                            en {tableCount} mesas — más capacidad que invitados
                        </span>
                    </div>
                    <button type='button' className={styles.surplusAction} onClick={onReview}>
                        Revisar
                    </button>

                    {/* En móvil la sobra se reduce a la cifra: el ancho no da
                        para la frase completa y el número es lo accionable. */}
                    <button type='button' className={styles.surplusCompact} onClick={onReview}>
                        <span className={styles.surplusCompactNum}>{surplus}</span>
                        <span className={styles.surplusCompactLabel}>de sobra</span>
                    </button>
                </div>
            )}
        </div>
    )
}

const TABLE_OPTIONS = [
    { shape: 'round', name: 'Redonda', hint: '8 a 12 lugares', icon: styles.shapeRound },
    { shape: 'square', name: 'Cuadrada', hint: 'hasta 16', icon: styles.shapeSquare },
    { shape: 'rectangle', name: 'Rectangular', hint: 'hasta 18', icon: styles.shapeRect },
]

const ELEMENT_OPTIONS = [
    { type: 'dancefloor', name: 'Pista de baile' },
    { type: 'entrance', name: 'Entrada' },
    { type: 'restroom', name: 'Baños' },
    { type: 'bar', name: 'Barra' },
    { type: 'dj', name: 'DJ o grupo' },
]

/**
 * Menú del botón "+ Agregar" (§5.0.4).
 *
 * Un solo botón en el header con dos secciones. Reemplaza el viejo
 * "+ Nueva Mesa" y el botón suelto de pista de baile.
 */
export const AddMenu = ({ onAddTable, onAddElement, onAutoLayout }) => (
    <div className={styles.addMenu} onClick={(e) => e.stopPropagation()}>
        <span className={styles.addSection}>Nueva mesa</span>
        {TABLE_OPTIONS.map(({ shape, name, hint, icon }) => (
            <button
                key={shape}
                type='button'
                className={styles.addItem}
                onClick={() => onAddTable(shape)}
            >
                <span className={`${styles.shapeIcon} ${icon}`} />
                <span className={styles.addItemText}>
                    <span className={styles.addItemName}>{name}</span>
                    <span className={styles.addItemHint}>{hint}</span>
                </span>
            </button>
        ))}

        <div className={styles.addDivider} />

        <span className={styles.addSection}>Elementos del salón</span>
        {ELEMENT_OPTIONS.map(({ type, name }) => (
            <button
                key={type}
                type='button'
                className={styles.addItem}
                onClick={() => onAddElement(type)}
            >
                <span className={styles.elementIcon} />
                <span className={styles.addItemText}>
                    <span className={styles.addItemName}>{name}</span>
                </span>
            </button>
        ))}

        {/* En móvil no hay sitio para el botón de auto acomodo en la barra
            superior, así que entra aquí: sigue siendo "cambiar el salón". */}
        {onAutoLayout && (
            <>
                <div className={styles.addDivider} />
                <button type='button' className={styles.addItem} onClick={onAutoLayout}>
                    <span className={styles.elementIcon} />
                    <span className={styles.addItemText}>
                        <span className={styles.addItemName}>Auto acomodo</span>
                        <span className={styles.addItemHint}>reacomoda todas las mesas</span>
                    </span>
                </button>
            </>
        )}
    </div>
)
