import { Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import s from './Presencia.module.css'

// Quién más tiene abierto el Pop (barra del editor): un círculo por persona
// con su emoji y su color (los de su cursor; sin nombres). `compacto` = celular.

const MAX = 4


export const AvataresPresencia = ({ personas, compacto = false }) => {
    const { t } = useTranslation()
    if (!personas?.length) return null
    const max = compacto ? 3 : MAX
    const visibles = personas.slice(0, max)
    const resto = personas.slice(max)
    return (
        <div className={s.avatares} data-compacto={compacto || undefined} aria-label={t('side_events.presence_label', { count: personas.length })}>
            {visibles.map((p) => (
                <Tooltip key={p.clave} title={t('side_events.presence_here')} placement="bottom">
                    <span className={s.avatar} style={{ '--color': p.color }}>{p.emoji ?? '🙂'}</span>
                </Tooltip>
            ))}
            {resto.length > 0 && (
                <Tooltip title={resto.map((p) => p.emoji ?? '🙂').join(' ')} placement="bottom">
                    <span className={`${s.avatar} ${s.mas}`}>+{resto.length}</span>
                </Tooltip>
            )}
        </div>
    )
}
