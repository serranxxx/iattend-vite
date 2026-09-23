/*
  Capa de invitación para el banco de pruebas del Laboratorio.

  Lo que el invitado ve flotando encima del contenido: el botón de confirmar
  abajo al centro y el ícono de la canción arriba a la izquierda. Sirve para
  contestar la pregunta que el iframe solo no contesta —si un sitio embebido
  tapa, empuja o se pelea con los controles de la invitación—.

  Es una réplica, no el componente real: los de verdad viven en
  `iattend-events` (`InvitationControlBar` y `SongPlayer`) y son de Next, con
  datos del invitado, plan, idioma y audio. Aquí no hay nada de eso, así que
  se copiaron los estilos al pie de la letra y se dejaron los controles
  inertes. Si cambian allá, hay que reflejarlo aquí a mano.

  Diferencia obligada: allá los dos van `position: fixed` porque ocupan la
  ventana entera; aquí van `absolute`, porque `fixed` se escaparía del marco
  del teléfono y aterrizaría en la pantalla del laboratorio.
*/

import { useState } from 'react'
import { Music, VolumeX } from 'lucide-react'
import { ConfirmarPrueba } from './ConfirmarPrueba'
import { COLORES_TEST1, TEXTOS_TEST1 } from './datosTest1'
import styles from './CapaInvitacion.module.css'

export const CapaInvitacion = ({
    // Paleta de `test-1`: `actions` tiñe el fondo del control y `primary`
    // pinta el texto encima, igual que en la invitación real.
    acciones = COLORES_TEST1.actions,
    primario = COLORES_TEST1.primary,
    etiquetaConfirmar = TEXTOS_TEST1.cta,
}) => {
    const [sonando, setSonando] = useState(true)
    const [confirmando, setConfirmando] = useState(false)

    return (
        <>
            <button
                type='button'
                className={styles.cancion}
                onClick={() => setSonando(v => !v)}
                aria-label={sonando ? 'Pausar música' : 'Reproducir música'}
            >
                {sonando ? <Music size={18} /> : <VolumeX size={18} />}
            </button>

            <div
                className={styles.barra}
                style={{ background: `${acciones}70`, borderRadius: '99px' }}
            >
                <button
                    type='button'
                    className={styles.confirmar}
                    style={{ color: primario }}
                    onClick={() => setConfirmando(true)}
                >
                    {etiquetaConfirmar}
                </button>
            </div>

            <ConfirmarPrueba abierto={confirmando} alCerrar={() => setConfirmando(false)} />
        </>
    )
}
