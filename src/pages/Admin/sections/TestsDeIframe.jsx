/*
  Laboratorio → Tests.

  Un banco de pruebas para contestar una sola pregunta: ¿qué sitios se dejan
  meter en un iframe dentro de una invitación? Spotify sí, Instagram no, y la
  única forma de saberlo de un sitio nuevo es intentarlo.

  Va dentro del marco del teléfono de `BuildContent` a propósito: un iframe en
  un div suelto no dice nada. Ahí se ve con el ancho real, con el scroll real y
  con el mismo alrededor que tendría en la invitación.

  Sobre detectar el bloqueo: no se puede, y por eso aquí no hay veredicto
  automático. Cuando el sitio manda `X-Frame-Options: DENY` o un
  `frame-ancestors` que nos excluye, el navegador igual dispara el `load` del
  iframe —sólo que con el marco vacío— y desde fuera queda idéntico a una carga
  buena: `contentDocument` es `null` y todo lo demás tira `SecurityError`, lo
  mismo que con cualquier origen cruzado que sí cargó. Comprobado con Instagram.

  Así que el estado dice lo único que sí sabemos —si respondió o no— y quien
  mira la pantalla pone el veredicto: si el teléfono se ve en blanco, el sitio
  lo bloqueó. El único dato duro del navegador está en la consola
  ("Refused to display … in a frame"), que la página no puede leer.
*/

import { useEffect, useRef, useState } from 'react'
import { BuildContent } from '../../../modules/Invitation/Build/PageSections/BuildContent'
// El marco del teléfono vive en esta hoja. Sin importarla, `BuildContent`
// dibuja el chrome como texto suelto: el laboratorio no está dentro del
// builder, que es quien normalmente la carga.
import '../../../modules/Invitation/Build/PageSections/build-invitation.css'
import { CapaInvitacion } from './CapaInvitacion'
import styles from './LaboratorioSection.module.css'

// Margen antes de dar por bloqueado un sitio que no carga. Generoso a
// propósito: una página lenta no es una página bloqueada.
const ESPERA_MS = 6000

// Sitios de los que ya sabemos la respuesta. Sirven de referencia para no
// confundir "este sitio bloquea" con "el laboratorio está roto".
const CONOCIDOS = [
    { label: 'Spotify', url: 'https://open.spotify.com/embed/album/4aawyAB9vmqN3uQ7FjRGTy' },
    { label: 'YouTube', url: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
    { label: 'Google Maps', url: 'https://maps.google.com/maps?q=Chihuahua&output=embed' },
    { label: 'Instagram', url: 'https://www.instagram.com/' },
]

const conProtocolo = (valor) => {
    const limpio = valor.trim()
    if (!limpio) return ''
    return /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`
}

export const TestsDeIframe = () => {
    const [entrada, setEntrada] = useState('')
    const [url, setUrl] = useState('')
    // Contador de intentos. Va en la `key` del iframe para forzar el remontaje
    // al reprobar la misma URL; ensuciarla con un `#timestamp` habría cambiado
    // justo lo que se está midiendo, y hay sitios que enrutan por hash.
    const [intento, setIntento] = useState(0)
    const [estado, setEstado] = useState('vacio')
    const [device, setDevice] = useState('ios')
    const [onHide, setOnHide] = useState(false)
    const [positionY, setPositionY] = useState(0)

    const temporizador = useRef(null)

    useEffect(() => () => clearTimeout(temporizador.current), [])

    const probar = (destino) => {
        const limpio = conProtocolo(destino)
        if (!limpio) return

        clearTimeout(temporizador.current)

        setEntrada(limpio)
        setUrl(limpio)
        setIntento(n => n + 1)
        setEstado('cargando')

        temporizador.current = setTimeout(() => {
            setEstado(actual => (actual === 'cargando' ? 'sinRespuesta' : actual))
        }, ESPERA_MS)
    }

    const alCargar = () => {
        clearTimeout(temporizador.current)
        setEstado('respondio')
    }

    const AVISO = {
        vacio: null,
        cargando: { texto: 'Probando…', tono: null },
        respondio: {
            texto: 'Respondió. Mira el teléfono: si ves el sitio, sí se deja embeber; si quedó en blanco, lo bloqueó.',
            tono: null,
        },
        sinRespuesta: {
            texto: `Sin respuesta en ${ESPERA_MS / 1000} s · casi seguro bloquea el iframe`,
            tono: styles.testMal,
        },
    }[estado]

    return (
        <div className={styles.tests}>
            <form
                className={styles.testBarra}
                onSubmit={(e) => { e.preventDefault(); probar(entrada) }}
            >
                <input
                    className={styles.testInput}
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    placeholder='https://open.spotify.com/embed/…'
                    aria-label='URL a probar dentro del iframe'
                />
                <button type='submit' className={styles.testProbar} disabled={!entrada.trim()}>
                    Probar
                </button>
            </form>

            <div className={styles.testAtajos}>
                <span className={styles.testAtajosLabel}>De referencia:</span>
                {CONOCIDOS.map(sitio => (
                    <button
                        key={sitio.label}
                        type='button'
                        className={styles.testAtajo}
                        onClick={() => probar(sitio.url)}
                    >
                        {sitio.label}
                    </button>
                ))}
            </div>

            {AVISO && (
                <div className={`${styles.testAviso} ${AVISO.tono ?? ''}`}>
                    {AVISO.texto}
                </div>
            )}

            {url ? (
                <BuildContent
                    minimalControls
                    currentDevice={device}
                    setDevice={setDevice}
                    onHide={onHide}
                    setOnHide={setOnHide}
                    positionY={positionY}
                    setPositionY={setPositionY}
                    pantalla={(
                        // La capa va encima del iframe, no dentro: así se ve si
                        // el sitio embebido tapa o se pelea con los controles
                        // que el invitado sí va a tener.
                        <div className={styles.testPantalla}>
                            <iframe
                                key={`${url}-${intento}`}
                                src={url}
                                title='Sitio en prueba'
                                className={styles.testIframe}
                                onLoad={alCargar}
                                // El sandbox no se pone a propósito: la pregunta es
                                // si el sitio se deja embeber tal cual, y añadirlo
                                // cambiaría justo lo que se está midiendo.
                                referrerPolicy='no-referrer-when-downgrade'
                            />
                            <CapaInvitacion />
                        </div>
                    )}
                />
            ) : (
                <div className={styles.empty}>
                    Escribe una URL y pulsa Probar para verla dentro del teléfono.
                </div>
            )}
        </div>
    )
}
