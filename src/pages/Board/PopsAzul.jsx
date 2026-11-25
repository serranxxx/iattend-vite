import { useState } from 'react'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { TableroAzul } from '../../components/TableroAzul/TableroAzul'
import tab from '../../components/TableroAzul/TableroAzul.module.css'
import { colorDePop } from '../../helpers/invitation/popEvents'
import { inicialesDePop, portadaDePop, useConfirmados } from './popsDatos'
import ojos from '../../assets/pops-stickers/craft/ojos.svg'
import corazon from '../../assets/pops-stickers/craft/corazon.svg'
import styles from './PopsAzul.module.css'
import { MiniaturaPop } from './MiniaturaPop'

/**
 * Pops › Clientes y Mis Pops en escritorio con el estilo "Collage azul · lima"
 * (handoff "App Pops", 6a / 6b): un solo contenedor blanco con el encabezado
 * de tablero (borde de abajo rasgado en zigzag, etiqueta de papel con el
 * título y "+ Comprar Pop" lima) y la tabla debajo.
 *   - Clientes (`conCorreo`): Evento · Cliente · Fecha · Faltan.
 *   - Mis Pops: Evento · Fecha · Confirmados · Faltan, con filtros Todos /
 *     Activos / Borradores. Borrador = un Pop sin invitados todavía.
 * "Faltan": azul con ≤ 9 días, lima con ≤ 14, gris después. Los pasados van
 * aparte al 55 %. Mismas props que PopsSection (solo la lista).
 * `movil` (handoff 4b): banda con la etiqueta, "N Pops activos" a mano y
 * "Comprar" lima; cada fila es nombre + fecha, correo y estado + "faltan".
 */

// Sin color de tema (o uno casi blanco), las miniaturas se turnan estos.
const PALETA = ['#FF4D3D', '#CDF22B', '#FFB3C9', '#2457A4', '#9FD8F5', '#2EBE88']

const luminancia = (color) => {
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color ?? '')?.[1]
    if (!hex) return null
    const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex
    const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

const colorMini = (propio, i) => {
    const lum = luminancia(propio)
    const fondo = propio && lum !== null && lum < 0.85 ? propio : PALETA[i % PALETA.length]
    const l = luminancia(fondo) ?? 0
    return { fondo, tinta: l > 0.4 ? '#0B1F3A' : '#FFFFFF' }
}

const chipFaltan = (dias) => (dias <= 9
    ? { background: '#2457A4', color: '#FFFFFF' }
    : dias <= 14 ? { background: '#CDF22B', color: '#0B1F3A' } : { background: '#E8EBF3', color: '#0B1F3A' })

const FILTROS = ['todos', 'activos', 'borradores']

export const PopsAzul = ({ movil = false, items, onComprarPop, onAbrir, pie, titulo, vacioLista, conCorreo = false }) => {
    const { t, i18n } = useTranslation()
    const [filtro, setFiltro] = useState('todos')
    const hoy = dayjs().startOf('day')

    const filas = items.map((item, i) => {
        const pop = item._pop
        const fecha = item.event_date ? dayjs(item.event_date) : null
        const dias = fecha ? fecha.startOf('day').diff(hoy, 'day') : null
        const nombre = (item.name || pop?.name || '').trim() || t('pops_section.untitled')
        return {
            item,
            popId: pop?.id,
            fecha,
            dias,
            nombre,
            iniciales: inicialesDePop(nombre),
            portada: portadaDePop(pop),
            color: colorMini(colorDePop(pop), i),
            correo: item.user_email || pop?.user_email || null,
        }
    })
    const confirmados = useConfirmados(filas.map(f => f.popId).filter(Boolean))
    // Sin invitados todavía = borrador (mientras cargan los conteos, activo).
    const esBorrador = (f) => confirmados[f.popId]?.total === 0

    const activos = filas
        .filter(f => f.dias === null || f.dias >= 0)
        .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))
    const pasados = filas
        .filter(f => f.dias !== null && f.dias < 0)
        .sort((a, b) => b.dias - a.dias)
    const visibles = conCorreo || filtro === 'todos'
        ? activos
        : activos.filter(f => (filtro === 'borradores' ? esBorrador(f) : !esBorrador(f)))

    const fechaCorta = (fecha) => fecha
        .toDate()
        .toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
        .replace('.', '')
    const faltan = (dias) => (dias === 0
        ? t('pops_section.today')
        : dias === 1 ? t('pops_section.tomorrow') : t('pops_section.in_days', { count: dias }))

    const conteo = (f, pasado) => {
        const c = confirmados[f.popId]
        if (!c) return ''
        if (c.total === 0) return null
        return pasado
            ? t('pops_azul.attended', { count: c.si })
            : t('pops_azul.confirmed', { si: c.si, total: c.total })
    }

    const estadoDe = (f, pasado) => {
        if (pasado) return { texto: t('pops_section.status_past'), apagado: true }
        if (esBorrador(f)) return { texto: t('pops_azul.status_draft'), apagado: true }
        const c = confirmados[f.popId]
        // Clientes: "Activa · 76 de 77 confirmados".
        if (conCorreo && c?.total) return { texto: t('pops_section.biz_status', { si: c.si, total: c.total }), apagado: false }
        return { texto: t('pops_section.status_active'), apagado: false }
    }

    const chip = (f, pasado) => (!pasado && f.dias !== null
        ? <span className={styles.faltan} style={chipFaltan(f.dias)}>{faltan(f.dias)}</span>
        : <span className={styles.sinDato}>—</span>)

    // Celular: en el estado va también el conteo (Mis Pops no tiene columna).
    const filaMovil = (f, pasado) => {
        const estado = estadoDe(f, pasado)
        const confirmadosTexto = !conCorreo && !esBorrador(f) ? conteo(f, pasado) : null
        return (
            <button key={f.item.id} type='button' className={`${styles.filaMovil} ${pasado ? styles.pasada : ''}`} onClick={() => onAbrir(f.item)}>
                <span className={styles.mini} style={{ background: f.color.fondo, color: f.color.tinta }}>
                    {f.portada ? <MiniaturaPop src={f.portada} /> : f.iniciales}
                </span>
                <span className={styles.mTextos}>
                    <span className={styles.mLinea}>
                        <span className={styles.nombre}>{f.nombre}</span>
                        <span className={styles.fecha}>{f.fecha ? fechaCorta(f.fecha) : t('pops_section.no_date')}</span>
                    </span>
                    {conCorreo && <span className={styles.correo}>{f.correo || t('invitations.pending_send_badge')}</span>}
                    <span className={styles.mLinea}>
                        <span className={styles.estado}>
                            <span className={styles.punto} data-apagado={estado.apagado || undefined} />
                            <span className={styles.estadoTexto}>{confirmadosTexto ? `${estado.texto} · ${confirmadosTexto}` : estado.texto}</span>
                        </span>
                        {chip(f, pasado)}
                    </span>
                </span>
            </button>
        )
    }

    const fila = (f, pasado = false) => {
        if (movil) return filaMovil(f, pasado)
        const estado = estadoDe(f, pasado)
        const confirmadosTexto = conteo(f, pasado)
        return (
            <button key={f.item.id} type='button' className={`${styles.fila} ${pasado ? styles.pasada : ''}`} onClick={() => onAbrir(f.item)}>
                <span className={styles.evento}>
                    <span className={styles.mini} style={{ background: f.color.fondo, color: f.color.tinta }}>
                        {f.portada ? <MiniaturaPop src={f.portada} /> : f.iniciales}
                    </span>
                    <span className={styles.eventoTextos}>
                        <span className={styles.nombre}>{f.nombre}</span>
                        <span className={styles.estado}>
                            <span className={styles.punto} data-apagado={estado.apagado || undefined} />
                            {estado.texto}
                        </span>
                    </span>
                </span>
                {conCorreo && <span className={styles.correo}>{f.correo || t('invitations.pending_send_badge')}</span>}
                <span className={styles.fecha}>{f.fecha ? fechaCorta(f.fecha) : t('pops_section.no_date')}</span>
                {!conCorreo && (
                    <span className={styles.confirmados}>{confirmadosTexto ?? (esBorrador(f) && !pasado ? t('pops_azul.status_draft') : '—')}</span>
                )}
                <span>{chip(f, pasado)}</span>
                <span className={styles.flecha}><ArrowRight size={20} /></span>
            </button>
        )
    }

    const sinPops = items.length === 0
    const tituloBanda = conCorreo ? t('pops_azul.title_clients') : (titulo ?? t('invitations.space_pops_own_title'))

    return (
        <div className={`${styles.seccion} ${conCorreo ? styles.clientes : styles.mis} ${movil ? styles.movil : ''}`}>
            <div className={styles.contenedor}>
                <div className={styles.banda}>
                    <span aria-hidden className={styles.bandaBorde} />
                    <TableroAzul lineas='banda' className={styles.tablero}>
                        <h2 className={`${tab.papel} ${styles.etiqueta}`}>{tituloBanda}</h2>
                        {conCorreo
                            ? <img src={ojos} alt='' aria-hidden className={`${tab.sticker} ${styles.stickerOjos}`} />
                            : <img src={corazon} alt='' aria-hidden className={`${tab.sticker} ${styles.stickerCorazon}`} />}
                        <span aria-hidden className={`${tab.estrella4} ${styles.estrellaA}`} />
                        <span aria-hidden className={`${tab.estrellaRayas} ${styles.estrellaB}`} />
                        <span aria-hidden className={`${tab.estrella} ${styles.estrellaC}`} />
                        {movil && !sinPops && (
                            <span className={styles.mConteo}>{t('invitations.space_pops_count', { count: activos.length })}</span>
                        )}
                        {onComprarPop && (
                            <button type='button' className={`${tab.botonLima} ${tab.papel} ${styles.comprar}`} onClick={onComprarPop}>
                                <span className={styles.mas} aria-hidden>+</span>{t(movil ? 'pops_section.buy_short' : 'pops_section.buy')}
                            </button>
                        )}
                    </TableroAzul>
                </div>

                <div className={styles.cuerpo}>
                    {!conCorreo && !sinPops && (
                        <div className={styles.filtros} role='group' aria-label={t('pops_azul.filter_label')}>
                            {FILTROS.map(id => (
                                <button
                                    key={id}
                                    type='button'
                                    className={styles.filtro}
                                    data-activo={filtro === id || undefined}
                                    aria-pressed={filtro === id}
                                    onClick={() => setFiltro(id)}
                                >
                                    {t(`pops_azul.filter_${id}`)}
                                </button>
                            ))}
                        </div>
                    )}

                    {sinPops ? <p className={styles.vacio}>{vacioLista}</p> : (
                        <>
                            {!movil && <div className={`${styles.fila} ${styles.columnas}`} aria-hidden>
                                <span className={styles.colEvento}>{t('pops_section.biz_col_event')}</span>
                                {conCorreo && <span>{t('pops_section.col_client')}</span>}
                                <span>{t('pops_section.biz_col_date')}</span>
                                {!conCorreo && <span>{t('pops_azul.col_confirmed')}</span>}
                                <span>{t('pops_section.biz_col_left')}</span>
                                <span />
                            </div>}
                            {visibles.length > 0
                                ? visibles.map(f => fila(f))
                                : <p className={styles.vacio}>{activos.length ? t('pops_azul.filter_empty') : t('pops_section.empty')}</p>}

                            {pasados.length > 0 && (
                                <>
                                    <div className={styles.pasadosTitulo}>
                                        <span>{t('pops_section.past_title')}</span>
                                        <span aria-hidden className={styles.linea} />
                                    </div>
                                    {pasados.map(f => fila(f, true))}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
            {pie}
        </div>
    )
}

export default PopsAzul
