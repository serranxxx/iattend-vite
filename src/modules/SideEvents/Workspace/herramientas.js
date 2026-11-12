import { ClipboardList, CloudUpload, Handshake, Images, Link2, ListOrdered, Palette, PenLine, Shapes, Ticket, Users, Video } from 'lucide-react'

/*
  Herramientas del editor de un side event / Pop: el riel de escritorio
  (SideWorkspace → EditorShell) y el footer del celular (Movil/EditorMovil).
  `pop`: solo en un Pop; `hidden`: sin ícono (se abren al elegir su capa).
  Títulos: side_events.ws_tool_<id> (y _hint).
*/
export const HERRAMIENTAS = [
    { id: 'design', icon: Palette },
    { id: 'elements', icon: Shapes, pop: true },
    { id: 'photos', icon: Images },
    // Dibujar a mano sobre la pieza (handoff "Herramienta Dibujar"): abrirla
    // activa el modo dibujo; cada trazo queda como un elemento "Dibujo".
    { id: 'draw', icon: PenLine, pop: true },
    { id: 'uploads', icon: CloudUpload },
    // Imagen del link (LinkPanel): vista previa en WhatsApp y su imagen,
    // automática (la portada) o propia.
    { id: 'link', icon: Link2, pop: true },
    // Pase digital: simulador del pase de Apple Wallet (Editor/WalletPanel).
    { id: 'wallet', icon: Ticket },
    // Patrocinadores (PatrocinadoresPanel): sin ícono en el riel, como
    // Itinerario; su panel se abre al elegir su capa o su tarjeta en la pieza.
    { id: 'sponsors', icon: Handshake, pop: true, hidden: true },
    // Acceso de un Pop en línea (Acceso/AccesoPanel): sin ícono; se abre al
    // elegir la tarjeta Acceso o la línea "En línea" de la portada.
    { id: 'acceso', icon: Video, pop: true, hidden: true },
    // Itinerario (ItineraryPanel): sin ícono en el riel; se abre al elegir
    // Itinerario en Capas o en la pieza (como Asistentes y Formulario).
    { id: 'itinerary', icon: ListOrdered, pop: true, hidden: true },
    // Lista de asistentes y chat de invitados (InteractionMenu): sin ícono en
    // el riel; se abre solo al elegir Asistentes en Capas o en la pieza.
    { id: 'interaction', icon: Users, pop: true, hidden: true },
    // Formulario (Formularios/FormularioPanel): también sin ícono; se abre al
    // elegir Formulario en Capas o en la pieza.
    { id: 'registration', icon: ClipboardList, pop: true, hidden: true },
]
