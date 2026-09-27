import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// Slides del onboarding wizard (tabla `onboarding_slides`, editable en
// Admin → Onboarding). Cada slide trae sus textos y un `kind` que elige la demo
// interactiva que se pinta a la izquierda. Ver
// iattend--backend/migrations/2026-09-27_create_onboarding_slides.sql.

// Tipos de slide: la demo que pinta cada uno y si tiene botón de acción.
export const SLIDE_KINDS = [
    { key: 'invitation', label: 'Editor de invitación', hasCta: false },
    { key: 'save_the_date', label: 'Save the Date', hasCta: false },
    { key: 'guests', label: 'Lista de invitados', hasCta: false },
    { key: 'rsvp', label: 'Confirmaciones', hasCta: true },
    { key: 'passes', label: 'Pases digitales', hasCta: false },
    { key: 'seating', label: 'Seating chart', hasCta: false },
    { key: 'side_events', label: 'Side events', hasCta: false },
    { key: 'photo_wall', label: 'Photo Wall', hasCta: true },
    { key: 'lia', label: 'Lia', hasCta: false },
    { key: 'image', label: 'Imagen (sin demo)', hasCta: false },
]

export const kindInfo = (kind) => SLIDE_KINDS.find(k => k.key === kind) ?? SLIDE_KINDS[SLIDE_KINDS.length - 1]

export const DEFAULT_STD_URL = 'https://www.iattend.events/save-the-date/07147a8b-aee8-4de4-9270-cfe2255e8899'

const PUBLIC = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public'
export const DEFAULT_WALL_PHOTOS = [
    `${PUBLIC}/landing/wall-1.jpg`,
    `${PUBLIC}/assets/Covers/cover_1.jpg`,
    `${PUBLIC}/landing/dinner.jpg`,
    `${PUBLIC}/landing/wall-2.jpg`,
    `${PUBLIC}/assets/Covers/cover_3.jpg`,
    `${PUBLIC}/assets/Covers/cover_10.jpg`,
    `${PUBLIC}/assets/Covers/cover_2.jpg`,
    `${PUBLIC}/assets/Covers/cover_9.jpg`,
    `${PUBLIC}/assets/Covers/cover_8.jpg`,
]

// Respaldo si la tabla no responde (o la migración aún no se corre): los
// mismos textos que siembra la migración. La fuente real es la tabla.
export const DEFAULT_SLIDES = [
    {
        id: 'default-invitation', kind: 'invitation', eyebrow: 'Empecemos', title: 'Conoce I attend', subtitle: null,
        config: { invitation_id: '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d' },
        description: 'Dale vida a tu invitación en segundos. Cambia fotos, colores y textos, y observa la magia suceder aquí mismo —sin saber de diseño.',
    },
    {
        id: 'default-save-the-date', kind: 'save_the_date', eyebrow: 'Antes que nada', title: 'Save the Date', subtitle: 'que aparten la fecha desde el día uno.',
        description: 'Avisa a tus invitados meses antes, aunque todavía no tengas todos los detalles. Lo reciben en su celular, lo guardan en su calendario y te dejan su reacción.',
        description_mobile: 'Avisa a tus invitados meses antes y deja que te respondan con una reacción.',
        config: { url: DEFAULT_STD_URL },
    },
    {
        id: 'default-guests', kind: 'guests', eyebrow: 'Sin hojas de cálculo', title: 'Crea tu lista de invitados', subtitle: 'y envía la invitación en automático.',
        description: 'Olvídate de las hojas de Excel y de escribir mensajes uno por uno. Organiza a tus invitados aquí y envía su invitación con un solo clic —por WhatsApp, sin arriesgar tu número personal.',
    },
    {
        id: 'default-rsvp', kind: 'rsvp', eyebrow: 'En tiempo real', title: 'Mira las confirmaciones llegar', subtitle: 'sin preguntarle a nadie.',
        description: 'Cada invitado confirma desde su invitación —tú solo ves los números moverse. Confirmados, pendientes y cancelados, siempre al día, sin revisar la plataforma a cada rato.',
        description_mobile: 'Cada invitado confirma desde su invitación —tú solo ves los números moverse, sin revisar la plataforma a cada rato.',
        cta_label: 'Confirmar un invitado',
    },
    {
        id: 'default-passes', kind: 'passes', eyebrow: 'Sin boletos físicos', title: 'Un pase digital para cada invitado', subtitle: 'para que nada falle el día del evento.',
        description: 'Olvídate de las listas impresas en la entrada. Cada invitado lleva su pase con código QR directo desde su celular —compatible con Apple Wallet, y siempre actualizado si algo cambia.',
        exclusive_plan: 'pro',
    },
    {
        id: 'default-seating', kind: 'seating', eyebrow: 'Arrastra y acomoda', title: 'Que el seating chart no te quite el sueño', subtitle: 'acomoda mesas y sillas como quieras.',
        description: 'Diseña el plano de tu salón, agrega mesas de cualquier forma y asigna a cada invitado con solo arrastrarlo. Ve en tiempo real cuántos lugares tienes ocupados y cuántos te faltan por llenar.',
        description_mobile: 'Diseña el plano de tu salón y asigna a cada invitado con solo arrastrarlo.',
    },
    {
        id: 'default-side-events', kind: 'side_events', eyebrow: 'Más que un solo día', title: 'Conoce los side events', subtitle: 'despedida, tornaboda, brunch —cada uno con su propia invitación.',
        description: 'Crea una invitación distinta para cada evento alrededor de tu boda, con su propio dress code, ubicación y confirmación. Tus invitados solo ven los eventos a los que fueron invitados.',
        description_mobile: 'Crea una invitación distinta para cada evento alrededor de tu boda, con su propio dress code y confirmación.',
        exclusive_plan: 'pro',
    },
    {
        id: 'default-photo-wall', kind: 'photo_wall', eyebrow: 'Todos los ángulos', title: 'Photo Wall', subtitle: 'las fotos de tus invitados, en vivo.',
        description: 'Tus invitados suben sus fotos desde el celular y aparecen al instante en un muro compartido. Todos los momentos de la fiesta en un solo lugar, sin perseguir a nadie en el chat del grupo.',
        description_mobile: 'Tus invitados suben sus fotos y aparecen al instante en un muro compartido.',
        cta_label: 'Subir una foto',
        exclusive_plan: 'pro',
        config: { photos: DEFAULT_WALL_PHOTOS },
    },
    {
        id: 'default-lia', kind: 'lia', eyebrow: 'Tu copiloto de boda', title: 'Conoce a Lia', subtitle: 'tu asistente con el contexto completo de tu evento.',
        description: 'Pregúntale lo que quieras —dress code, horarios, confirmaciones, logística— y responde al instante con la información real de tu invitación. Siempre disponible, sin buscar entre pestañas.',
        description_mobile: 'Pregúntale lo que quieras —dress code, horarios, logística— y responde al instante con la información real de tu invitación.',
        exclusive_plan: 'pro',
    },
]

// Una sola petición compartida por las pantallas que montan el wizard.
let pedido = null

const cargarSlides = () => {
    if (!pedido) {
        pedido = supabase
            .from('onboarding_slides')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
            .then(({ data, error }) => {
                if (error) throw error
                return data?.length ? data : DEFAULT_SLIDES
            })
            .catch(error => {
                console.error('Error al obtener onboarding_slides, se usan los de respaldo:', error)
                pedido = null
                return DEFAULT_SLIDES
            })
    }
    return pedido
}

// El admin la llama al guardar para que el wizard no siga con la versión vieja.
export const invalidarSlides = () => { pedido = null }

export const useOnboardingSlides = () => {
    const [slides, setSlides] = useState(DEFAULT_SLIDES)

    useEffect(() => {
        let vivo = true
        cargarSlides().then(data => { if (vivo) setSlides(data) })
        return () => { vivo = false }
    }, [])

    return slides
}
