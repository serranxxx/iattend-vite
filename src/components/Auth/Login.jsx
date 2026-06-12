import { message } from 'antd'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { appContext } from '../../context'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Eye, EyeOff, Languages } from 'lucide-react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'

const VIDEOS = [
  "https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/hf_20260526_202936_917dc5b6-9089-4b7f-82b0-2e76d8126e5d.mp4",
  "https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/bucket.mp4",
//   "https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/landing/video.mp4",
];


export const Login = () => {

    const [activeIdx, setActiveIdx] = useState(0)
    const videoRefs = useRef([])
    const [showPassword, setShowPassword] = useState(false)

    useEffect(() => {
        const el = videoRefs.current[activeIdx]
        if (!el) return
        el.currentTime = 0
        // Espera a que el video esté listo antes de reproducir
        const tryPlay = () => el.play().catch(() => {})
        if (el.readyState >= 3) {
            tryPlay()
        } else {
            el.addEventListener('canplay', tryPlay, { once: true })
        }
    }, [activeIdx])

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveIdx(prev => (prev + 1) % VIDEOS.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    // const leftStickers = [
    //     { src: 'calendar.png', size: 155, top: '12%', left: '33%', rot: -14 },
    //     { src: 'envelope.png', size: 130, top: '32%', left: '7%', rot: 12 },
    //     { src: 'puzle.png', size: 90, top: '28%', left: '57%', rot: 5 },
    //     { src: 'headphones.png', size: 165, top: '40%', left: '27%', rot: -9 },
    //     { src: 'coffee.png', size: 120, top: '30%', left: '73%', rot: -6 },
    //     { src: 'light.png', size: 145, top: '58%', left: '7%', rot: 11 },
    //     { src: 'star_mini.png', size: 85, top: '57%', left: '57%', rot: 0 },
    //     { src: 'plane.png', size: 130, top: '68%', left: '37%', rot: -20 },
    //     { src: 'notes.png', size: 135, top: '68%', left: '67%', rot: 8 },
    //     { src: 'star.png', size: 165, top: '78%', left: '7%', rot: 7 },
    // ];

    // const rightStickers = [
    //     { src: 'laptop.png', size: 155, top: '12%', right: '34%', rot: 14 },
    //     { src: 'notebook.png', size: 130, top: '30%', right: '7%', rot: -12 },
    //     { src: 'pen.png', size: 135, top: '33%', right: '55%', rot: 55 },
    //     { src: 'phone.png', size: 105, top: '48%', right: '33%', rot: 9 },
    //     { src: 'heart.png', size: 100, top: '26%', right: '73%', rot: 6 },
    //     { src: 'rule.png', size: 125, top: '58%', right: '7%', rot: -11 },
    //     { src: 'tape.png', size: 115, top: '55%', right: '65%', rot: 0 },
    //     { src: 'camera.png', size: 130, top: '70%', right: '45%', rot: 20 },
    //     { src: 'clip.png', size: 80, top: '72%', right: '75%', rot: -8 },
    //     { src: 'glasses.png', size: 165, top: '84%', right: '30%', rot: -7 },
    // ];

    // const allStickers = [
    //     // ARRIBA — 10 stickers, más esparcidos
    //     { src: 'calendar.png', size: 95, top: '8%', left: '8%', rot: -12 },
    //     { src: 'laptop.png', size: 100, top: '0%', left: '28%', rot: 12 },
    //     { src: 'puzle.png', size: 60, top: '10%', left: '48%', rot: 5 },
    //     { src: 'coffee.png', size: 85, top: '2%', left: '65%', rot: -5 },
    //     { src: 'notebook.png', size: 90, top: '8%', left: '82%', rot: -10 },
    //     { src: 'envelope.png', size: 85, top: '18%', left: '3%', rot: -40 },
    //     { src: 'heart.png', size: 65, top: '12%', left: '28%', rot: 6 },
    //     { src: 'clip.png', size: 50, top: '18%', left: '58%', rot: -6 },
    //     { src: 'tape.png', size: 80, top: '14%', left: '66%', rot: 8 },
    //     { src: 'glasses.png', size: 100, top: '18%', left: '28%', rot: -8 },

    //     // ABAJO — 10 stickers, igual de esparcidos
    //     { src: 'light.png', size: 100, top: '74%', left: '4%', rot: 10 },
    //     { src: 'headphones.png', size: 90, top: '84%', left: '28%', rot: -8 },
    //     { src: 'star.png', size: 110, top: '84%', left: '6%', rot: 6 },
    //     { src: 'plane.png', size: 85, top: '75%', left: '28%', rot: -18 },
    //     { src: 'star_mini.png', size: 55, top: '85%', left: '48%', rot: 0 },
    //     { src: 'notes.png', size: 95, top: '76%', left: '50%', rot: 6 },
    //     { src: 'pen.png', size: 95, top: '72%', left: '74%', rot: 55 },
    //     { src: 'phone.png', size: 75, top: '85%', left: '60%', rot: 8 },
    //     { src: 'rule.png', size: 90, top: '58%', left: '86%', rot: -10 },
    //     { src: 'camera.png', size: 95, top: '86%', left: '76%', rot: 18 },
    // ];

    const { t } = useTranslation()

    const toggleLanguage = () => {
        const next = i18n.language === 'es' ? 'en' : 'es'
        localStorage.setItem('lang', next)
        window.location.reload()
    }

    const navigate = useNavigate();
    const { login, logged } = useContext(appContext)
    const [username, setUsername] = useState(null)
    const [password, setPassword] = useState(null)
    const [name, setName] = useState(null)

    const [messageApi, contextHolder] = message.useMessage();

    // const [onCreateAccount, setOnCreateAccount] = useState(false)
    const [onShowComponentes, setOnShowComponentes] = useState(false)

    const [searchParams, setSearchParams] = useSearchParams()
    const onCreateAccount = searchParams.get('mode') === 'register'

    const setOnCreateAccount = (val) => {
        setSearchParams(val ? { mode: 'register' } : {})
    }

    const sbLogin = async () => {
        const email = username
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return console.error('e: ', error.message);
        else {

            getUser(data.user?.id)
        }

    }

    const getUser = async (id) => {
        try {
            const { data, error } = await supabase
                .from("profiles")   // 👈 nombre de tu tabla
                .select("full_name, role, user_email")
                .eq('user_id', id)
                .maybeSingle()

            if (error) {
                console.error("Error al insertar:", error.message);
                return null;
            }

            const user = {
                name: data.full_name,
                uid: id,
                role: data.role,
                email: data.user_email
            }

            login(user)
            navigate("/invitations")

        } catch (err) {
            console.error("Error inesperado:", err);
            return null;
        }

    }

    const handleGoogleLogin = () => {
        supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/invitations` },
        })
    }

    const handleAppleLogin = () => {
        supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: { redirectTo: `${window.location.origin}/invitations` },
        })
    }

    const handleLogin = () => {
        if (username && password) {
            localStorage.clear();
            sbLogin()

        } else {
            if (!username) {
                message.error(t('login.err_email_required'))
            }
            else {
                message.error(t('login.err_password_required'))
            }
        }

    }

    const handleCreate = async () => {

        try {

            // 1️⃣ Validaciones básicas
            if (!name || !username || !password) {
                return messageApi.error(t('login.err_fields_required'))
            }

            // Validación simple de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(username)) {
                return messageApi.error(t('login.err_email_invalid'))
            }

            // Validar password mínima
            if (password.length < 6) {
                return messageApi.error(t('login.err_password_length'))
            }

            // 2️⃣ Petición al backend
            const { data } = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/auth/create-user`,
                // 'http://localhost:4000/api/auth/create-user', // ajusta la ruta si es diferente
                {
                    Name: name,
                    Email: username,
                    Password: password,
                }
            )

            if (data.ok) {
                messageApi.success(t('login.success_created'))
                setOnCreateAccount(false)

            }

        } catch (error) {

            console.log(error);

            if (error.response) {
                // Error que viene del backend
                const backendMessage = error.response.data.msg;

                messageApi.warning(backendMessage || t('login.err_create_user'));
            } else {
                // Error de red o servidor caído
                messageApi.error(t('login.err_connection'));
            }

        }
    }


    useEffect(() => {
        setTimeout(() => {
            setOnShowComponentes(onCreateAccount)
        }, 200);

        if (onCreateAccount) {
            setName(null)
            setPassword(null)
            setUsername(null)
        }


    }, [onCreateAccount])


    return (


        !logged ?

            <>
                {contextHolder}
                <div className='login-container'>

                    {/* Video carousel background */}
                    <div className='login-video-bg'>
                        {VIDEOS.map((src, i) => (
                            <video
                                key={src}
                                ref={el => { videoRefs.current[i] = el }}
                                src={src}
                                muted
                                playsInline
                                className={`login-video${i === activeIdx ? ' login-video--active' : ''}`}
                            />
                        ))}
                        <div className='login-video-overlay' />
                    </div>

                    <button className='login-lang-toggle' onClick={toggleLanguage}>
                        <Languages size={16} />
                        {t('footer.lang_toggle')}
                    </button>

                    {/* <img src='/images/paper.jpg' alt='' style={{
                    position:'absolute', width:'100%', objectFit:'cover',
                    opacity:0.5, mixBlendMode:'multiply'
                }}/> */}

                    {/* <div className='left_side_stickers stickers-enter'>
                        <div className='stickers_cont'>

                            {
                                screens.xs ?
                                    allStickers.map((s, i) => (
                                        <img
                                            key={i}
                                            src={`/images/stickers/${s.src}`}
                                            alt=''
                                            style={{
                                                position: 'absolute',
                                                width: s.size,
                                                top: s.top,
                                                left: s.left,
                                                transform: `rotate(${s.rot}deg)`,
                                            }}
                                        />
                                    ))
                                    :
                                    leftStickers.map((s, i) => (
                                        <img
                                            key={i}
                                            src={`/images/stickers/${s.src}`}
                                            alt=''
                                            style={{
                                                position: 'absolute',
                                                width: s.size,
                                                top: s.top,
                                                left: s.left,
                                                transform: `rotate(${s.rot}deg)`,
                                            }}
                                        />
                                    ))

                            }
                        </div>

                    </div> */}

                    <div className='login-form-container' >

                        <div style={{
                            opacity: onCreateAccount ? 0 : 1,
                            display: onShowComponentes ? 'none' : 'flex'
                        }} className='login-image-container'>
                            <img alt='' src="/images/logo_cover.png" />
                        </div>

                        <div className='texts_container' style={{
                            opacity: onCreateAccount ? 1 : 0,
                            display: onShowComponentes ? 'flex' : 'none'
                        }}>
                            <span className='page_title'>{t('login.register_title_part1')} <span className='underline'>{t('login.register_title_keyword')}</span> {t('login.register_title_part2')}</span>
                            <span className='page_subtitle'>{t('login.register_subtitle_part1')} <span className='page_subtitle'>{t('login.register_subtitle_keyword')}</span> {t('login.register_subtitle_part2')}</span>
                        </div>

                        <div className='col' style={{
                            opacity: onCreateAccount ? 1 : 0,
                            display: onShowComponentes ? 'flex' : 'none'
                        }}>
                            <small className='login-field-label'>{t('login.name_label')}</small>
                            <input
                                className="login_input"
                                value={name ?? ''}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t('login.name_placeholder')}
                            />
                        </div>

                        <div className='col'>
                            <small className='login-field-label'>{t('login.email_label')}</small>
                            <input
                                className="login_input"
                                type="email"
                                onChange={(e) => setUsername(e.target.value)}
                                value={username ?? ''}
                                placeholder='juan_perez@gmail.com'
                            />
                        </div>

                        <div className='col'>
                            <small className='login-field-label'>{t('login.password_label')}</small>
                            <div className='login-password-wrapper'>
                                <input
                                    className="login_input"
                                    type={showPassword ? 'text' : 'password'}
                                    onChange={(e) => setPassword(e.target.value)}
                                    value={password ?? ''}
                                    placeholder="******"
                                />
                                <button
                                    type='button'
                                    className='login-eye-btn'
                                    onClick={() => setShowPassword(v => !v)}
                                >
                                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        <button className='login_btn' onClick={onCreateAccount ? handleCreate : handleLogin}>
                            {onShowComponentes ? t('login.btn_register') : t('login.btn_login')}
                        </button>

                        <div className='login-divider'>
                            <span>o continúa con</span>
                        </div>

                        <div className='login-oauth-row'>
                            <button className='login-oauth-btn' onClick={handleGoogleLogin}>
                                <svg viewBox="0 0 24 24" width="18" height="18">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                                Google
                            </button>
                            <button className='login-oauth-btn' onClick={handleAppleLogin}>
                                <svg viewBox="0 0 814 1000" width="16" height="16" fill="currentColor">
                                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-37.3-166.7-108.8C72.5 727.2 0 607.9 0 494.2 0 279.4 163.7 155.5 325.4 155.5c75.3 0 137.8 49.1 184.5 49.1 44.5 0 115.1-52.4 196.6-52.4zm-90.7-218.3c35.4-41.8 61.2-99.1 61.2-156.4 0-8-1.3-16-2.6-22.4-58.1 2.2-127.3 38.8-168.6 83.9-31.8 35.8-61.8 93.1-61.8 151.5 0 8.7 1.3 17.4 2 20.1 3.3.6 8.7 1.3 14 1.3 52.2 0 116.1-35.1 156-77.9z"/>
                                </svg>
                                Apple
                            </button>
                        </div>

                        <span className='login-label'>{onShowComponentes ? t('login.have_account') : t('login.no_account')} <a onClick={() => setOnCreateAccount(!onCreateAccount)} className='label-forgot-password'>{onShowComponentes ? t('login.switch_to_login') : t('login.switch_to_register')}</a></span>


                    </div>

                    {/* <div className='right_side_stickers stickers-enter'>
                        <div className='stickers_cont'>
                            {rightStickers.map((s, i) => (
                                <img
                                    key={i}
                                    src={`/images/stickers/${s.src}`}
                                    alt=''
                                    style={{
                                        position: 'absolute',
                                        width: s.size,
                                        top: s.top,
                                        right: s.right,
                                        transform: `rotate(${s.rot}deg)`,
                                    }}
                                />
                            ))}
                        </div>
                    </div> */}


                    {/* <img className='texture_img_top' src="/images/texture_bg.png" alt='' />

                    <img className='texture_img_right' src="/images/texture_bg.png" alt='' /> */}


                </div>
            </>

            : <></>

    )
}


