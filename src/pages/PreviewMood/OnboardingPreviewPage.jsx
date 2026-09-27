import { useEffect, useState } from 'react'
import { OnboardingWizard } from './OnboardingWizard'
import { useOnboardingDemoData } from './useOnboardingDemoData'

// /onboarding-preview: solo el wizard, abierto y sin página detrás. Admin →
// Onboarding la carga en un iframe del tamaño de un celular para ver el wizard
// con su CSS de móvil real (las media queries dependen del ancho de la
// ventana, y el iframe es esa ventana).
//
// Los slides llegan por postMessage desde el admin (mismo origen), para que
// la vista previa enseñe lo que se está editando aunque no esté guardado.
// Sin mensaje, usa los del catálogo como en /checkout.
export const ONBOARDING_PREVIEW_MESSAGE = 'ONBOARDING_PREVIEW_SLIDES'

export const OnboardingPreviewPage = () => {
    const demo = useOnboardingDemoData()
    const [slides, setSlides] = useState(null)
    // "Saltar intro" / "Finalizar" vuelven a empezar: aquí no hay a dónde ir.
    const [vuelta, setVuelta] = useState(0)

    useEffect(() => {
        const alRecibir = (e) => {
            if (e.origin !== window.location.origin) return
            if (e.data?.type === ONBOARDING_PREVIEW_MESSAGE && Array.isArray(e.data.slides)) {
                setSlides(e.data.slides)
            }
        }
        window.addEventListener('message', alRecibir)
        // Avisa que ya puede recibir: el admin reenvía los slides al oír esto.
        window.parent?.postMessage({ type: `${ONBOARDING_PREVIEW_MESSAGE}_READY` }, window.location.origin)
        return () => window.removeEventListener('message', alRecibir)
    }, [])

    return (
        <div style={{ minHeight: '100dvh', background: 'var(--dark-blue-500, #0c171b)' }}>
            <OnboardingWizard
                key={vuelta}
                open={!!demo.invitation}
                onClose={() => setVuelta(v => v + 1)}
                invitation={demo.invitation}
                buttons={demo.buttons}
                invitationID={demo.invitationID}
                slides={slides ?? undefined}
            />
        </div>
    )
}
