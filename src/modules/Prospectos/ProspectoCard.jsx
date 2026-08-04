import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { Star, Instagram } from 'lucide-react'
import { NIVELES_INTERES } from './nivelInteres'
import styles from './ProspectoCard.module.css'

dayjs.extend(relativeTime)
dayjs.locale('es')

const initials = (name) => (name || '?').trim().slice(0, 2).toUpperCase()

const shortKey = (id) => `IG-${(id || '').replace(/-/g, '').slice(0, 4).toUpperCase()}`

const diasSinActividad = (prospecto) => {
    if (prospecto.estado !== 'en_conversacion' || !prospecto.updated_at) return null
    const dias = dayjs().diff(dayjs(prospecto.updated_at), 'day')
    return dias >= 7 ? dias : null
}

export const ProspectoCard = ({ prospecto, onClick, onToggleFavorito }) => {
    const dias = diasSinActividad(prospecto)

    const handleStarClick = (e) => {
        e.stopPropagation()
        onToggleFavorito(prospecto)
    }

    return (
        <div className={`${styles.card}${prospecto.favorito ? ' ' + styles.cardFavorito : ''}`} onClick={onClick}>
            <button
                type="button"
                className={styles.starBtn}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleStarClick}
                aria-label="Favorito"
            >
                <Star size={14} fill={prospecto.favorito ? '#FFAB00' : 'none'} color={prospecto.favorito ? '#FFAB00' : '#B3B9C4'} />
            </button>

            <div className={styles.cardHeader}>
                <Instagram size={13} className={styles.igIcon} />
                <span className={styles.cardKey}>{shortKey(prospecto.id)}</span>
                {prospecto.nivel_interes && (
                    <span
                        className={styles.interesDot}
                        title={NIVELES_INTERES.find(n => n.value === prospecto.nivel_interes)?.label}
                        style={{ background: NIVELES_INTERES.find(n => n.value === prospecto.nivel_interes)?.color }}
                    />
                )}
            </div>

            <span className={styles.username}>@{prospecto.instagram_username}</span>

            {dias && <span className={styles.staleTag}>{dias} días sin actividad</span>}

            <div className={styles.cardFooter}>
                <span className={styles.time}>{dayjs(prospecto.created_at).fromNow()}</span>
                {prospecto.vendedores?.nombre && (
                    <span className={styles.avatar} title={prospecto.vendedores.nombre}>
                        {initials(prospecto.vendedores.nombre)}
                    </span>
                )}
            </div>
        </div>
    )
}
