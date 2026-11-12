import { Globe } from 'lucide-react'

// Marca de cada plataforma para el mosaico blanco del widget Acceso (y el
// badge del editor). Gemelo de iattend-events/src/components/SideEvent/Layout/LogoPlataforma.tsx.
// Zoom: el ícono de cámara sobre su azul; Meet: la cámara de cuatro colores;
// YouTube: el botón rojo de play. Otro enlace: un globo.
export const LogoPlataforma = ({ platform, size = 24 }) => {
    if (platform === 'zoom') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Zoom" role="img">
                <rect width="24" height="24" rx="6" fill="#0B5CFF" />
                <path d="M5 8.6c0-.9.7-1.6 1.6-1.6h6.6c.9 0 1.6.7 1.6 1.6v6.8c0 .9-.7 1.6-1.6 1.6H6.6c-.9 0-1.6-.7-1.6-1.6V8.6Z" fill="#fff" />
                <path d="m15.6 10.7 3-2.1c.4-.3.9 0 .9.5v5.8c0 .5-.5.8-.9.5l-3-2.1v-2.6Z" fill="#fff" />
            </svg>
        )
    }
    if (platform === 'meet') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" aria-label="Google Meet" role="img">
                <path d="M13.6 12 15.9 14.6l3.1 2v-9.2l-3.1 2Z" fill="#00832D" />
                <path d="M2.5 16.2v2.7c0 .6.5 1.1 1.1 1.1h2.7l.6-2.1-.6-1.7-1.9-.6Z" fill="#0066DA" />
                <path d="M6.3 4 2.5 7.8l1.9.6 1.9-.6.6-1.9Z" fill="#E94235" />
                <path d="M6.3 7.8H2.5v8.4h3.8Z" fill="#2684FC" />
                <path d="m18.4 5.6-2.5 2V14.6l2.5 2c.4.3.9 0 .9-.5V6.1c0-.5-.6-.8-.9-.5Z" fill="#00AC47" />
                <path d="M13.6 12v4.2H6.3V20h10.1c.6 0 1.1-.5 1.1-1.1v-2.8Z" fill="#00AC47" />
                <path d="M16.4 4H6.3v3.8h7.3V12l3.9-3.2V5.1c0-.6-.5-1.1-1.1-1.1Z" fill="#FFBA00" />
            </svg>
        )
    }
    if (platform === 'youtube') {
        return (
            <svg width={size} height={size} viewBox="0 0 24 24" aria-label="YouTube" role="img">
                <path d="M22.5 7.2a2.8 2.8 0 0 0-2-2C18.8 4.8 12 4.8 12 4.8s-6.8 0-8.5.4a2.8 2.8 0 0 0-2 2C1.1 8.9 1.1 12 1.1 12s0 3.1.4 4.8a2.8 2.8 0 0 0 2 2c1.7.4 8.5.4 8.5.4s6.8 0 8.5-.4a2.8 2.8 0 0 0 2-2c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8Z" fill="#FF0000" />
                <path d="m9.8 15.1 5.7-3.1-5.7-3.1v6.2Z" fill="#fff" />
            </svg>
        )
    }
    return <Globe size={Math.round(size * 0.85)} color="#29262D" aria-hidden />
}

export default LogoPlataforma
