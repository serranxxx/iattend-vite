import { DynamicIcon } from 'lucide-react/dynamic'
import { iconsItinerary } from '../../helpers/services/menuIcons'

/*
  Ícono de un momento del itinerario de un Flash. Dos catálogos:
  · número: los clásicos del itinerario de la invitación (iconsItinerary).
  · "lucide:<nombre>": cualquier ícono de Lucide, cargado bajo demanda con
    DynamicIcon (así no se meten los ~1,600 al bundle).
  Contraparte en iattend-events: IconoMomento en components/SideEvent.
*/

export const PREFIJO_LUCIDE = 'lucide:'

// Sin ícono (o uno que ya no existe): un punto, no el "?" genérico de antes.
const Punto = ({ size }) => (
    <span style={{ width: Math.round(size / 3), height: Math.round(size / 3), borderRadius: '50%', background: 'currentColor', display: 'block' }} />
)

export const IconoMomento = ({ icon, size = 18 }) => {
    if (typeof icon === 'string' && icon.startsWith(PREFIJO_LUCIDE)) {
        return <DynamicIcon name={icon.slice(PREFIJO_LUCIDE.length)} size={size} fallback={() => <Punto size={size} />} />
    }
    const Clasico = iconsItinerary.find(i => i.index === icon)?.value
    return Clasico ? <Clasico size={size} /> : <Punto size={size} />
}
