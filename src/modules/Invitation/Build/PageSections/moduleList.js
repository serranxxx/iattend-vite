import {
    BookUser, Camera, Feather, Gift, HeartHandshake,
    MapPinned, MessageSquareHeart, ScrollText, Shirt,
} from 'lucide-react'

// id de `generals.positions` → sección del editor, llave del módulo en la
// invitación (para saber si está activo) e icono (los del menú de módulos).
export const MODULES = {
    1: { type: 'greeting', key: 'greeting', Icon: HeartHandshake },
    2: { type: 'family', key: 'people', Icon: BookUser },
    3: { type: 'quote', key: 'quote', Icon: Feather },
    4: { type: 'itinerary', key: 'itinerary', Icon: ScrollText },
    5: { type: 'dresscode', key: 'dresscode', Icon: Shirt },
    6: { type: 'gifts', key: 'gifts', Icon: Gift },
    7: { type: 'destinations', key: 'destinations', Icon: MapPinned },
    8: { type: 'notices', key: 'notices', Icon: MessageSquareHeart },
    9: { type: 'gallery', key: 'gallery', Icon: Camera },
}
