import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import axios from 'axios'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { Modal, Tooltip, message } from 'antd'
import { Archive, ArchiveRestore, Copy, MoreHorizontal, Plus, Send, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { supabaseAuthHeaders } from '../../../lib/authHeaders'
import { colorDePop, emojiDePop } from '../../../helpers/invitation/popEvents'
import { InsigniaPlus } from '../../../modules/SideEvents/PlanPops/InsigniaPlus'
import { MiniaturaPop } from '../MiniaturaPop'
import { horaDePop, inicialesDePop, portadaDePop } from '../popsDatos'
import { PRECIO_PLUS } from './usePlanPops'
import ojos from '../../../assets/pops-stickers/craft/ojos.svg'
import s from './PopsAppMisPops.module.css'

/*
  Pops › Mis Pops en escritorio (handoff "App de Pops", §5: 1b, 1d, 2b).
  · Sin Pops (1b, variante clara): tarjeta con cuadrícula de puntos, el
    contorno punteado "tu primer Pop va aquí", notas a mano, atajos y
    "Make a Pop".
  · Con Pops: filtros Activos · Borradores · Archivo, fila de estadísticas y
    tabla POP · FECHA · ESTADO · CONFIRMADOS · NO VAN · VISTAS · RESPUESTA con
    "Abrir" y el menú ⋯ (Duplicar — Pops+, todavía no existe —, Archivar /
    Desarchivar y Borrar; uno abierto a la vez).
      archivo  = archivado (side_events.archived_at) o su fecha ya pasó.
      borrador = sin invitados.
      activo   = lo demás (con invitados y hoy o después, o sin fecha).
    Archivar y borrar van por el backend (router/sideEventArchivo.js) y se
    reflejan aquí mismo (el padre no recarga la lista).
  · Clientes (debajo, no para cuentas de cliente): con Pops+ la tabla de
    clientes (Pops agrupados por correo del cliente); en Free la tarjeta de
    venta con la vista previa bloqueada.
  · movil (handoff §10, 390 px): el mismo estado y las mismas acciones en
    una columna: filtros pill con scroll de lado, estadísticas 2 × 2, lista en
    una tarjeta (⋯ de 44 px abre el menú como hoja inferior), Clientes con
    lista / tarjeta navy de venta y el vacío en vertical. El padre pone el
    header, el scroll y la barra inferior.
  "No van" se cuenta aquí (side_events_guests con state 'rechazado'); las
  vistas del link todavía no se registran: "—".
*/

const API = import.meta.env.VITE_API_URL
// Personas por Pop en Free (trigger pops_limite_invitados, migración 2026-11-23c).
const PERSONAS_FREE = 30
const FILTROS = ['activos', 'borradores', 'archivo']
const PALETA = ['#FFB3C9', '#9FD8F5', '#FFE14D', '#C8F560', '#FF4D3D', '#2EBE88']
const ATAJOS = [
    { e: '🍝', k: 'quick_dinner', rot: -2 },
    { e: '🪅', k: 'quick_posada', rot: 1.5 },
    { e: '🥩', k: 'quick_bbq', rot: -1 },
    { e: '🎂', k: 'quick_birthday', rot: 2 },
]

/** "No van" de cada Pop: invitados con state 'rechazado'. */
const useNoVan = (ids) => {
    const [porPop, setPorPop] = useState({})
    const clave = ids.join(',')
    useEffect(() => {
        if (!ids.length) return undefined
        let vivo = true
        supabase
            .from('side_events_guests')
            .select('side_events_id')
            .in('side_events_id', ids)
            .eq('state', 'rechazado')
            .then(({ data, error }) => {
                if (!vivo || error || !data) return
                const cuenta = {}
                for (const g of data) cuenta[g.side_events_id] = (cuenta[g.side_events_id] ?? 0) + 1
                setPorPop(cuenta)
            })
        return () => { vivo = false }
    }, [clave])
    return porPop
}

const errorDe = (e) => e?.response?.data?.code

export const PopsAppMisPops = ({
    pops = [], clientes = [], cargando = false, confirmados = {}, plan = {}, aviso = null, esCliente = false,
    puedeCrear = true, onCrear, onEnviarPop, onEnviarACliente, onAbrir, onPasarPlus, movil = false,
}) => {
    const { t, i18n } = useTranslation()
    const [filtro, setFiltro] = useState('activos')
    const [menu, setMenu] = useState(null)
    const [archivados, setArchivados] = useState({})
    const [borrados, setBorrados] = useState(() => new Set())
    const menuRef = useRef(null)
    const hoy = dayjs().startOf('day')
    const lang = i18n.language?.startsWith('en') ? 'en-US' : 'es-MX'

    const visiblesPops = pops.filter(p => !borrados.has(p._pop?.id))
    const noVan = useNoVan([...visiblesPops, ...clientes].map(p => p._pop?.id).filter(Boolean))

    useEffect(() => {
        if (menu == null) return undefined
        const fuera = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(null) }
        const esc = (e) => { if (e.key === 'Escape') setMenu(null) }
        window.addEventListener('pointerdown', fuera)
        window.addEventListener('keydown', esc)
        return () => { window.removeEventListener('pointerdown', fuera); window.removeEventListener('keydown', esc) }
    }, [menu])

    const fechaTexto = (item) => {
        if (!item.event_date) return t('pops_app_mis.no_date')
        const dia = dayjs(item.event_date).toDate()
            .toLocaleDateString(lang, { weekday: 'short', day: 'numeric', month: 'short' })
            .replace(/\./g, '').replace(',', '')
        const hora = horaDePop(item._pop)
        return hora ? `${dia} · ${hora}` : dia
    }

    const filaDe = (item, i) => {
        const pop = item._pop ?? {}
        const id = pop.id
        const fecha = item.event_date ? dayjs(item.event_date).startOf('day') : null
        const dias = fecha ? fecha.diff(hoy, 'day') : null
        const archivado = id in archivados ? archivados[id] : Boolean(pop.archived_at)
        const c = confirmados[id]
        const total = c?.total
        const si = c?.si ?? 0
        const no = noVan[id] ?? 0
        const estado = archivado ? 'archivado'
            : dias !== null && dias < 0 ? 'pasado'
                : total === 0 ? 'borrador' : 'activo'
        const nombre = (item.name || pop.name || '').trim() || t('pops_app_mis.untitled')
        return {
            item, id, dias, archivado, estado, total, si, no, nombre,
            grupo: estado === 'archivado' || estado === 'pasado' ? 'archivo' : estado === 'borrador' ? 'borradores' : 'activos',
            emoji: emojiDePop(pop),
            portada: portadaDePop(pop),
            color: colorDePop(pop) || PALETA[i % PALETA.length],
            iniciales: inicialesDePop(nombre),
        }
    }

    const filas = visiblesPops.map(filaDe)
    const porGrupo = (g) => filas.filter(f => f.grupo === g)
    const porFecha = (a, b) => (a.dias ?? Infinity) - (b.dias ?? Infinity)
    const mostradas = porGrupo(filtro).sort(porFecha)

    // Clientes (Pops+): la misma lista que Mis Pops, con los Pops que gestiona
    // para sus clientes (y el cliente de cada uno debajo del nombre). El
    // filtro Activos / Borradores / Archivo aplica a las dos listas.
    const nombreCliente = (item) => {
        const correo = item.user_email || item._pop?.user_email || ''
        return correo
            ? correo.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\p{L}/gu, l => l.toUpperCase())
            : t('pops_app_mis.client_pending')
    }
    const filasCli = clientes
        .filter(p => !borrados.has(p._pop?.id))
        // Por enviar = Pop "enviar después", todavía sin cliente (sin user_id):
        // lleva el botón Enviar, que da de alta al cliente (PlannerSendDrawer).
        .map((item, i) => ({ ...filaDe(item, i + pops.length), cliente: nombreCliente(item), porEnviar: !(item.user_id || item._pop?.user_id) }))
    const mostradasCli = filasCli.filter(f => f.grupo === filtro).sort(porFecha)
    const vacioCli = filasCli.length === 0 ? t('pops_app_mis.clients_empty') : t(`pops_app_mis.empty_filter_${filtro}`)

    // Estadísticas (fila de pills): próximo Pop, personas sin responder y borradores.
    const activas = porGrupo('activos')
    const proximo = activas.filter(f => f.dias !== null).sort((a, b) => a.dias - b.dias)[0]
    const sinResponder = activas.reduce((sum, f) => sum + Math.max(0, (f.total ?? 0) - f.si - f.no), 0)
    const nBorradores = porGrupo('borradores').length
    const stats = [
        proximo
            ? {
                v: proximo.dias === 0 ? t('pops_app_mis.today') : t('pops_app_mis.days', { count: proximo.dias }),
                label: t(proximo.dias === 0 ? 'pops_app_mis.stat_next_today' : 'pops_app_mis.stat_next', { name: proximo.nombre }),
            }
            : { v: '—', label: t('pops_app_mis.stat_no_next') },
        { v: String(sinResponder), label: t('pops_app_mis.stat_pending', { count: sinResponder }) },
        { v: String(nBorradores), label: t('pops_app_mis.stat_drafts', { count: nBorradores }) },
    ]

    const archivar = async (f) => {
        setMenu(null)
        const archivado = !f.archivado
        try {
            await axios.post(`${API}/api/side-events/${f.id}/archivar`, { archivado }, { headers: await supabaseAuthHeaders() })
            setArchivados(prev => ({ ...prev, [f.id]: archivado }))
            message.success(t(archivado ? 'pops_app_mis.archived_ok' : 'pops_app_mis.unarchived_ok'))
        } catch (e) {
            message.error(t(errorDe(e) === 'SIN_MIGRACION' ? 'pops_app_mis.archive_unavailable' : 'pops_app_mis.archive_error'))
        }
    }

    const borrar = (f) => {
        setMenu(null)
        Modal.confirm({
            title: t('pops_app_mis.delete_title', { name: f.nombre }),
            content: t('pops_app_mis.delete_text'),
            okText: t('pops_app_mis.delete_ok'),
            cancelText: t('pops_app_mis.cancel'),
            okButtonProps: { danger: true },
            centered: true,
            onOk: async () => {
                try {
                    await axios.delete(`${API}/api/side-events/${f.id}`, { headers: await supabaseAuthHeaders() })
                    setBorrados(prev => new Set(prev).add(f.id))
                    message.success(t('pops_app_mis.deleted_ok'))
                } catch {
                    message.error(t('pops_app_mis.delete_error'))
                }
            },
        })
    }

    // Clientes: los Pops que hizo para otros, agrupados por correo del cliente.
    const filasClientes = useMemo(() => {
        const grupos = new Map()
        clientes.forEach((item, i) => {
            const correo = item.user_email || item._pop?.user_email || ''
            const llave = correo || '__sin_correo__'
            if (!grupos.has(llave)) grupos.set(llave, { correo, items: [] })
            grupos.get(llave).items.push({ item, i })
        })
        return [...grupos.values()].map(g => {
            const datos = g.items.map(({ item, i }) => filaDe(item, i))
            const ultimo = [...datos].sort((a, b) => {
                const fa = a.item.event_date ?? ''
                const fb = b.item.event_date ?? ''
                return fa === fb ? Number(b.id) - Number(a.id) : fb.localeCompare(fa)
            })[0]
            const nombre = g.correo
                ? g.correo.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\p{L}/gu, l => l.toUpperCase())
                : t('pops_app_mis.client_pending')
            const estado = !g.correo ? 'pending'
                : datos.some(d => d.estado === 'activo') ? 'active'
                    : datos.some(d => d.estado === 'borrador') ? 'draft' : 'past'
            const ultimoTexto = ultimo
                ? `${ultimo.nombre} · ${ultimo.estado === 'borrador' ? t('pops_app_mis.status_draft').toLowerCase() : fechaTexto(ultimo.item).split(' · ')[0]}`
                : t('pops_app_mis.client_no_pops')
            return { llave: g.correo || '__sin_correo__', correo: g.correo, nombre, iniciales: inicialesDePop(nombre), n: datos.length, ultimo, ultimoTexto, estado }
        })
    }, [clientes, confirmados, noVan, archivados, i18n.language])

    const estadoChip = (estado) => (
        <span className={s.estado} data-estado={estado}>{t(`pops_app_mis.status_${estado === 'archivado' ? 'archived' : estado === 'pasado' ? 'past' : estado === 'borrador' ? 'draft' : 'active'}`)}</span>
    )

    const menuDe = (f, clase = s.menu) => (
        <div className={clase} role='menu'>
            {plan.plus ? (
                <Tooltip title={t('pops_app_mis.duplicate_soon')} placement='left'>
                    <button type='button' role='menuitem' className={s.menuItem} aria-disabled>
                        <Copy size={16} /><span className={s.menuTexto}>{t('pops_app_mis.duplicate')}</span>
                    </button>
                </Tooltip>
            ) : (
                <button type='button' role='menuitem' className={s.menuItem} aria-disabled>
                    <Copy size={16} /><span className={s.menuTexto}>{t('pops_app_mis.duplicate')}</span><InsigniaPlus />
                </button>
            )}
            <button type='button' role='menuitem' className={s.menuItem} onClick={() => archivar(f)}>
                {f.archivado ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                <span className={s.menuTexto}>{t(f.archivado ? 'pops_app_mis.unarchive' : 'pops_app_mis.archive')}</span>
                <span className={s.nuevo}>{t('pops_app_mis.new')}</span>
            </button>
            <button type='button' role='menuitem' className={`${s.menuItem} ${s.peligro}`} onClick={() => borrar(f)}>
                <Trash2 size={16} /><span className={s.menuTexto}>{t('pops_app_mis.delete')}</span>
                <span className={s.nuevo}>{t('pops_app_mis.new')}</span>
            </button>
        </div>
    )

    const confirmadosTexto = (f) => {
        if (f.total == null) return '—'
        return plan.plus ? String(f.si) : t('pops_app_mis.of', { n: f.si, total: PERSONAS_FREE })
    }
    const respuesta = (f) => (f.total ? `${Math.round(((f.si + f.no) / f.total) * 100)}%` : '—')

    const titulo = (
        <div className={s.cabeza}>
            <div className={s.titulo}>
                <h1>{t('pops_app_mis.title')}</h1>
                <span className={s.cuenta}>{visiblesPops.length}</span>
            </div>
            {visiblesPops.length > 0 && (
                <div className={s.filtros} role='group' aria-label={t('pops_app_mis.filter_label')}>
                    {FILTROS.map(id => (
                        <button
                            key={id}
                            type='button'
                            className={s.filtro}
                            data-activo={filtro === id || undefined}
                            aria-pressed={filtro === id}
                            onClick={() => setFiltro(id)}
                        >
                            {t(`pops_app_mis.filter_${id}`)}
                            <span className={s.filtroN}>{porGrupo(id).length}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )

    const vacio = (
        <div className={s.vacio}>
            <span aria-hidden className={s.destello} />
            <span aria-hidden className={s.destellito} />
            <img src={ojos} alt='' aria-hidden className={s.ojos} />
            <div className={s.vacioIzq}>
                <div className={s.contorno}>
                    <span aria-hidden className={s.tijeras}>✂︎</span>
                    {puedeCrear && (
                        <button type='button' className={s.masGrande} onClick={onCrear} aria-label={t('pops_app_mis.make_a_pop')}>
                            <Plus size={52} strokeWidth={3} />
                        </button>
                    )}
                    <span className={s.contornoTexto}>{t('pops_app_mis.empty_slot_1')}<br />{t('pops_app_mis.empty_slot_2')}</span>
                </div>
                <span className={`${s.nota} ${s.nota1}`}>{t('pops_app_mis.note_confirmed')}</span>
                <Flecha className={s.flecha1} d='M5 5 C 40 10, 70 25, 85 42 M96 30 L85 42 L92 46' />
                <span className={`${s.nota} ${s.nota2}`}>{t('pops_app_mis.note_count')}</span>
                <Flecha className={s.flecha2} />
                <span className={`${s.nota} ${s.nota3}`}>{t('pops_app_mis.note_place')}</span>
                <Flecha className={s.flecha3} />
                <span className={`${s.nota} ${s.nota4}`}>{t('pops_app_mis.note_chat')}</span>
                <Flecha className={s.flecha4} />
            </div>
            <div className={s.vacioDer}>
                <span className={s.tagRosa}>{t('pops_app_mis.empty_tag')}</span>
                <span className={`${s.recorte} ${s.recorteNavy}`}>{t('pops_app_mis.empty_title_1')}</span>
                <span className={`${s.recorte} ${s.recorteLima}`}>{t('pops_app_mis.empty_title_2')}</span>
                <p className={s.vacioTexto}>{t('pops_app_mis.empty_text')}</p>
                {puedeCrear && (
                    <>
                        <div className={s.atajos}>
                            {ATAJOS.map(a => (
                                <button key={a.k} type='button' className={s.atajo} style={{ '--rot': `${a.rot}deg` }} onClick={onCrear}>
                                    {a.e} {t(`pops_app_mis.${a.k}`)}
                                </button>
                            ))}
                        </div>
                        <button type='button' className={s.ctaGrande} onClick={onCrear}>
                            <span className={s.ctaMas}><Plus size={26} strokeWidth={2.6} /></span>
                            {t('pops_app_mis.make_a_pop')}
                            {!plan.plus && <span className={s.gratis}>{t('pops_app_mis.free_sticker')}</span>}
                        </button>
                    </>
                )}
            </div>
        </div>
    )

    const tablaDe = (lista, textoVacio) => (
        <div className={s.tabla}>
            <div className={`${s.fila} ${s.columnas}`} aria-hidden>
                <span>{t('pops_app_mis.col_pop')}</span>
                <span>{t('pops_app_mis.col_date')}</span>
                <span>{t('pops_app_mis.col_status')}</span>
                <span>{t('pops_app_mis.col_confirmed')}</span>
                <span>{t('pops_app_mis.col_no')}</span>
                <span>{t('pops_app_mis.col_views')}</span>
                <span>{t('pops_app_mis.col_response')}</span>
                <span />
            </div>
            {lista.length === 0 && <p className={s.sinFilas}>{textoVacio}</p>}
            {lista.map(f => (
                <div key={f.item.id} className={s.fila}>
                    <span className={s.pop}>
                        <span className={s.mini} style={{ background: f.color }}>
                            {f.portada ? <MiniaturaPop src={f.portada} /> : (f.emoji || f.iniciales)}
                        </span>
                        <span className={s.popTextos}>
                            <span className={s.nombre}>{f.nombre}</span>
                            {f.cliente && <small className={s.clienteDe}>{f.cliente}</small>}
                        </span>
                    </span>
                    <span className={s.fecha}>{fechaTexto(f.item)}</span>
                    <span>{estadoChip(f.estado)}</span>
                    <span className={s.fuerte}>{confirmadosTexto(f)}</span>
                    <span className={s.suave}>{f.total == null ? '—' : f.no}</span>
                    <span className={s.suave}>—</span>
                    <span className={s.medio}>{respuesta(f)}</span>
                    <span className={s.acciones} ref={menu === f.id ? menuRef : undefined}>
                        {f.porEnviar && onEnviarACliente && (
                            <button type='button' className={s.enviarCliente} onClick={() => onEnviarACliente(f.item)}>
                                <Send size={14} />{t('pops_app_mis.send')}
                            </button>
                        )}
                        <button type='button' className={s.abrir} onClick={() => onAbrir?.(f.item)}>{t('pops_app_mis.open')}</button>
                        <button
                            type='button'
                            className={s.mas}
                            data-abierto={menu === f.id || undefined}
                            aria-haspopup='menu'
                            aria-expanded={menu === f.id}
                            aria-label={t('pops_app_mis.more')}
                            onClick={() => setMenu(m => (m === f.id ? null : f.id))}
                        >
                            <MoreHorizontal size={18} />
                        </button>
                        {menu === f.id && menuDe(f)}
                    </span>
                </div>
            ))}
        </div>
    )

    const ejemplosBloqueados = filasClientes.length
        ? filasClientes.slice(0, 3)
        : ['preview_1', 'preview_2', 'preview_3'].map(k => {
            const nombre = t(`pops_app_mis.${k}`)
            return { llave: k, nombre, iniciales: inicialesDePop(nombre) }
        })

    const bloqueClientes = !esCliente && (
        <section className={s.clientes}>
            <div className={s.clientesCabeza}>
                <div className={s.clientesTitulo}>
                    <h2>{t('pops_app_mis.clients_title')}</h2>
                    <InsigniaPlus tam='m' />
                    <span className={s.clientesSub}>{t('pops_app_mis.clients_sub')}</span>
                </div>
                {plan.plus && (
                    // Un solo botón: el flujo arranca en "A mi cliente", donde se da de alta.
                    <div className={s.clientesBotones}>
                        <button type='button' className={s.botonNavy} onClick={onEnviarPop}>
                            <span className={s.botonNavyMas}><Plus size={18} strokeWidth={2.6} /></span>
                            {t('pops_app_mis.send_a_pop')}
                        </button>
                    </div>
                )}
            </div>
            {plan.plus ? tablaDe(mostradasCli, vacioCli) : (
                <div className={s.venta}>
                    <div className={s.ventaTextos}>
                        <span className={s.ventaTitulo}>{t('pops_app_mis.sell_title')}</span>
                        <span className={s.ventaTexto}>{t('pops_app_mis.sell_text')}</span>
                        <ul className={s.beneficios}>
                            <li>✓ {t('pops_app_mis.sell_b1')}</li>
                            <li>✓ {t('pops_app_mis.sell_b2')}</li>
                            <li>✓ {t('pops_app_mis.sell_b3')}</li>
                        </ul>
                        <button type='button' className={s.ventaCta} onClick={onPasarPlus}>{t('pops_app_mis.go_plus', { price: PRECIO_PLUS })}</button>
                    </div>
                    <div className={s.bloqueados} aria-hidden>
                        {ejemplosBloqueados.map(c => (
                            <div key={c.llave} className={s.bloqueado}>
                                <span className={`${s.avatar} ${s.avatarChico}`}>{c.iniciales}</span>
                                <span className={s.nombre}>{c.nombre}</span>
                                <span>🔒</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    )

    if (movil) {
        const resumen = (f) => {
            if (f.total == null) return '—'
            if (f.total === 0) return t('pops_app_mis.not_sent', { defaultValue: 'Sin enviar' })
            return (
                <>
                    <b>{confirmadosTexto(f)}</b> {t('pops_app_mis.going', { defaultValue: 'van' })}
                    {' · '}{t('pops_app_mis.responded', { defaultValue: '{{pct}} respondió', pct: respuesta(f) })}
                </>
            )
        }
        const abierta = menu != null ? [...mostradas, ...mostradasCli].find(f => f.id === menu) : null

        const vacioMovil = (
            <div className={s.mVacio}>
                <span aria-hidden className={s.mDestello} />
                <span aria-hidden className={s.mDestellito} />
                <div className={s.mLienzo}>
                    <div className={s.mContorno}>
                        <span aria-hidden className={s.mTijeras}>✂︎</span>
                        {puedeCrear && (
                            <button type='button' className={s.mMasGrande} onClick={onCrear} aria-label={t('pops_app_mis.make_a_pop')}>
                                <Plus size={38} strokeWidth={3} />
                            </button>
                        )}
                        <span className={s.mContornoTexto}>{t('pops_app_mis.empty_slot_1')}<br />{t('pops_app_mis.empty_slot_2')}</span>
                    </div>
                    <span className={`${s.mNota} ${s.mNota1}`}>{t('pops_app_mis.note_confirmed')}</span>
                    <span className={`${s.mNota} ${s.mNota2}`}>{t('pops_app_mis.note_count')}</span>
                    <span className={`${s.mNota} ${s.mNota3}`}>{t('pops_app_mis.note_place')}</span>
                </div>
                <div className={s.mTitulares}>
                    <span className={`${s.mRecorte} ${s.recorteNavy}`}>{t('pops_app_mis.empty_title_1')}</span>
                    <span className={`${s.mRecorte} ${s.mRecorteLima}`}>{t('pops_app_mis.empty_title_2')}</span>
                </div>
                <p className={s.mVacioTexto}>{t('pops_app_mis.empty_text')}</p>
                {puedeCrear && (
                    <>
                        <div className={s.mAtajos}>
                            {ATAJOS.map(a => (
                                <button key={a.k} type='button' className={`${s.atajo} ${s.mAtajo}`} style={{ '--rot': `${a.rot}deg` }} onClick={onCrear}>
                                    {a.e} {t(`pops_app_mis.${a.k}`)}
                                </button>
                            ))}
                        </div>
                        <button type='button' className={`${s.ctaGrande} ${s.mCta}`} onClick={onCrear}>
                            <span className={`${s.ctaMas} ${s.mCtaMas}`}><Plus size={22} strokeWidth={2.6} /></span>
                            {t('pops_app_mis.make_a_pop')}
                            {!plan.plus && <span className={`${s.gratis} ${s.mGratis}`}>{t('pops_app_mis.free_sticker')}</span>}
                        </button>
                    </>
                )}
            </div>
        )

        const listaMovilDe = (lista, textoVacio) => (
            <div className={s.mLista}>
                {lista.length === 0 && <p className={s.sinFilas}>{textoVacio}</p>}
                {lista.map(f => (
                    <div key={f.item.id} className={s.mFila}>
                        <button type='button' className={s.mFilaAbrir} onClick={() => onAbrir?.(f.item)}>
                            <span className={`${s.mini} ${s.mMini}`} style={{ background: f.color }}>
                                {f.portada ? <MiniaturaPop src={f.portada} /> : (f.emoji || f.iniciales)}
                            </span>
                            <span className={s.mFilaTextos}>
                                <span className={`${s.nombre} ${s.mNombre}`}>{f.nombre}</span>
                                {f.cliente && <span className={s.mCliente}>{f.cliente}</span>}
                                <span className={s.mFilaMeta}>{estadoChip(f.estado)}<span className={s.mFecha}>{fechaTexto(f.item)}</span></span>
                                <span className={s.mResumen}>{resumen(f)}</span>
                            </span>
                        </button>
                        {f.porEnviar && onEnviarACliente && (
                            <button type='button' className={`${s.enviarCliente} ${s.mEnviarCliente}`} onClick={() => onEnviarACliente(f.item)}>
                                <Send size={14} />{t('pops_app_mis.send')}
                            </button>
                        )}
                        <button
                            type='button'
                            className={`${s.mas} ${s.mMas}`}
                            data-abierto={menu === f.id || undefined}
                            aria-haspopup='menu'
                            aria-expanded={menu === f.id}
                            aria-label={t('pops_app_mis.more')}
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => setMenu(m => (m === f.id ? null : f.id))}
                        >
                            <MoreHorizontal size={20} />
                        </button>
                    </div>
                ))}
            </div>
        )

        const hojaMenu = abierta && createPortal(
            <div className={s.mVelo}>
                <div className={s.mHoja} ref={menuRef}>
                    <button type='button' className={s.mAsa} aria-label={t('pops_app_mis.cancel')} onClick={() => setMenu(null)} />
                    <div className={s.mHojaPop}>
                        <span className={`${s.mini} ${s.mMini}`} style={{ background: abierta.color }}>
                            {abierta.portada ? <MiniaturaPop src={abierta.portada} /> : (abierta.emoji || abierta.iniciales)}
                        </span>
                        <span className={`${s.nombre} ${s.mNombre}`}>{abierta.nombre}</span>
                    </div>
                    {menuDe(abierta, s.mMenu)}
                </div>
            </div>,
            document.body,
        )

        const clientesMovil = !esCliente && (
            <section className={s.mClientes}>
                <div className={s.mClientesCabeza}>
                    <span className={s.mClientesTitulo}>
                        <h2>{t('pops_app_mis.clients_title')}</h2>
                        <InsigniaPlus tam='s' />
                    </span>
                    <span className={s.mClientesSub}>{t('pops_app_mis.clients_sub')}</span>
                </div>
                {plan.plus ? (
                    <>
                        <div className={s.mClientesBotones}>
                            <button type='button' className={`${s.botonNavy} ${s.mBoton}`} onClick={onEnviarPop}>+ {t('pops_app_mis.send_a_pop')}</button>
                        </div>
                        {listaMovilDe(mostradasCli, vacioCli)}
                    </>
                ) : (
                    <div className={s.mVenta}>
                        <span className={s.mVentaTitulo}>{t('pops_app_mis.sell_title')}</span>
                        <span className={s.mVentaTexto}>
                            {t('pops_app_mis.sell_text_short', { defaultValue: 'Con Pops+ guardas a tus clientes, creas Pops a su nombre y se los mandas.' })}
                        </span>
                        <div className={s.mCandados} aria-hidden>
                            {ejemplosBloqueados.map(c => <span key={c.llave} className={s.mCandado}>🔒</span>)}
                        </div>
                        <button type='button' className={s.mVentaCta} onClick={onPasarPlus}>{t('pops_app_mis.go_plus', { price: PRECIO_PLUS })}</button>
                    </div>
                )}
            </section>
        )

        // Mientras cargan los Pops: esqueleto de la lista (antes salía el vacío).
        if (cargando && visiblesPops.length === 0) {
            return (
                <div className={`${s.pagina} ${s.mPagina}`} aria-busy='true'>
                    <div className={s.titulo}><h1 className={s.mH1}>{t('pops_app_mis.title')}</h1></div>
                    <EsqueletoLista movil />
                </div>
            )
        }

        return (
            <div className={`${s.pagina} ${s.mPagina}`}>
                {aviso}
                <div className={s.titulo}>
                    <h1 className={s.mH1}>{t('pops_app_mis.title')}</h1>
                    <span className={s.mCuenta}>{visiblesPops.length}</span>
                </div>
                {visiblesPops.length === 0 ? vacioMovil : (
                    <>
                        <div className={s.mFiltros} role='group' aria-label={t('pops_app_mis.filter_label')}>
                            {FILTROS.map(id => (
                                <button
                                    key={id}
                                    type='button'
                                    className={`${s.filtro} ${s.mFiltro}`}
                                    data-activo={filtro === id || undefined}
                                    aria-pressed={filtro === id}
                                    onClick={() => { setFiltro(id); setMenu(null) }}
                                >
                                    {t(`pops_app_mis.filter_${id}`)}
                                    <span className={s.filtroN}>{porGrupo(id).length}</span>
                                </button>
                            ))}
                        </div>
                        <div className={s.mStats}>
                            {stats.map((k, i) => (
                                <div key={i} className={s.mStat}><span className={s.statV}>{k.v}</span><span className={s.mStatLabel}>{k.label}</span></div>
                            ))}
                        </div>
                        {listaMovilDe(mostradas, t(`pops_app_mis.empty_filter_${filtro}`))}
                    </>
                )}
                {clientesMovil}
                {hojaMenu}
            </div>
        )
    }

    // Mientras cargan los Pops: esqueleto de los datos y la tabla (antes salía
    // el vacío "Tu primer Pop" un momento).
    if (cargando && visiblesPops.length === 0) {
        return (
            <div className={s.pagina} aria-busy='true'>
                <div className={s.cabeza}><div className={s.titulo}><h1>{t('pops_app_mis.title')}</h1></div></div>
                <EsqueletoLista />
            </div>
        )
    }

    return (
        <div className={s.pagina}>
            {titulo}
            {aviso}
            {visiblesPops.length === 0 ? vacio : (
                <>
                    <div className={s.stats}>
                        {stats.map((k, i) => (
                            <div key={i} className={s.stat}><span className={s.statV}>{k.v}</span><span className={s.statLabel}>{k.label}</span></div>
                        ))}
                    </div>
                    {tablaDe(mostradas, t(`pops_app_mis.empty_filter_${filtro}`))}
                </>
            )}
            {bloqueClientes}
        </div>
    )
}

// Esqueleto de Mis Pops: la barra de datos y unas filas (o tarjetas en el celular).
const EsqueletoLista = ({ movil = false }) => (
    <div className={s.esqueleto} aria-hidden>
        <div className={s.esqStats}>
            {[0, 1, 2].map(i => <span key={i} className={`${s.esqBloque} ${s.esqStat}`} />)}
        </div>
        <div className={movil ? s.esqListaMovil : s.esqTabla}>
            {[0, 1, 2, 3].map(i => (
                <div key={i} className={s.esqFila}>
                    <span className={`${s.esqBloque} ${s.esqMini}`} />
                    <span className={s.esqTextos}>
                        <span className={`${s.esqBloque} ${s.esqLinea}`} style={{ width: `${46 - i * 6}%` }} />
                        <span className={`${s.esqBloque} ${s.esqLinea} ${s.esqCorta}`} />
                    </span>
                    {!movil && <span className={`${s.esqBloque} ${s.esqBoton}`} />}
                </div>
            ))}
        </div>
    </div>
)

const Flecha = ({ className, d = 'M5 5 C 40 10, 70 25, 85 42 M73 30 L85 42 L69 46' }) => (
    <svg aria-hidden className={className} width='90' height='50' viewBox='0 0 90 50' fill='none' stroke='currentColor' strokeWidth='2.5' strokeLinecap='round'>
        <path d={d} />
    </svg>
)

export default PopsAppMisPops
