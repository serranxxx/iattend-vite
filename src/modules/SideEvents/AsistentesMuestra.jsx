import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, MessageCircle } from 'lucide-react'
import { darker } from '../../helpers/assets/functions'
import { emojiAsistente, fondoAsistente, rellenarConEjemplo, unidadesDe } from './datosAsistentes'
import styles from './AsistentesMuestra.module.css'

/*
  Cuadro "Asistentes" de un Pop en la pieza del editor (SideCanvas), cerrado:
  la pila de avatares, el "+N" y los nombres de los confirmados REALES
  (sin ninguno, el cuadro vacío; ya no hay asistentes de ejemplo). El de
  verdad (que se abre en cuadrícula y recibe a quien va confirmando) vive en
  iattend-events: components/SideEvent/Asistentes/Asistentes.tsx.
*/

const STACK = 7

// `reales` ({ total, asistentes }): los confirmados del Pop.
// `modo`: 'emoji' o 'initials' (body.attendeesStyle).
// `chat`: con el chat prendido (body.chat.enabled), su fila al pie, como la
// página del invitado (iattend-events, Chat/FilaChat.tsx), con el último
// mensaje real (`chatMensajes`, de useMensajesChat: el más reciente primero).
const primerNombre = (n) => String(n ?? '').trim().split(/\s+/)[0] ?? ''

// `colorAvatares`: base de las iniciales (colorAvatares de datosAsistentes.js).
export const AsistentesMuestra = ({ colorTema, colorAvatares = colorTema, reales = null, modo = 'emoji', chat = false, chatMensajes = null, sinTitulo }) => {
    const { t } = useTranslation()
    // Los reales y, si son pocos, ejemplos para que se vea lleno (solo aquí).
    const conRelleno = rellenarConEjemplo(reales)
    // Por pases (titular + acompañantes), como la tarjeta del invitado.
    const unidades = unidadesDe(conRelleno.asistentes)
    const lista = unidades.flatMap((u) => u.miembros)
    const total = conRelleno.total
    const mas = total - STACK
    const ultimo = chatMensajes?.[0] ?? null
    return (
        <div className={styles.cuadro} style={{ '--borde-avatar': `${darker(colorTema ?? '#000000', 0.2) ?? '#000000'}80` }}>
            <div className={styles.cabecera}>
                {!sinTitulo && <span className={styles.titulo}>{t('side_events.panel_attendees')}</span>}
                <span className={styles.resumen}>
                    <span className={styles.punto} />
                    {t('side_events.att_count', { n: total })}
                </span>
            </div>
            {total > 0 ? (
                <>
                    <div className={styles.pila}>
                        {lista.slice(0, STACK).map((a, i) => (
                            <span
                                key={a.id}
                                className={`${styles.avatar} ${modo === 'initials' ? styles.letras : ''}`}
                                style={{ left: i * 34, zIndex: 100 - i, background: fondoAsistente(a, modo, colorAvatares) }}
                            >
                                {modo === 'initials' ? a.iniciales : emojiAsistente(a)}
                            </span>
                        ))}
                        {mas > 0 && <span className={styles.mas} style={{ left: STACK * 34 }}>+{mas}</span>}
                    </div>
                    <div className={styles.pie}>
                        <span className={styles.nombres}>
                            {conRelleno.ejemplo && <span className={styles.ejemplo}>{t('side_events.att_example')}</span>}
                            {unidades.map((u) => u.etiqueta).filter(Boolean).join(', ')}
                        </span>
                        <span className={styles.verTodos}>
                            {t('side_events.att_see_all')}
                            <ChevronDown size={16} strokeWidth={2.4} />
                        </span>
                    </div>
                </>
            ) : (
                <span className={styles.vacio}>{t('side_events.att_empty')}</span>
            )}
            {chat && (
                <div className={styles.chat}>
                    <span className={styles.chatIcono}><MessageCircle size={18} /></span>
                    <span className={styles.chatCol}>
                        <span className={styles.chatTitulo}>
                            <span className={styles.chatTituloTexto}>{t('side_events.chat_row_title')}</span>
                        </span>
                        <span className={styles.chatPrevia}>
                            {ultimo ? <><b>{primerNombre(ultimo.autor)}:</b> {ultimo.text}</> : t('side_events.chat_row_empty')}
                        </span>
                    </span>
                    <ChevronRight size={18} strokeWidth={2.2} />
                </div>
            )}
        </div>
    )
}
