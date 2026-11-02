import { useEffect, useRef, useState } from 'react'
import { QRCode } from 'antd'
import s from './PaseWallet.module.css'

/*
  Réplica del pase de Apple Wallet de un invitado (diseño nuevo de iOS 18+
  con QR, como lo genera iattend--backend/services/wallet/walletService.js):
  · Frente: ver `Frente`.
  · Detalles (la hoja "Pass Details" de iOS): sugerir en la pantalla
    bloqueada, avisos del evento, cada dirección con su link, el itinerario
    y el link a la invitación.
  Lo comparten la invitación y los side events / Pop (WalletPanel): cada
  editor arma su `vista` (Invitation/…/datosPaseWallet.js,
  SideEvents/Workspace/datosPasePop.js). Lo del invitado (nombre, campos
  como Mesa o Personas / Folio, QR) es de ejemplo: a cada quien le llega el suyo.
*/

const PERSPECTIVA = 'perspective(1400px)'

// El marco es el contenedor de las medidas (cqw): el pase mide en % de él.
// Al cambiar de lado gira como en Wallet: la cara que se ve gira hasta quedar
// de canto (90°), ahí cambia a la otra y termina de girar. Con "reducir
// movimiento", cambia sin girar.
export const PaseWallet = ({ vista, lado = 'frente', ejemplo }) => {
    const marcoRef = useRef(null)
    const [visible, setVisible] = useState(lado)

    useEffect(() => {
        if (lado === visible) return
        const el = marcoRef.current
        const reducir = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
        if (!el?.animate || reducir) { setVisible(lado); return }
        const sentido = lado === 'detalles' ? 1 : -1
        const ida = el.animate(
            [{ transform: `${PERSPECTIVA} rotateY(0deg)` }, { transform: `${PERSPECTIVA} rotateY(${90 * sentido}deg)` }],
            { duration: 200, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
        )
        let vuelta = null
        ida.onfinish = () => {
            setVisible(lado)
            vuelta = el.animate(
                [{ transform: `${PERSPECTIVA} rotateY(${-90 * sentido}deg)` }, { transform: `${PERSPECTIVA} rotateY(0deg)` }],
                { duration: 280, easing: 'cubic-bezier(0, 0, 0.2, 1)' },
            )
            ida.cancel()
        }
        return () => { ida.onfinish = null; ida.cancel(); vuelta?.cancel() }
    }, [lado])

    return (
        <div ref={marcoRef} className={s.marco}>
            {visible === 'detalles' ? <Detalles vista={vista} ejemplo={ejemplo} /> : <Frente vista={vista} ejemplo={ejemplo} />}
        </div>
    )
}

// La foto del pase: `vista.imagen` o, si el editor la pinta en vivo (Pop sin
// foto propia: la portada con sus elementos, como se va a armar al guardar),
// `vista.fotoVivo` (un nodo que cubre su caja).
export const FotoPase = ({ vista, className }) => {
    if (vista.fotoVivo) return <div className={className} style={{ overflow: 'hidden' }}>{vista.fotoVivo}</div>
    return vista.imagen ? <img className={className} src={vista.imagen} alt="" /> : null
}

// Frente (diseño nuevo de Wallet en iOS 18+, como lo genera el backend): la
// foto grande arriba con el QR encima, el logo (primaryLogo) y la fecha y
// hora arriba; en el pie, sobre la misma foto desenfocada, el nombre del
// evento en grande, un renglón en letra monoespaciada (`ejemplo.pie`; sin él,
// el invitado) y a la derecha `ejemplo.asiento` como "Asiento"
// (semantics.seats; la etiqueta la pone Apple): en la invitación su mesa, en
// el Pop el invitado (y abajo el lugar).
// Debajo, como en Wallet: "Información adicional" y el lugar en Mapas.
const Frente = ({ vista, ejemplo }) => {
    const lugar = vista.lugares.find((l) => l.principal) ?? vista.lugares[0]
    return (
        <div className={s.frente}>
            <div className={s.pase}>
                <FotoPase vista={vista} className={s.foto} />
                <div className={s.pie}>
                    <FotoPase vista={vista} className={s.pieFondo} />
                </div>
                <div className={s.encabezado}>
                    <img className={s.logo} src="/images/logo_cover.png" alt="I attend" />
                    <div className={s.fechaHora}>
                        <span className={s.fecha}>{vista.fecha}</span>
                        <span className={s.hora}>{vista.hora}</span>
                    </div>
                </div>
                <div className={s.qr}>
                    <QRCode type="svg" value={ejemplo.qr} size={160} bordered={false} color="#000000" bgColor="#FFFFFF" />
                </div>
                <div className={s.pieContenido}>
                    <div className={s.pieTextos}>
                        <span className={s.evento}>{vista.titulo}</span>
                        <span className={s.invitado}>{ejemplo.pie ?? ejemplo.nombre}</span>
                    </div>
                    {ejemplo.asiento && (
                        <div className={s.asiento} data-largo={String(ejemplo.asiento).length > 4 || undefined}>
                            <span className={s.asientoEtiqueta}>Asiento</span>
                            <span className={s.asientoValor}>{ejemplo.asiento}</span>
                        </div>
                    )}
                </div>
            </div>

            {ejemplo.campos?.length > 0 && (
                <div className={s.tarjeta}>
                    <span className={s.tarjetaTitulo}>Información adicional</span>
                    <span className={s.tarjetaTexto}>{['Invitado', ...ejemplo.campos.map((c) => c.etiqueta)].map((e) => e.charAt(0) + e.slice(1).toLowerCase()).join(', ')}</span>
                    <span className={s.chevron} aria-hidden>›</span>
                </div>
            )}
            {lugar && (
                <div className={s.tarjeta}>
                    <span className={s.pin} aria-hidden />
                    <span className={s.tarjetaTitulo}>{lugar.nombre || lugar.direccion}</span>
                    <span className={s.tarjetaTexto}>Abrir en Mapas</span>
                    <span className={s.chevron} aria-hidden>›</span>
                </div>
            )}
        </div>
    )
}

const Detalles = ({ vista, ejemplo }) => (
    <div className={s.detalles}>
        <div className={s.miniPase} style={{ position: 'relative' }}>
            <FotoPase vista={vista} />
        </div>
        <span className={s.detallesTitulo}>{vista.titulo}</span>
        <div className={s.lista}>
            <div className={s.fila}>
                <span className={s.filaTexto}>Sugerir en pantalla bloqueada</span>
                <span className={s.switch} aria-hidden />
            </div>
        </div>
        <span className={s.nota}>Se muestra según la hora o el lugar.</span>
        <div className={s.lista}>
            <div className={s.filaColumna}>
                <span className={s.filaTexto}>Avisos del evento</span>
                <span className={s.filaValor}>{ejemplo.aviso}</span>
            </div>
            {vista.lugares.map((l) => (
                <div key={l.indice} className={s.filaColumna}>
                    <span className={s.filaTexto}>
                        {[l.nombre, l.hora].filter(Boolean).join(' · ') || 'Lugar'}
                        {l.principal && vista.lugares.length > 1 && <span className={s.principal}>Principal</span>}
                    </span>
                    <span className={s.filaLink}>{l.direccion}</span>
                </div>
            ))}
            {vista.itinerario.length > 0 && (
                <div className={s.fila}>
                    <span className={s.filaTexto}>Itinerario</span>
                    <span className={s.itinerario}>
                        {vista.itinerario.map((m, i) => <span key={i}>{[m.hora, m.nombre].filter(Boolean).join('  ')}</span>)}
                    </span>
                </div>
            )}
            <div className={s.fila}>
                <span className={s.filaTexto}>Tu invitación</span>
                <span className={s.filaLink}>Ver invitación</span>
            </div>
        </div>
    </div>
)
