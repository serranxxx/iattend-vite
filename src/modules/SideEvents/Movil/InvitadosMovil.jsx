import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Dropdown } from 'antd'
import { CornerDownRight, MoreHorizontal, Plus, Search, X } from 'lucide-react'
import s from './InvitadosMovil.module.css'

/*
  Pestaña Invitados del editor del celular (EditorMovil): una hoja blanca con
  "Invitados N", los créditos del Pop, "•••" (descargar la lista, recargar),
  el buscador, los filtros por estado en chips con su cuenta y la lista: cada
  titular con su inicial, "+N acompañante(s) · código" y su estado; sus
  acompañantes debajo, sangrados ("con …"). Tocar a alguien abre su edición
  (el mismo cajón de escritorio). "+ Agregar" flota abajo a la derecha.
  `accion(g)` (opcional): en lugar del estado, lo que va a la derecha de la
  fila (SideEvents: Enviar / marcar a los que están por invitar); va fuera del
  botón de la fila para no anidar botones.
*/

const ESTADOS = ['confirmado', 'esperando', 'creado', 'rechazado']
const CHIP = { confirmado: 'chip_confirmados', esperando: 'chip_esperando', creado: 'chip_por_invitar', rechazado: 'chip_rechazados' }

const inicial = (nombre) => String(nombre ?? '').trim().charAt(0).toUpperCase() || '?'

// `buzon`: botón del buzón de WhatsApp del Pop (BotonBuzonPopMovil), junto a los créditos.
export const InvitadosMovil = ({ invitados = [], creditos = null, buzon = null, onAgregar, onImportar, onImportarEvento, onEditar, onDescargar, onRefrescar, refrescando = false, accion = null }) => {
    const { t } = useTranslation()
    const [busqueda, setBusqueda] = useState('')
    const [filtro, setFiltro] = useState('todos')

    const titularDe = useMemo(() => new Map(invitados.map((g) => [String(g.id), g])), [invitados])
    const esAcompanante = (g) => g.companion_id != null && titularDe.has(String(g.companion_id))
    const acompanantesDe = (g) => invitados.filter((x) => x.companion_id != null && String(x.companion_id) === String(g.id))

    const cuentas = useMemo(() => {
        const c = { todos: invitados.length }
        ESTADOS.forEach((e) => { c[e] = invitados.filter((g) => g.state === e).length })
        return c
    }, [invitados])

    // Se ven los que pasan el filtro y la búsqueda; un acompañante que pasa
    // trae a su titular (para saber de quién es).
    const q = busqueda.trim().toLowerCase()
    const pasa = (g) => (filtro === 'todos' || g.state === filtro)
        && (!q || String(g.name ?? '').toLowerCase().includes(q) || String(g.phone_number ?? '').includes(q))
    const filas = []
    invitados.filter((g) => !esAcompanante(g)).forEach((g) => {
        const suyos = acompanantesDe(g)
        const visibles = suyos.filter(pasa)
        if (!pasa(g) && !visibles.length) return
        filas.push({ g, suyos })
        visibles.forEach((c) => filas.push({ g: c, titular: g }))
    })

    const etiqueta = (estado) => t(`guests.state_${estado}`, { defaultValue: estado ?? '' })
    const menu = {
        items: [
            ...(onImportar ? [{ key: 'importar', label: t('guests_import.mobile_import'), onClick: onImportar }] : []),
            ...(onImportarEvento ? [{ key: 'importar-evento', label: t('guests_import.mobile_import_event'), onClick: onImportarEvento }] : []),
            { key: 'descargar', label: t('side_events.mobile_guests_download'), onClick: onDescargar },
            { key: 'recargar', label: t(refrescando ? 'side_events.mobile_guests_refreshing' : 'guests.refresh'), onClick: onRefrescar, disabled: refrescando },
        ],
    }

    return (
        <div className={s.hoja}>
            <div className={s.cabeza}>
                <span className={s.titulo}>
                    {t('side_events.guests_title')}
                    <span className={s.cuenta}>{cuentas.todos}</span>
                </span>
                <span className={s.acciones}>
                    {buzon}
                    {creditos}
                    <Dropdown menu={menu} trigger={['click']} placement="bottomRight">
                        <button type="button" className={s.mas} aria-label={t('side_events.mobile_guests_more')}>
                            <MoreHorizontal size={20} />
                        </button>
                    </Dropdown>
                </span>
            </div>

            <label className={s.buscador}>
                <Search size={18} />
                <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder={t('side_events.mobile_guests_search')} />
                {busqueda && (
                    <button type="button" className={s.limpiar} onClick={() => setBusqueda('')} aria-label={t('side_events.mobile_guests_clear')}>
                        <X size={15} />
                    </button>
                )}
            </label>

            <div className={s.chips} role="tablist">
                {['todos', ...ESTADOS].map((e) => (
                    <button key={e} type="button" role="tab" aria-selected={filtro === e} className={s.chip} data-on={filtro === e || undefined} data-estado={e} onClick={() => setFiltro(e)}>
                        {e !== 'todos' && <span className={s.punto} aria-hidden />}
                        {t(`side_events.mobile_${CHIP[e] ?? 'chip_todos'}`)}
                        <span className={s.chipCuenta}>{cuentas[e]}</span>
                    </button>
                ))}
            </div>

            <ul className={s.lista}>
                {filas.length === 0 && <li className={s.vacio}>{t('side_events.mobile_guests_empty')}</li>}
                {filas.map(({ g, suyos, titular }) => {
                    const propia = !titular ? accion?.(g) : null
                    return (
                    <li key={g.id} className={propia ? s.conAccion : undefined}>
                        <button type="button" className={s.fila} data-acompanante={titular ? true : undefined} onClick={() => onEditar?.(titular ?? g)}>
                            {titular && <CornerDownRight size={16} className={s.flecha} aria-hidden />}
                            <span className={s.avatar} aria-hidden>{inicial(g.name)}</span>
                            <span className={s.textos}>
                                <span className={s.nombre}>{g.name || t('side_events.mobile_guests_no_name')}</span>
                                <span className={s.sub}>
                                    {titular
                                        ? t('side_events.mobile_guests_with', { name: String(titular.name ?? '').split(' ')[0] })
                                        : [suyos?.length ? t('side_events.mobile_guests_companions', { count: suyos.length }) : null, g.password].filter(Boolean).join(' · ')}
                                </span>
                            </span>
                            {!propia && (
                                <span className={s.estado} data-estado={g.state}>
                                    <span className={s.punto} aria-hidden />
                                    {etiqueta(g.state)}
                                </span>
                            )}
                        </button>
                        {propia && <span className={s.accion}>{propia}</span>}
                    </li>
                    )
                })}
            </ul>

            <button type="button" className={s.agregar} onClick={onAgregar}>
                <Plus size={20} strokeWidth={2.2} />
                {t('side_events.btn_add')}
            </button>
        </div>
    )
}
