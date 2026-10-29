import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, MessageCircle } from 'lucide-react'
import { darker } from '../../helpers/assets/functions'
import { ASISTENTES_EJEMPLO, emojiAsistente, fondoAsistente, unidadesDe } from './datosAsistentes'
import styles from './AsistentesMuestra.module.css'

/*
  Cuadro "Asistentes" de un Flash en la pieza del editor (SideCanvas), cerrado:
  la pila de avatares, el "+N" y los nombres, con asistentes de ejemplo. El
  de verdad (que se abre en cuadrícula y recibe a quien va confirmando) vive
  en iattend-events: components/SideEvent/Asistentes/Asistentes.tsx.
*/

const STACK = 7

// `reales` ({ total, asistentes }): los confirmados del Flash; sin ellos, el ejemplo.
// `modo`: 'emoji' o 'initials' (body.attendeesStyle).
// `chat`: con el chat prendido (body.chat.enabled), su fila al pie, como la
// página del invitado (iattend-events, Chat/FilaChat.tsx), con el mensaje de
// ejemplo de "Ver en vivo".
export const AsistentesMuestra = ({ colorTema, reales = null, modo = 'emoji', chat = false }) => {
    const { t } = useTranslation()
    const ejemplo = !reales?.total
    // Por pases (titular + acompañantes), como la tarjeta del invitado.
    const unidades = unidadesDe(ejemplo ? ASISTENTES_EJEMPLO : reales.asistentes)
    const lista = unidades.flatMap((u) => u.miembros)
    const total = ejemplo ? lista.length : reales.total
    const mas = total - STACK
    return (
        <div className={styles.cuadro} style={{ '--borde-avatar': `${darker(colorTema ?? '#000000', 0.2) ?? '#000000'}80` }}>
            <div className={styles.cabecera}>
                <span className={styles.titulo}>{t('side_events.panel_attendees')}</span>
                <span className={styles.resumen}>
                    <span className={styles.punto} />
                    {t('side_events.att_count', { n: total })}
                </span>
            </div>
            <div className={styles.pila}>
                {lista.slice(0, STACK).map((a, i) => (
                    <span
                        key={a.id}
                        className={`${styles.avatar} ${modo === 'initials' ? styles.letras : ''}`}
                        style={{ left: i * 34, zIndex: 100 - i, background: fondoAsistente(a, modo) }}
                    >
                        {modo === 'initials' ? a.iniciales : emojiAsistente(a)}
                    </span>
                ))}
                {mas > 0 && <span className={styles.mas} style={{ left: STACK * 34 }}>+{mas}</span>}
            </div>
            <div className={styles.pie}>
                <span className={styles.nombres}>
                    {ejemplo && <span className={styles.ejemplo}>{t('side_events.att_example')}</span>}
                    {unidades.map((u) => u.etiqueta).filter(Boolean).join(', ')}
                </span>
                <span className={styles.verTodos}>
                    {t('side_events.att_see_all')}
                    <ChevronDown size={16} strokeWidth={2.4} />
                </span>
            </div>
            {chat && (
                <div className={styles.chat}>
                    <span className={styles.chatIcono}><MessageCircle size={18} /></span>
                    <span className={styles.chatCol}>
                        <span className={styles.chatTitulo}>
                            <span className={styles.chatTituloTexto}>{t('side_events.chat_row_title')}</span>
                            <span className={styles.chatNuevos}>{t('side_events.chat_row_new', { count: 3 })}</span>
                        </span>
                        <span className={styles.chatPrevia}><b>Regina:</b> {t('side_events.chat_row_sample')}</span>
                    </span>
                    <ChevronRight size={18} strokeWidth={2.2} />
                </div>
            )}
        </div>
    )
}
