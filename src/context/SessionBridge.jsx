import { useContext, useEffect } from 'react'
import axios from 'axios'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { appContext } from './AuthContext'

/**
 * Puente entre la sesión de Supabase y la sesión de la app.
 *
 * El alta con Google/Apple nace directo en Supabase Auth: nadie le creaba el
 * perfil ni el evento en plan free, y al volver del redirect la app no tenía
 * sesión local, así que rebotaba a /login. Esto lo completa una sola vez, al
 * arrancar sin sesión local.
 *
 * No corre si hay un borrador del Save the Date gratis pendiente: ahí el
 * propio flujo se encarga (y si no, se crearían dos invitaciones).
 */
export const SessionBridge = () => {
    const { login } = useContext(appContext)
    const navigate = useNavigate()
    const { pathname } = useLocation()

    useEffect(() => {
        let done = false

        const bootstrap = async (session) => {
            if (done || !session?.user) return
            if (localStorage.getItem('logged')) return
            if (localStorage.getItem('iattend_std_draft')) return
            done = true

            const { user } = session

            try {
                const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/ensure-account`, {
                    userId: user.id,
                    email: user.email ?? '',
                    name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                })

                login({
                    name: data?.profile?.full_name || user.user_metadata?.full_name || '',
                    uid: user.id,
                    role: data?.profile?.role ?? null,
                    email: data?.profile?.user_email || user.email || '',
                })

                // El redirect de OAuth cae en /invitations, que rebota a /login
                // mientras no hay sesión local: ya con ella, se vuelve.
                if (pathname === '/login') navigate('/invitations')
            } catch (error) {
                console.error('No se pudo completar la cuenta:', error)
                done = false
            }
        }

        supabase.auth.getSession().then(({ data }) => bootstrap(data?.session))

        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') bootstrap(session)
        })

        return () => sub?.subscription?.unsubscribe()
    }, [])

    return null
}

export default SessionBridge
