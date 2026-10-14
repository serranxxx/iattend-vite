import styles from './PlannerSkeleton.module.css'

/**
 * Esqueleto del contenido del planner (PlannerLayout) mientras cargan sus
 * invitaciones: imita la vista que va a salir para que la página no se quede
 * en blanco. `variante`: 'explora' (carrusel + invitación de ejemplo) o
 * 'lista' (Mis clientes / Mis eventos).
 */
export const PlannerSkeleton = ({ variante = 'explora' }) => {
    if (variante === 'lista') {
        return (
            <div className={styles.lista} aria-busy='true' aria-live='polite'>
                <span className={`${styles.bloque} ${styles.cabeza}`} />
                {Array.from({ length: 5 }, (_, i) => (
                    <div className={styles.fila} key={i}>
                        <span className={`${styles.bloque} ${styles.miniatura}`} />
                        <div className={styles.textos}>
                            <span className={`${styles.bloque} ${styles.linea}`} style={{ width: `${60 - i * 6}%` }} />
                            <span className={`${styles.bloque} ${styles.lineaChica}`} />
                        </div>
                        <span className={`${styles.bloque} ${styles.pastilla}`} />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className={styles.explora} aria-busy='true' aria-live='polite'>
            <span className={`${styles.bloque} ${styles.carrusel}`} />
            <div className={styles.ejemplo}>
                <span className={`${styles.bloque} ${styles.tarjeta}`} />
                <div className={styles.ejemploTexto}>
                    <span className={`${styles.bloque} ${styles.etiqueta}`} />
                    <span className={`${styles.bloque} ${styles.titulo}`} />
                    <span className={`${styles.bloque} ${styles.linea}`} />
                    <span className={`${styles.bloque} ${styles.linea}`} style={{ width: '70%' }} />
                    <div className={styles.botones}>
                        <span className={`${styles.bloque} ${styles.boton}`} />
                        <span className={`${styles.bloque} ${styles.boton}`} style={{ width: 120 }} />
                    </div>
                </div>
            </div>
        </div>
    )
}
