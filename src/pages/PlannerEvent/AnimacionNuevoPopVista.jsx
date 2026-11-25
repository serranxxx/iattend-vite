import { PopSticker } from '../../components/PopSticker/PopSticker'
import s from './AnimacionNuevoPop.module.css'

/*
  La vista de la animación al crear un Pop (handoff "Animaciones de Nuevo Pop",
  fiesta de stickers; la lanza lanzarAnimacionNuevoPop). Dos tiempos:
  · `pop` false: velo, el grupo de 5 stickers al centro y 16 dispersos que
    aparecen con popIn y se quedan flotando (si el Pop tarda en crearse, se
    quedan así hasta que llega).
  · `pop` true: los stickers salen disparados, el velo se va, anillo y 72
    piezas de confeti. Los retrasos de esta parte son relativos al momento
    en que `pop` cambia (algunos negativos: arrancan un poco antes, como en
    el prototipo).
  Medidas del frame de 1200 × 720 del prototipo, llevadas a la pantalla; el
  punto del pop es el centro (donde queda el Pop en el editor).
*/

const MAGENTA = '#FF2BD6'
const CIAN = '#3FE0F0'
const AMARILLO = '#F5F51E'
const MENTA = '#2BF5B0'
const NARANJA = '#FF5A1F'

// Grupo central: [tipo, color, dx, dy, tamaño, giro, retraso, salida x, salida y]
const GRUPO = [
    ['burst', MAGENTA, 0, 9, 270, -8, 0.05, -435, -678],
    ['bubble', CIAN, 27, 9, 200, 6, 0.2, 465, -618],
    ['heart', NARANJA, -144, 108, 108, -14, 0.35, -510, 432],
    ['spark', MENTA, 148, -122, 80, 0, 0.45, 600, -198],
    ['note', MAGENTA, 140, 104, 100, 12, 0.55, 495, 492],
]

// 16 dispersos: posición en el frame de 1200 × 720 y [tipo, color].
const POS = [[110, 120], [300, 70], [520, 110], [960, 90], [1110, 170], [90, 330], [250, 520], [130, 610], [420, 640], [1080, 400], [1130, 610], [930, 640], [360, 300], [1030, 260], [600, 60], [850, 560]]
const TIPOS = [['burst', MAGENTA], ['bubble', CIAN], ['heart', NARANJA], ['spark', MENTA], ['note', MAGENTA], ['eyes', AMARILLO], ['spark', AMARILLO], ['heart', MAGENTA], ['burst', CIAN], ['note', MENTA], ['spark', NARANJA], ['bubble', AMARILLO], ['eyes', CIAN], ['heart', MENTA], ['burst', AMARILLO], ['spark', MAGENTA]]

const COLORES = ['#CDF22B', '#FFB3C9', '#FFFFFF', '#F3F2EE', '#0B1F3A', '#DCE8FF', '#CDF22B', '#FFB3C9']
const ESTRELLA = 'polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'
const RUIDO = "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22%3E%3Cfilter id=%22p%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%221.1%22 numOctaves=%223%22/%3E%3CfeColorMatrix values=%220 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .14 0%22/%3E%3C/filter%3E%3Crect width=%22160%22 height=%22160%22 filter=%22url(%23p)%22/%3E%3C/svg%3E')"
const PAPEL = `linear-gradient(160deg,rgba(255,255,255,.28) 0%,rgba(255,255,255,.06) 30%,rgba(255,255,255,0) 55%,rgba(0,0,0,.05) 80%,rgba(0,0,0,.14) 100%),repeating-linear-gradient(97deg,rgba(255,255,255,.035) 0 1px,transparent 1px 5px),${RUIDO}`

// 72 piezas con el mismo pseudoazar del prototipo (siempre igual). Salen del
// perímetro de un recuadro de 300 × 540 alrededor del punto del pop.
const confeti = (W, H, escala) => Array.from({ length: 72 }, (_, i) => {
    const r1 = ((i * 9301 + 49297) % 233280) / 233280
    const r2 = ((i * 4253 + 7919) % 1000) / 1000
    const r3 = ((i * 7717 + 131) % 997) / 997
    const t = r1 * 4
    const lado = Math.floor(t)
    const fr = t - lado
    const sx = lado === 0 ? -W / 2 + fr * W : lado === 1 ? W / 2 : lado === 2 ? W / 2 - fr * W : -W / 2
    const sy = lado === 0 ? -H / 2 : lado === 1 ? -H / 2 + fr * H : lado === 2 ? H / 2 : H / 2 - fr * H
    const largo = Math.hypot(sx, sy)
    const d = (140 + r2 * 260) * escala
    const tipo = i % 5
    const tam = tipo === 0 ? [7, 22] : tipo === 1 ? [13, 13] : tipo === 2 ? [11, 11] : tipo === 3 ? [20, 20] : [24, 15]
    return {
        sx: sx * 0.92,
        sy: sy * 0.92,
        x: (sx / largo) * d,
        y: (sy / largo) * d - (90 + r3 * 80) * escala,
        sw: (r2 - 0.5) * 140,
        retraso: r3 * 0.08,
        caida: 1.4 + r1 * 0.5,
        giro: 0.8 + r2 * 0.9,
        r0: Math.round(r1 * 360),
        forma: {
            width: tam[0],
            height: tam[1],
            marginLeft: -tam[0] / 2,
            marginTop: -tam[1] / 2,
            borderRadius: tipo === 2 ? '50%' : tipo === 0 ? 3 : 2,
            clipPath: tipo === 3 ? ESTRELLA : 'none',
            backgroundColor: COLORES[i % 8],
            ...(tipo === 4 ? { backgroundImage: PAPEL } : {}),
        },
    }
})

// Tres capas para que las animaciones no se pisen: salida · aparece · flota.
const Sticker = ({ tipo, color, tam, x, y, giro, aparece, flota, salida, pop, sombra, z }) => (
    <span
        className={`${s.sticker} ${pop ? salida.clase : ''}`}
        style={{
            left: x - tam / 2,
            top: y - tam / 2,
            width: tam,
            height: tam,
            zIndex: z,
            '--x': `${salida.x}px`,
            '--y': `${salida.y}px`,
            animationDelay: pop ? `${salida.retraso}s` : undefined,
        }}
    >
        <span className={s.aparece} style={{ animationDelay: `${aparece}s` }}>
            <span className={s.flota} style={{ '--r': `${giro}deg`, transform: `rotate(${giro}deg)`, filter: sombra, animationDuration: `${flota}s` }}>
                <PopSticker kind={tipo} color={color} size={tam} />
            </span>
        </span>
    </span>
)

export const AnimacionNuevoPopVista = ({ pop = false }) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const X = vw / 2
    const Y = vh / 2
    // Tamaños: del frame a la pantalla, sin bajar tanto en el celular.
    const e = Math.min(1.2, Math.max(0.55, Math.min(vw / 1200, vh / 720)))
    // Los dispersos salen 520 px del frame; en pantallas grandes, más.
    const lejos = Math.max(520, Math.max(vw, vh) * 0.55)

    const dispersos = POS.map(([fx, fy], i) => {
        const x = (fx / 1200) * vw
        const y = (fy / 720) * vh
        const vx = x - X
        const vy = y - Y
        const L = Math.hypot(vx, vy) || 1
        const [tipo, color] = TIPOS[i]
        return (
            <Sticker
                key={`d${i}`}
                tipo={tipo}
                color={color}
                tam={(54 + ((i * 37) % 5) * 10) * e}
                x={x}
                y={y}
                giro={((i * 53) % 40) - 20}
                aparece={0.1 + ((i * 7) % 10) * 0.06}
                flota={2.2 + i * 0.2}
                sombra='drop-shadow(0 8px 10px rgba(11,31,58,.25))'
                pop={pop}
                z={1}
                salida={{ clase: s.saleDisperso, x: (vx / L) * lejos, y: (vy / L) * lejos, retraso: -0.05 + (i % 4) * 0.03 }}
            />
        )
    })

    const grupo = GRUPO.map(([tipo, color, dx, dy, tam, giro, aparece, sx, sy], i) => (
        <Sticker
            key={`g${i}`}
            tipo={tipo}
            color={color}
            tam={tam * e}
            x={X + dx * e}
            y={Y + dy * e}
            giro={giro}
            aparece={aparece}
            flota={3.4 + i * 0.5}
            sombra='drop-shadow(0 10px 14px rgba(11,31,58,.3))'
            pop={pop}
            z={2}
            salida={{ clase: s.saleGrupo, x: sx * e, y: sy * e, retraso: -0.02 + i * 0.03 }}
        />
    ))

    return (
        <div className={s.capa} aria-hidden>
            <span className={`${s.velo} ${pop ? s.veloFuera : ''}`} />
            {dispersos}
            {grupo}
            {pop && (
                <>
                    <span className={s.anillo} style={{ left: X, top: Y, width: 340 * e, height: 340 * e, borderWidth: 14 * e }} />
                    {confeti(300 * e, 540 * e, e).map((c, i) => (
                        <div
                            key={`c${i}`}
                            className={s.pieza}
                            style={{ left: X + c.sx, top: Y + c.sy, '--x': `${c.x}px`, '--y': `${c.y}px`, animationDelay: `${c.retraso}s, ${c.retraso}s` }}
                        >
                            <div className={s.cae} style={{ '--sw': `${c.sw}px`, animationDuration: `${c.caida}s`, animationDelay: `${c.retraso + 0.3}s` }}>
                                <div className={s.gira} style={{ ...c.forma, '--r0': `${c.r0}deg`, animationDuration: `${c.giro}s`, animationDelay: `${c.retraso}s` }} />
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
    )
}


/** Aviso abajo al centro (handoff: "¡Enviado!" y "Tu Pop está listo"). */
export const ToastNuevoPop = ({ icono, fondoIcono, titulo, texto, onCerrar }) => (
    <div className={s.toast} role='status'>
        <span className={s.toastIcono} style={{ background: fondoIcono }}>{icono}</span>
        <span className={s.toastTextos}><b>{titulo}</b><small>{texto}</small></span>
        <button type='button' className={s.toastCerrar} onClick={onCerrar} aria-label='Cerrar'>✕</button>
    </div>
)
