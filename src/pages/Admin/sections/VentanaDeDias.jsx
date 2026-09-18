/*
  Control de la ventana del resumen: días corridos hacia atrás desde hoy.

  Son dos piezas separadas porque viven en renglones distintos de la barra de
  navegación, y el reparto entre ellas es deliberado:

  · Los PRESETS son el control principal. Nadie quiere arrastrar hasta el 30
    exacto; casi siempre se quiere "el mes", "el trimestre", "el año".
  · El SLIDER es el ajuste fino, para cuando sí importa el número redondo —o
    para pasear por la serie y ver dónde cambia algo.

  Cuando el valor no cae en un preset, se le arma su propio chip y se inserta en
  orden: así el valor elegido a mano siempre está visible en la misma fila que
  los atajos, en vez de quedar solo en el slider.
*/

import styles from './EventosAnalitica.module.css'

// Por debajo de una semana casi ningún bloque junta muestra suficiente; por
// encima del año el "resumen de lo reciente" deja de serlo.
const DIAS_MINIMOS = 7
const DIAS_MAXIMOS = 365

const PRESETS = [
    { dias: 7, label: '7 d' },
    { dias: 30, label: '30 d' },
    { dias: 90, label: '90 d' },
    { dias: 365, label: '1 año' },
]

export const PresetsDeVentana = ({ dias, onCambio }) => {
    const estaEnPresets = PRESETS.some(p => p.dias === dias)

    const chips = estaEnPresets
        ? PRESETS
        : [...PRESETS, { dias, label: `${dias} d` }].sort((a, b) => a.dias - b.dias)

    return (
        <div className={styles.chipGrupo}>
            {chips.map(({ dias: valor, label }) => (
                <button
                    key={valor}
                    type='button'
                    className={`${styles.chip} ${dias === valor ? styles.chipActivo : ''}`}
                    onClick={() => onCambio(valor)}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}

export const AjusteDeVentana = ({ dias, onCambio }) => {
    // El relleno del riel se dibuja con un degradado duro: un input de rango no
    // expone la parte recorrida, y una barra aparte detrás del control se
    // desalinea con el pulgar en cuanto cambian los topes.
    const recorrido = (dias - DIAS_MINIMOS) / (DIAS_MAXIMOS - DIAS_MINIMOS)

    return (
        <label className={styles.slider}>
            <span className={styles.sliderEtiqueta}>Ajuste fino</span>
            <input
                type='range'
                min={DIAS_MINIMOS}
                max={DIAS_MAXIMOS}
                value={dias}
                aria-label='Ajuste fino de la ventana, en días'
                onChange={(e) => onCambio(Number(e.target.value))}
                style={{ '--recorrido': `${recorrido * 100}%` }}
            />
        </label>
    )
}
