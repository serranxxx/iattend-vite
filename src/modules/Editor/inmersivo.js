// Transición de entrar / salir del modo inmersivo (EditorShell y LienzoInmersivo).
export const INMERSIVO_MS = 420
export const INMERSIVO_EASE = 'cubic-bezier(0.2, 0.7, 0.2, 1)'
export const reducirMovimiento = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
