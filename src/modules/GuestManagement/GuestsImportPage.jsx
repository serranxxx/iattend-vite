import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { ImportarInvitados } from './Importar/ImportarInvitados'
import './guests-import.css'

// Página de importación (invitados de la boda). Los side events y los Pops
// importan en un modal dentro de su editor; esta ruta los sigue aceptando
// (`side_events_id` / `pop`) por los links que ya existen.
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

    return (
        <div className="guests-import-page">
            <ImportarInvitados
                invitationId={popId ? null : id}
                sideEventId={sideEventsId}
                esPop={!!popId}
                archivoInicial={location.state?.file ?? null}
                onCerrar={() => navigate(backTo)}
                onListo={() => navigate(backTo)}
            />
        </div>
    )
}

export default GuestsImportPage
