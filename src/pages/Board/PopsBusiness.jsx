import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Plus } from 'lucide-react'
import { useConfirmados } from './popsDatos'
import { PopsHero } from './PopsHero'
import styles from './PopsBusiness.module.css'

/**
 * /invitations › Pops con el estilo Business (handoff "Cambia tu estilo" +
 * prototipo "Pops Business Dashboard"): hero azul eléctrico con cuadrícula,
 * wordmark "POPS" + "FOR BUSINESS", titulares en mayúsculas, y la lista sobre
 * un panel blanco que se monta encima del hero. Los Pops llevan iniciales en
 * vez de emoji. Mismas props que PopsSection; `movil` = versión del celular.
 */

// Iconos de fila y chips de "faltan", turnándose (como en el prototipo).
const ICONOS = [
    { fondo: 'var(--biz-azul)', tinta: '#FFF' },
    { fondo: 'var(--biz-lima)', tinta: 'var(--biz-navy)' },
    { fondo: 'var(--biz-navy)', tinta: '#FFF' },
]
const CHIPS = [
    { fondo: 'var(--biz-azul)', tinta: '#FFF' },
    { fondo: 'var(--biz-lima)', tinta: 'var(--biz-navy)' },
    { fondo: 'var(--biz-linea)', tinta: 'var(--biz-navy)' },
]

/**
 * Iniciales del Pop: la primera letra de las dos primeras palabras; con una
 * sola palabra y un número, la letra y los dos últimos dígitos
 * ("Kick-off Comercial 2027" → KC, "Navidad 2026" → N26).
 */
const inicialesDePop = (nombre = '') => {
    const palabras = nombre.split(/\s+/).filter(Boolean)
    const letras = palabras.filter(p => /\p{L}/u.test(p)).map(p => p.match(/\p{L}/u)[0].toUpperCase())
    const numero = palabras.find(p => /^\d+$/.test(p))
    if (letras.length >= 2) return letras.slice(0, 2).join('')
    if (letras.length === 1) return letras[0] + (numero ? numero.slice(-2) : '')
    return numero ? numero.slice(-3) : '·'
}

export const PopsBusiness = ({ movil = false, greeting, items, gratisPop = 0, puedeCrear, onCrear, onComprarPop, onGratisPop, onConoce, onAbrir, switchTema }) => {
    const { t, i18n } = useTranslation()
    const hoy = dayjs().startOf('day')

    const filas = items.map((item) => {
        const pop = item._pop
        const fecha = item.event_date ? dayjs(item.event_date) : null
        const dias = fecha ? fecha.startOf('day').diff(hoy, 'day') : null
        const nombre = item.name || pop?.name || t('pops_section.untitled')
        return { item, popId: pop?.id, fecha, dias, nombre, iniciales: inicialesDePop(nombre) }
    })
    const activos = filas
        .filter(f => f.dias === null || f.dias >= 0)
        .sort((a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity))
    const pasados = filas
        .filter(f => f.dias !== null && f.dias < 0)
        .sort((a, b) => b.dias - a.dias)
    const sinPops = items.length === 0

    const idsActivos = activos.map(f => f.popId).filter(Boolean)
    const confirmados = useConfirmados(idsActivos)

    const fechaCorta = (fecha) => fecha
        .toDate()
        .toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })
        .replace('.', '')
    const faltan = (dias, corto) => (dias === 0
        ? t('pops_section.today')
        : dias === 1 ? t('pops_section.tomorrow')
            : t(corto ? 'pops_section.days' : 'pops_section.in_days', { count: dias }))

    const estadoDe = (f, pasado) => {
        const c = confirmados[f.popId]
        if (pasado) return t('pops_section.status_past')
        return c?.total
            ? t('pops_section.biz_status', { si: c.si, total: c.total })
            : t('pops_section.status_active')
    }

    const fila = (f, i, pasado = false) => {
        const icono = ICONOS[i % ICONOS.length]
        const chip = CHIPS[i % CHIPS.length]
        const c = confirmados[f.popId]
        if (movil) {
            return (
                <button key={f.item.id} type='button' className={`${styles.mFila} ${pasado ? styles.pasada : ''}`} onClick={() => onAbrir(f.item)}>
                    <span className={styles.mIcono} style={{ background: icono.fondo, color: icono.tinta }}>{f.iniciales}</span>
                    <span className={styles.filaTexto}>
                        <span className={styles.mNombre}>{f.nombre}</span>
                        <span className={styles.mSub}>
                            {f.fecha ? fechaCorta(f.fecha) : t('pops_section.no_date')}
                            {pasado ? ` · ${t('pops_section.status_past')}` : c?.total ? ` · ${c.si}/${c.total}` : ''}
                        </span>
                    </span>
                    {!pasado && f.dias !== null && (
                        <span className={styles.mChip} style={{ background: chip.fondo, color: chip.tinta }}>{faltan(f.dias, true)}</span>
                    )}
                </button>
            )
        }
        return (
            <button key={f.item.id} type='button' className={`${styles.fila} ${pasado ? styles.pasada : ''}`} onClick={() => onAbrir(f.item)}>
                <span className={styles.icono} style={{ background: icono.fondo, color: icono.tinta }}>{f.iniciales}</span>
                <span className={styles.filaTexto}>
                    <span className={styles.nombre}>{f.nombre}</span>
                    <span className={styles.estado}>
                        <span className={`${styles.punto} ${pasado ? styles.puntoPasado : ''}`} />
                        {estadoDe(f, pasado)}
                    </span>
                </span>
                <span className={styles.fecha}>{f.fecha ? fechaCorta(f.fecha) : t('pops_section.no_date')}</span>
                <span>
                    {!pasado && f.dias !== null && (
                        <span className={styles.chip} style={{ background: chip.fondo, color: chip.tinta }}>{faltan(f.dias)}</span>
                    )}
                </span>
                <ArrowRight size={18} className={styles.flecha} />
            </button>
        )
    }

    const aviso = gratisPop > 0 && (
        movil ? (
            <button type='button' className={styles.mAviso} onClick={onGratisPop}>
                <span className={styles.mAvisoNumero}>{gratisPop}</span>
                <span className={styles.avisoTexto}>
                    <strong>{t(sinPops ? 'pops_section.free_have' : 'pops_section.free_title', { count: gratisPop })}</strong>
                    <span>{t(sinPops ? 'pops_section.free_first' : 'pops_section.free_text_short')}</span>
                </span>
                <span className={styles.mAvisoFlecha} aria-hidden>→</span>
            </button>
        ) : (
            <div className={styles.aviso}>
                <span className={styles.avisoNumero}>{gratisPop}</span>
                <span className={styles.avisoTexto}>
                    <strong>{t('pops_section.free_title', { count: gratisPop })}</strong>
                    <span>{t('pops_section.free_text')}</span>
                </span>
                <button type='button' className={styles.avisoBoton} onClick={onGratisPop}>{t('pops_section.free_cta')} →</button>
            </div>
        )
    )

    // Sin Pops: los tres pasos, en sobrio.
    const primero = (
        <div className={styles.primero}>
            <strong className={styles.primeroTitulo}>{t('pops_section.first_title')}</strong>
            <p className={styles.primeroTexto}>{t('pops_section.first_text')}</p>
            <ol className={styles.pasos}>
                {[1, 2, 3].map(n => (
                    <li key={n}><span className={styles.pasoNumero}>{n}</span>{t(`pops_section.first_step_${n}`)}</li>
                ))}
            </ol>
            {puedeCrear && (
                <button type='button' className={styles.botonAzul} onClick={onCrear}>
                    <span className={styles.mas}><Plus size={18} strokeWidth={3} /></span>{t('pops_section.send')}
                </button>
            )}
        </div>
    )

    const lista = (
        <>
            {sinPops ? primero : (
                <div className={styles.filas}>
                    {!movil && (
                        <div className={styles.columnas} aria-hidden>
                            <span /><span>{t('pops_section.biz_col_event')}</span><span>{t('pops_section.biz_col_date')}</span><span>{t('pops_section.biz_col_left')}</span><span />
                        </div>
                    )}
                    <div className={styles.cuerpo}>
                        {activos.length > 0
                            ? activos.map((f, i) => fila(f, i))
                            : <p className={styles.vacio}>{t('pops_section.empty')}</p>}
                    </div>
                </div>
            )}
            {pasados.length > 0 && (
                <div className={styles.filas}>
                    <span className={styles.pasadosTitulo}>{t('pops_section.past_title')}</span>
                    <div className={styles.cuerpo}>{pasados.map((f, i) => fila(f, i, true))}</div>
                </div>
            )}
        </>
    )

    const titulo = sinPops ? t('pops_section.empty_title') : t('pops_section.active_title')

    return (
        <div className={`${styles.seccion} ${movil ? styles.movil : ''}`}>
            {switchTema}
            {/* El hero común de los tres estilos (PopsHero, handoff §11), también en el celular. */}
            <PopsHero tema='business' movil={movil} greeting={greeting} puedeCrear={puedeCrear} onCrear={onCrear} onConoce={onConoce} />

            <section className={styles.panel}>
                <div className={styles.cabeza}>
                    <div className={styles.titulos}>
                        <h2 className={styles.titulo}>{titulo.split(' ')[0]} <span className={styles.azul}>{titulo.split(' ').slice(1).join(' ')}</span></h2>
                        <span className={styles.sub}>{sinPops ? t('pops_section.empty_sub') : t('pops_section.active_count', { count: activos.length })}</span>
                    </div>
                    {onComprarPop && !(movil && sinPops) && (
                        <button type='button' className={movil ? styles.mComprar : styles.botonAzul} onClick={onComprarPop}>
                            <span className={styles.mas}><Plus size={movil ? 15 : 18} strokeWidth={3} /></span>{movil ? t('pops_section.buy_short') : t('pops_section.buy')}
                        </button>
                    )}
                </div>
                {aviso}
                {lista}
            </section>
        </div>
    )
}

export default PopsBusiness
