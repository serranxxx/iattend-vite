import { useContext, useState } from 'react'
import { message, Modal } from 'antd'
import { Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { supabase } from '../../lib/supabase'
import { appContext } from '../../context'
import logoBlue from '/images/logo_blue.png'

const CONTEXT_COPY = {
    save:    { title: 'Guarda tus cambios',       sub: 'Crea una cuenta gratuita y tus cambios estarán listos cuando quieras publicar.' },
    publish: { title: 'Publica tu invitación',    sub: 'Crea tu cuenta para elegir un plan y poner tu invitación en línea.' },
}

export const AuthModal = ({ open, onClose, onSuccess, context = 'save' }) => {
    const { login } = useContext(appContext)
    const [mode, setMode]               = useState('register') // 'login' | 'register'
    const [name, setName]               = useState('')
    const [email, setEmail]             = useState('')
    const [password, setPassword]       = useState('')
    const [showPass, setShowPass]       = useState(false)
    const [messageApi, contextHolder]   = message.useMessage()

    const copy = CONTEXT_COPY[context] ?? CONTEXT_COPY.save

    const reset = () => { setName(''); setEmail(''); setPassword('') }

    const switchMode = () => { setMode(m => m === 'login' ? 'register' : 'login'); reset() }

    /* ── Get profile & set context ── */
    const getUser = async (id) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name, role, user_email')
            .eq('user_id', id)
            .maybeSingle()
        if (error || !data) return
        login({ name: data.full_name, uid: id, role: data.role, email: data.user_email })
        onSuccess?.()
        onClose?.()
    }

    /* ── Login ── */
    const handleLogin = async () => {
        if (!email || !password) return messageApi.error('Ingresa tu correo y contraseña.')
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return messageApi.error('Correo o contraseña incorrectos.')
        getUser(data.user?.id)
    }

    /* ── Register ── */
    const handleRegister = async () => {
        if (!name || !email || !password) return messageApi.error('Completa todos los campos.')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return messageApi.error('Correo inválido.')
        if (password.length < 6) return messageApi.error('La contraseña debe tener al menos 6 caracteres.')
        try {
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/create-user`,
                { Name: name, Email: email, Password: password }
            )
            if (data.ok) {
                messageApi.success('¡Cuenta creada! Inicia sesión.')
                setMode('login')
                reset()
            }
        } catch (err) {
            const msg = err.response?.data?.msg
            messageApi.warning(msg || 'Error al crear la cuenta.')
        }
    }

    /* ── OAuth ── */
    const handleGoogle = () => supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/invitations` },
    })

    const handleApple = () => supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: { redirectTo: `${window.location.origin}/invitations` },
    })

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            centered
            closeIcon={false}
            width={420}
            styles={{ body: { padding: 0 } }}
        >
            {contextHolder}
            <div className='am-modal'>

                {/* Header */}
                <div className='am-header'>
                    <img src={logoBlue} alt='I attend' className='am-logo' />
                    <h2 className='am-title'>{copy.title}</h2>
                    <p className='am-sub'>{copy.sub}</p>
                </div>

                {/* Body */}
                <div className='am-body'>
                    

                    <button className='am-oauth-btn' onClick={handleGoogle}>
                        <svg viewBox="0 0 24 24" width="17" height="17">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continuar con Google
                    </button>

                    <button className='am-oauth-btn' onClick={handleApple}>
                        <svg viewBox="0 0 814 1000" width="15" height="15" fill="currentColor">
                            <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-166.7-108.8C72.5 727.2 0 607.9 0 494.2 0 279.4 163.7 155.5 325.4 155.5c75.3 0 137.8 49.1 184.5 49.1 44.5 0 115.1-52.4 196.6-52.4zm-90.7-218.3c35.4-41.8 61.2-99.1 61.2-156.4 0-8-1.3-16-2.6-22.4-58.1 2.2-127.3 38.8-168.6 83.9-31.8 35.8-61.8 93.1-61.8 151.5 0 8.7 1.3 17.4 2 20.1 3.3.6 8.7 1.3 14 1.3 52.2 0 116.1-35.1 156-77.9z"/>
                        </svg>
                        Continuar con Apple
                    </button>

                    <div className='am-divider'><span>o continúa con</span></div>

                    
{mode === 'register' && (
                        <input
                            className='am-input'
                            placeholder='Tu nombre'
                            value={name}
                            onChange={e => setName(e.target.value)}
                        />
                    )}
                    <input
                        className='am-input'
                        type='email'
                        placeholder='correo@ejemplo.com'
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <div className='am-password-wrap'>
                        <input
                            className='am-input'
                            type={showPass ? 'text' : 'password'}
                            placeholder='Contraseña'
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? handleLogin() : handleRegister())}
                        />
                        <button type='button' className='am-eye-btn' onClick={() => setShowPass(v => !v)}>
                            {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>

                    <button className='am-submit-btn' onClick={mode === 'login' ? handleLogin : handleRegister}>
                        {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                    </button>

                     <p className='am-toggle'>
                        {mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
                        {' '}
                        <span className='am-toggle-link' onClick={switchMode}>
                            {mode === 'login' ? 'Regístrate' : 'Inicia sesión'}
                        </span>
                    </p>
                   
                </div>

            </div>
        </Modal>
    )
}
