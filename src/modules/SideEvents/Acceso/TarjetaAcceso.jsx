import { useEffect, useState } from 'react'
import { ArrowUpRight, Copy, Download, Globe, Lock, Play } from 'lucide-react'
import { LogoPlataforma } from './LogoPlataforma'
import {
    detectarPlataforma, estadoPorHora, faltaLegible, formatoIdZoom, hostDeMaterial, idDeZoom,
    lineaZona, normalizarAcceso, pesoLegible, textosPlataforma, tipoDeArchivo,
} from '../acceso'
import s from './TarjetaAcceso.module.css'

// Widget Acceso de un Pop en línea en la pieza del editor (handoff "Pop ·
// Evento en línea", 2a/2b). Gemelo de
// iattend-events/src/components/SideEvent/Layout/TarjetaAcceso.tsx: si cambias
// uno, cambia el otro. En el editor nada abre ni copia (es la pieza).
// `bloqueada`: vista "sin confirmar"; `muestra`: estado inicial sin enlace.
export const TarjetaAcceso = ({ body, acceso: crudo, bloqueada = false, muestra = false, clase = '' }) => {
    const acceso = normalizarAcceso(crudo)
    const d = detectarPlataforma(acceso.url)
    const platform = muestra ? 'zoom' : (d.valido ? d.platform : body?.online?.platform) ?? 'link'
    const txt = textosPlataforma(platform, { host: d.host })
    const [ahora, setAhora] = useState(() => new Date())
    useEffect(() => {
        const id = setInterval(() => setAhora(new Date()), 60_000)
        return () => clearInterval(id)
    }, [])
    const { estado, falta } = estadoPorHora(body, ahora)
    const zona = lineaZona(body)

    const subtitulo = muestra ? 'zoom.us/j/…'
        : bloqueada ? 'Enlace privado'
            : platform === 'youtube' ? 'YouTube'
                : platform === 'link' && d.corto === d.host ? 'Enlace' : (d.corto || '')
    const chipYoutube = estado === 'antes' ? `en ${faltaLegible(falta)}`
        : estado === 'pronto' ? 'Por comenzar'
            : estado === 'envivo' ? 'En vivo'
                : estado === 'termino' ? 'Terminó' : null
    const conBotonGrande = platform === 'youtube' && !bloqueada && (estado === 'pronto' || estado === 'envivo' || estado === 'termino')
    const cuandoReunion = platform !== 'youtube' && (estado === 'antes' && falta <= 24 * 60 ? `Empieza en ${faltaLegible(falta)}` : estado === 'envivo' ? 'En curso' : null)

    const meetingId = platform === 'zoom' ? formatoIdZoom(acceso.meetingId || idDeZoom(acceso.url) || '') : ''
    const codigo = platform === 'zoom' ? (d.zoomConPwd ? '' : acceso.passcode) : platform === 'meet' ? (d.meetCode || acceso.passcode) : ''
    const datos = muestra
        ? [{ etiqueta: 'ID de reunión', valor: '842 1390 7711' }, { etiqueta: 'Código', valor: 'FIN2026' }]
        : [
            meetingId ? { etiqueta: 'ID de reunión', valor: meetingId } : null,
            codigo ? { etiqueta: platform === 'meet' ? 'Código de reunión' : 'Código', valor: codigo } : null,
        ].filter(Boolean)
    const material = muestra ? [] : acceso.material

    return (
        <div className={`${s.acceso} ${clase}`}>
            <div className={s.cabecera}>
                <span className={s.mosaico}><LogoPlataforma platform={platform} /></span>
                <span className={s.textos}>
                    <span className={s.titulo}>{txt.titulo}</span>
                    <span className={s.subtitulo}>{subtitulo}</span>
                    {cuandoReunion && !bloqueada && <span className={s.cuando}>{cuandoReunion}</span>}
                </span>
                {!bloqueada && (platform === 'youtube'
                    ? chipYoutube && <span className={s.estado} data-vivo={estado === 'envivo' || undefined}>{estado === 'envivo' && <i className={s.punto} />}{chipYoutube}</span>
                    : <span className={s.unirme}>{txt.boton} <ArrowUpRight size={14} /></span>)}
            </div>

            {bloqueada ? (
                <div className={s.candado}>
                    <span className={s.candadoIcono}><Lock size={16} /></span>
                    <span className={s.textos}>
                        <span className={s.candadoTitulo}>Enlace de acceso</span>
                        <span className={s.subtitulo}>Confirma tu asistencia para verlo</span>
                    </span>
                </div>
            ) : (
                <>
                    {conBotonGrande && (
                        <span className={s.ver}><Play size={14} fill="currentColor" /> {estado === 'termino' ? 'Ver repetición' : 'Ver transmisión'}</span>
                    )}
                    {datos.length > 0 && (
                        <div className={s.datos} data-uno={datos.length === 1 || undefined}>
                            {datos.map((x) => (
                                <span key={x.etiqueta} className={s.dato}>
                                    <span className={s.textos}>
                                        <span className={s.datoEtiqueta}>{x.etiqueta}</span>
                                        <span className={s.datoValor}>{x.valor}</span>
                                    </span>
                                    <Copy size={15} />
                                </span>
                            ))}
                        </div>
                    )}
                    {zona && <span className={s.zona}>{zona}</span>}
                    {material.length > 0 && (
                        <div className={s.material}>
                            <span className={s.materialEtiqueta}>MATERIAL</span>
                            {material.map((m) => (
                                <div key={m.id} className={s.fila}>
                                    {m.kind === 'file'
                                        ? <span className={s.tipo}>{tipoDeArchivo(m.mime, m.path)}</span>
                                        : <span className={s.globo}><Globe size={16} /></span>}
                                    <span className={s.textos}>
                                        <span className={s.filaTitulo}>{m.title || (m.kind === 'link' ? hostDeMaterial(m.url) : 'Archivo')}</span>
                                        <span className={s.subtitulo}>{m.kind === 'file' ? `${tipoDeArchivo(m.mime, m.path)} · ${pesoLegible(m.size)}` : hostDeMaterial(m.url)}</span>
                                    </span>
                                    {m.kind === 'file' ? <Download size={16} /> : <ArrowUpRight size={16} />}
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

export default TarjetaAcceso
