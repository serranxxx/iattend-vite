import { useId } from 'react'
import { PINCEL, pathDe, temblor } from './dibujoData'

/*
  Dibujo a mano de un Flash (handoff "Herramienta Dibujar (pincel)"): cada
  trazo es un elemento más de la portada (`body.stickers[n].kind === 'dibujo'`)
  y se pinta como SVG, nítido en cualquier pantalla. Lo usan la pieza del
  editor (SideCanvas, también el trazo en curso) y las miniaturas de Capas.
  Contraparte en la página del invitado:
  iattend-events/src/components/SideEvent/Dibujo.tsx (mismo dibujo).

  Elemento: { kind: 'dibujo', brush, color, size, points
  [[x, y]…] en unidades de su caja (vbW × vbH, px de la pieza de 390 × 700 al
  dibujarlo), erase? [{ points, size }] (lo que el borrador le quitó), y x / y
  / w / rot / opacity como cualquier elemento (la opacidad elegida va en la
  del elemento; el resaltador llega a 45 % como máximo). Escalarlo escala el
  trazo completo.
*/

// El trazo dentro de su caja (sin el contenedor): lo usan el elemento y el
// trazo en curso. `forced`: un color fijo (miniaturas de Capas).
export const TrazoSvg = ({ s, vbW, vbH, forced, preview = false }) => {
    const id = useId().replace(/:/g, '')
    const p = PINCEL[s.brush] ?? PINCEL.pluma
    const color = forced ?? s.color ?? '#FFFFFF'
    const ancho = s.size * p.k
    const d = pathDe(s.points)
    const comun = { fill: 'none', strokeLinecap: p.cap, strokeLinejoin: 'round' }
    const borrado = !preview && (s.erase ?? []).length > 0

    let cuerpo
    if (p.borra) {
        // Solo en el trazo en curso: una guía de por dónde pasa el borrador.
        cuerpo = <path d={d} {...comun} stroke="rgba(255,255,255,0.55)" strokeWidth={ancho} strokeDasharray={`${ancho * 0.2} ${ancho * 0.5}`} />
    } else if (p.brillo && !forced) {
        cuerpo = (
            <>
                <path d={d} {...comun} stroke={color} strokeWidth={ancho} filter={`url(#b${id})`} />
                <path d={d} {...comun} stroke={color} strokeWidth={ancho} filter={`url(#b${id})`} />
                <path d={d} {...comun} stroke={color} strokeWidth={ancho} />
                <path d={d} {...comun} stroke="#FFFFFF" strokeWidth={Math.max(1.5, s.size * 0.3)} />
            </>
        )
    } else if (p.grano && !forced) {
        cuerpo = [0, 1, 2, 3].map((k) => <path key={k} d={pathDe(temblor(s.points, k))} {...comun} stroke={color} strokeWidth={ancho} opacity={0.45} />)
    } else {
        cuerpo = <path d={d} {...comun} stroke={color} strokeWidth={ancho} />
    }

    return (
        <svg viewBox={`0 0 ${vbW} ${vbH}`} width="100%" height="100%" overflow="visible" style={{ display: 'block', overflow: 'visible' }}>
            <defs>
                {p.brillo && !forced && (
                    <filter id={`b${id}`} filterUnits="userSpaceOnUse" x={-vbW} y={-vbH} width={vbW * 3} height={vbH * 3}>
                        <feGaussianBlur stdDeviation={s.size * 1.1} />
                    </filter>
                )}
                {borrado && (
                    <mask id={`m${id}`} maskUnits="userSpaceOnUse" x={-vbW} y={-vbH} width={vbW * 3} height={vbH * 3}>
                        <rect x={-vbW} y={-vbH} width={vbW * 3} height={vbH * 3} fill="white" />
                        {s.erase.map((e, i) => (
                            <path key={i} d={pathDe(e.points)} fill="none" stroke="black" strokeWidth={e.size} strokeLinecap="round" strokeLinejoin="round" />
                        ))}
                    </mask>
                )}
            </defs>
            <g mask={borrado ? `url(#m${id})` : undefined}>{cuerpo}</g>
        </svg>
    )
}

// El elemento: su caja con la proporción del trazo.
export const Dibujo = ({ s, forced }) => (
    <span style={{ display: 'block', width: '100%', aspectRatio: `${s.vbW} / ${s.vbH}` }}>
        <TrazoSvg s={s} vbW={s.vbW} vbH={s.vbH} forced={forced} />
    </span>
)
