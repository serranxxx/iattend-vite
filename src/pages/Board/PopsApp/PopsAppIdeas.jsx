import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bookmark, BookmarkCheck, Plus } from 'lucide-react'
import s from './PopsAppIdeas.module.css'

/*
  Ideas (handoff "App de Pops" §6): muro tipo Pinterest (columnas CSS, alturas
  de 200 a 380 px) con chips de categoría. No son plantillas (pendiente §0.4):
  "Usar esta idea" abre Make a Pop. Todavía no hay fotos finales: cada pin va
  con su color y su emoji. "Guardar" se recuerda en este navegador
  (localStorage `iattend_pops_ideas_guardadas`).
  Celular (`movil`, §10): chips con scroll de lado, dos columnas con las
  alturas al 62 % y un "+" lima de 36 px en cada pin para "Usar esta idea".
*/

// [clave, color, alto, etiqueta, categoría, emoji]
const PINES = [
    ['posada_ofi', '#CDF22B', 320, 'tendencia', 'posadas', '🪅'],
    ['intercambio', '#FFB3C9', 240, 'tendencia', 'posadas', '🎁'],
    ['excel', '#9FD8F5', 200, 'novedad', 'novedades', '📋'],
    ['cumple_sorpresa', '#FFE14D', 380, '', 'cumples', '🎂'],
    ['cena_fin', '#F3F2EE', 280, 'tendencia', 'cenas', '🕯️'],
    ['wallet', '#0B1F3A', 220, 'novedad', 'novedades', '🎟️'],
    ['brunch', '#FFB3C9', 300, '', 'cenas', '🥞'],
    ['juegos', '#9FD8F5', 360, '', 'reuniones', '🎲'],
    ['baby_shower', '#C8F560', 260, '', 'cumples', '🍼'],
    ['junta', '#E3E6F0', 210, '', 'reuniones', '📊'],
    ['carne_asada', '#FF4D3D', 340, '', 'reuniones', '🥩'],
    ['graduacion', '#FFE14D', 250, '', 'cumples', '🎓'],
]
const CATEGORIAS = ['todo', 'tendencias', 'novedades', 'posadas', 'cumples', 'cenas', 'reuniones']
const OSCUROS = ['#0B1F3A', '#FF4D3D']
const CLAVE = 'iattend_pops_ideas_guardadas'

const leerGuardadas = () => {
    try { return new Set(JSON.parse(localStorage.getItem(CLAVE) || '[]')) } catch { return new Set() }
}

export const PopsAppIdeas = ({ puedeCrear, onUsarIdea, movil = false }) => {
    const { t } = useTranslation()
    const [cat, setCat] = useState('todo')
    const [guardadas, setGuardadas] = useState(leerGuardadas)

    const alternar = (clave) => setGuardadas(prev => {
        const nuevas = new Set(prev)
        if (nuevas.has(clave)) nuevas.delete(clave)
        else nuevas.add(clave)
        try { localStorage.setItem(CLAVE, JSON.stringify([...nuevas])) } catch { /* sin storage */ }
        return nuevas
    })

    const pines = PINES.filter(([, , , tag, c]) => cat === 'todo' || (cat === 'tendencias' ? tag === 'tendencia' : c === cat))

    return (
        <>
            <div className={s.titulo} data-movil={movil || undefined}>
                <h1>{t('pops_app.ideas_title')}</h1>
                <span>{t('pops_app.ideas_subtitle')}</span>
            </div>
            <div className={s.chips} data-movil={movil || undefined} role='tablist' aria-label={t('pops_app.ideas_title')}>
                {CATEGORIAS.map(c => (
                    <button key={c} type='button' role='tab' aria-selected={cat === c} className={s.chip} data-activa={cat === c || undefined} onClick={() => setCat(c)}>
                        {t(`pops_app.ideas_cat_${c}`)}
                    </button>
                ))}
            </div>
            <div className={s.muro} data-movil={movil || undefined}>
                {pines.map(([clave, color, alto, tag, , emoji]) => {
                    const guardada = guardadas.has(clave)
                    return (
                        <div key={clave} className={s.pin}>
                            <div className={s.foto} style={{ height: movil ? Math.round(alto * 0.62) : alto, background: color }} data-oscuro={OSCUROS.includes(color) || undefined}>
                                <span className={s.emoji} aria-hidden>{emoji}</span>
                                {tag && <span className={s.tag}>{t(tag === 'tendencia' ? 'pops_app.ideas_tag_trend' : 'pops_app.ideas_tag_new')}</span>}
                                {!movil && <button type='button' className={s.guardar} data-guardada={guardada || undefined} aria-pressed={guardada} onClick={() => alternar(clave)}>
                                    {guardada ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                                    {t(guardada ? 'pops_app.ideas_saved' : 'pops_app.ideas_save')}
                                </button>}
                                {puedeCrear && !movil && (
                                    <button type='button' className={s.usar} onClick={() => onUsarIdea?.(clave)}>{t('pops_app.ideas_use')}</button>
                                )}
                                {puedeCrear && movil && (
                                    <button type='button' className={s.usarMovil} onClick={() => onUsarIdea?.(clave)} aria-label={t('pops_app.ideas_use')}>
                                        <Plus size={20} strokeWidth={2.6} />
                                    </button>
                                )}
                            </div>
                            <span className={s.textos}>
                                <b>{t(`pops_app.idea_${clave}`)}</b>
                                {!movil && <small>{t(`pops_app.idea_${clave}_desc`)}</small>}
                            </span>
                        </div>
                    )
                })}
            </div>
        </>
    )
}

export default PopsAppIdeas
