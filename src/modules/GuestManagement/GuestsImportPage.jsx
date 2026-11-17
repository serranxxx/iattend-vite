import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import { supabaseAuthHeaders } from '../../lib/authHeaders'
import { ImportarInvitados } from './Importar/ImportarInvitados'
import './guests-import.css'

// Página de importación (invitados de la boda). Los side events y los Pops
// importan en un modal dentro de su editor; esta ruta los sigue aceptando
// (`side_events_id` / `pop`) por los links que ya existen.
// "De otro evento" (menú Agregar de GuestsPage) llega con `state.modo =
// 'evento'`: abre en la lista de eventos del organizador (sin esta boda).
const GuestsImportPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const location = useLocation()
    const id = searchParams.get('id')
    const popId = searchParams.get('pop')
    const sideEventsId = popId || searchParams.get('side_events_id')
    const backTo = popId
        ? `/dashboard/side?pop=${popId}`
        : sideEventsId ? `/dashboard/side?id=${id}` : `/dashboard/guests?id=${id}`

    // Los otros eventos del organizador con invitados (null = buscando).
    const [eventos, setEventos] = useState(null)
    useEffect(() => {
        let vivo = true
        ;(async () => {
            try {
                const cuerpo = popId ? { side_events_id: popId } : { invitation_id: id, ...(sideEventsId ? { side_events_id: sideEventsId } : {}) }
                const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/guests/import/eventos`, cuerpo, { headers: await supabaseAuthHeaders() })
                if (vivo) setEventos(data?.eventos ?? [])
            } catch {
                if (vivo) setEventos([])
            }
        })()
        return () => { vivo = false }
    }, [id, popId, sideEventsId])

    return (
        <div className="guests-import-page">
            <ImportarInvitados
                invitationId={popId ? null : id}
                sideEventId={sideEventsId}
                esPop={!!popId}
                archivoInicial={location.state?.file ?? null}
                modoInicial={location.state?.modo === 'evento' ? 'evento' : 'archivo'}
                eventos={eventos}
                onCerrar={() => navigate(backTo)}
                onListo={() => navigate(backTo)}
            />
        </div>
    )
}

export default GuestsImportPage
