/*
  Drawer de confirmación del banco de pruebas, con los datos de `test-1` y del
  invitado `oG1-Z2W` (Samuel Ruiz Reyesz).

  Réplica de `Confirm` + el `SlideOverlay` que lo envuelve en `iattend-events`.
  Se copiaron los estados, los textos y los estilos; se quitó una sola cosa:
  **no escribe en Supabase**. El componente real hace `upsert` sobre `guests` al
  confirmar o rechazar, y aquí eso movería de verdad el estado de un invitado
  de producción. Todo vive en estado local: se puede confirmar, rechazar y
  cambiar de opinión las veces que haga falta sin tocar la base.

  Dos diferencias más, obligadas por el marco del teléfono:
  - El `SlideOverlay` real hace `createPortal(document.body)`. Aquí no: se
    portalearía fuera del teléfono y taparía el Laboratorio entero. Va como
    `absolute` dentro de la pantalla.
  - Los íconos son de `react-icons`, no de Lucide, porque son los mismos que
    usa el componente del invitado y aquí lo que importa es que se vea igual.
  - El confeti se dispara sobre un canvas propio. Por defecto `canvas-confetti`
    cuelga uno `fixed` del `body` y el papelito acababa cayendo sobre el
    Laboratorio entero; en la invitación real eso no se nota porque el
    teléfono *es* la ventana.
*/

import { useEffect, useRef, useState } from 'react'
import { Button, Input } from 'antd'
import { FaRegCalendarCheck } from 'react-icons/fa'
import { FaRegCalendarXmark } from 'react-icons/fa6'
import { IoClose } from 'react-icons/io5'
import { AddToCalendarButton } from 'add-to-calendar-button-react'
import confetti from 'canvas-confetti'
import {
    ACOMPANANTES_TEST1,
    COLORES_TEST1,
    EVENTO_TEST1,
    FUENTES_TEST1,
    INVITADO_TEST1,
    TEXTOS_TEST1,
} from './datosTest1'
import styles from './ConfirmarPrueba.module.css'

// Igual que EXIT_DURATION_MS del SlideOverlay: el hijo tiene que seguir en el
// DOM mientras corre la animación de salida, o React lo arranca de golpe.
const SALIDA_MS = 320

// `asistente` es `confirmado` con otro nombre en la base; `creado` entra al
// formulario como `esperando`. Mismo mapeo que el componente real.
const estadoInicial = (estado) => (
    estado === 'creado' ? 'esperando'
        : estado === 'asistente' ? 'confirmado'
            : estado
)

export const ConfirmarPrueba = ({ abierto, alCerrar }) => {
    const { accent, primary, secondary } = COLORES_TEST1
    const T = TEXTOS_TEST1

    const [montado, setMontado] = useState(abierto)
    const [entrado, setEntrado] = useState(false)
    const lienzo = useRef(null)

    const [estado, setEstado] = useState(() => estadoInicial(INVITADO_TEST1.state))
    const [nombre, setNombre] = useState(INVITADO_TEST1.name)
    const [acompanantes, setAcompanantes] = useState(ACOMPANANTES_TEST1)

    useEffect(() => {
        if (abierto) {
            setMontado(true)
            const frame = requestAnimationFrame(() => setEntrado(true))
            return () => cancelAnimationFrame(frame)
        }
        setEntrado(false)
        const t = setTimeout(() => setMontado(false), SALIDA_MS)
        return () => clearTimeout(t)
    }, [abierto])

    if (!montado) return null

    const confirmar = () => {
        setEstado('confirmado')
        const disparar = lienzo.current
            ? confetti.create(lienzo.current, { resize: true })
            : confetti
        disparar({ particleCount: 200, spread: 80, angle: 90, origin: { x: 0.5, y: 0.9 } })
    }

    const cambiarRespuesta = () => {
        setEstado('esperando')
        setAcompanantes(lista => lista.map(c => ({ ...c, state: 'esperando' })))
    }

    const cambiarAcompanante = (i, cambios) => {
        setAcompanantes(lista => lista.map((c, idx) => (idx === i ? { ...c, ...cambios } : c)))
    }

    const faltaNombre = acompanantes.some(c => !c.name)

    return (
        <div className={`${styles.overlay} ${entrado ? styles.overlayEntrado : ''}`}>
            <canvas ref={lienzo} className={styles.confeti} />
            <div className={styles.hoja} style={{ backgroundColor: primary }}>
                <div className={styles.encabezado}>
                    <span style={{ fontFamily: FUENTES_TEST1.body, fontSize: 20, color: accent }}>
                        {T.drawerTitle}
                    </span>
                    <button
                        type='button'
                        onClick={alCerrar}
                        aria-label={T.cerrar}
                        className={styles.cerrar}
                        style={{ color: accent }}
                    >
                        <IoClose size={24} />
                    </button>
                </div>

                <div className={styles.cuerpo}>
                    {estado === 'esperando' && (
                        <div className={styles.contenedor}>
                            <span className={styles.texto} style={{ color: accent }}>
                                {T.closed_hi} <b>{nombre}</b>, {T.closed_happy}.
                            </span>
                            <span className={styles.texto} style={{ color: accent }}>
                                {T.closed_invitation} <b>{acompanantes.length} {T.closed_companion}.</b>
                            </span>
                            <span className={styles.texto} style={{ color: accent }}>
                                <b>{T.closed_notgoing}.</b>
                            </span>

                            <div className={styles.inputs}>
                                <Input
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    className={styles.input}
                                    placeholder='Tu nombre'
                                    style={{ color: accent, borderColor: `${accent}20` }}
                                />

                                {acompanantes.map((c, i) => (
                                    <div key={c.id} className={styles.filaAcompanante}>
                                        <div className={styles.campoAcompanante}>
                                            <Input
                                                value={c.name ?? ''}
                                                onChange={(e) => cambiarAcompanante(i, { name: e.target.value })}
                                                placeholder={`Acompañante de ${nombre}`}
                                                className={styles.input}
                                                style={{ color: accent, borderColor: `${accent}20` }}
                                            />
                                            {c.state === 'confirmado' && (
                                                <div className={styles.etiqueta} style={{ backgroundColor: accent, color: primary }}>
                                                    {T.confirmed}
                                                </div>
                                            )}
                                            {c.state === 'rechazado' && (
                                                <div
                                                    className={styles.etiqueta}
                                                    style={{ backgroundColor: secondary, color: accent, borderColor: 'transparent' }}
                                                >
                                                    {T.not_going}
                                                </div>
                                            )}
                                        </div>

                                        {c.state === 'rechazado' ? (
                                            <Button onClick={() => cambiarAcompanante(i, { state: 'esperando' })}>
                                                Editar
                                            </Button>
                                        ) : c.state !== 'confirmado' && (
                                            <Button
                                                style={{ height: 38 }}
                                                onClick={() => cambiarAcompanante(i, { state: 'rechazado' })}
                                            >
                                                <IoClose />
                                            </Button>
                                        )}
                                    </div>
                                ))}

                                {faltaNombre && (
                                    <span className={styles.pista} style={{ color: accent }}>{T.dont_forget}</span>
                                )}
                            </div>

                            <div className={styles.botones}>
                                <Button
                                    onClick={confirmar}
                                    style={{
                                        color: primary, backgroundColor: accent, letterSpacing: '2px',
                                        borderRadius: 16, minHeight: 52, width: '100%', fontSize: 16,
                                    }}
                                >
                                    {T.cta}
                                </Button>
                                <Button
                                    onClick={() => setEstado('rechazado')}
                                    style={{
                                        border: `1px solid ${accent}`, color: accent, borderRadius: 16,
                                        backgroundColor: 'transparent', minHeight: 52, width: '100%', fontSize: 16,
                                    }}
                                >
                                    {T.decline}
                                </Button>
                            </div>
                        </div>
                    )}

                    {estado === 'confirmado' && (
                        <div className={styles.resultado}>
                            <div className={styles.icono}>
                                <FaRegCalendarCheck size={50} style={{ color: accent }} />
                            </div>

                            <span className={styles.texto} style={{ color: accent, maxWidth: '80%' }}>
                                {T.confirmedMsgBold}
                            </span>

                            <div className={styles.separador} style={{ backgroundColor: secondary }} />

                            <span className={styles.texto} style={{ color: accent }}>{T.addToCalendar}</span>

                            <AddToCalendarButton
                                name={EVENTO_TEST1.titulo}
                                options={['Google', 'Apple', 'Outlook.com']}
                                startDate={EVENTO_TEST1.fecha}
                                timeZone='America/Los_Angeles'
                            />

                            <Button
                                onClick={cambiarRespuesta}
                                style={{
                                    background: 'transparent', minHeight: 52, width: '100%', fontSize: 16,
                                    borderRadius: 16, maxWidth: '80%', border: `1px solid ${accent}`, color: accent,
                                }}
                            >
                                {T.changeAnswer}
                            </Button>
                        </div>
                    )}

                    {estado === 'rechazado' && (
                        <div className={styles.resultado}>
                            <div className={styles.icono}>
                                <FaRegCalendarXmark size={50} style={{ color: accent }} />
                            </div>

                            <span className={styles.texto} style={{ color: accent }}>{T.declinedMsg}</span>

                            <Button
                                onClick={cambiarRespuesta}
                                style={{
                                    background: 'transparent', minHeight: 52, width: '100%', fontSize: 16,
                                    borderRadius: 16, maxWidth: '80%', border: `1px solid ${accent}`, color: accent,
                                }}
                            >
                                {T.changeAnswer}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
