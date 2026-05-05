import { Button, Grid, Input, message } from 'antd'
import React, { useContext, useEffect, useState } from 'react'
import { appContext } from '../../context'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Eye, EyeOff } from 'lucide-react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n'

const { useBreakpoint } = Grid

export const Login = () => {

    const leftStickers = [
        { src: 'calendar.png', size: 155, top: '12%', left: '33%', rot: -14 },
        { src: 'envelope.png', size: 130, top: '32%', left: '7%', rot: 12 },
        { src: 'puzle.png', size: 90, top: '28%', left: '57%', rot: 5 },
        { src: 'headphones.png', size: 165, top: '40%', left: '27%', rot: -9 },
        { src: 'coffee.png', size: 120, top: '30%', left: '73%', rot: -6 },
        { src: 'light.png', size: 145, top: '58%', left: '7%', rot: 11 },
        { src: 'star_mini.png', size: 85, top: '57%', left: '57%', rot: 0 },
        { src: 'plane.png', size: 130, top: '68%', left: '37%', rot: -20 },
        { src: 'notes.png', size: 135, top: '68%', left: '67%', rot: 8 },
        { src: 'star.png', size: 165, top: '78%', left: '7%', rot: 7 },
    ];

    const rightStickers = [
        { src: 'laptop.png', size: 155, top: '12%', right: '34%', rot: 14 },
        { src: 'notebook.png', size: 130, top: '30%', right: '7%', rot: -12 },
        { src: 'pen.png', size: 135, top: '33%', right: '55%', rot: 55 },
        { src: 'phone.png', size: 105, top: '48%', right: '33%', rot: 9 },
        { src: 'heart.png', size: 100, top: '26%', right: '73%', rot: 6 },
        { src: 'rule.png', size: 125, top: '58%', right: '7%', rot: -11 },
        { src: 'tape.png', size: 115, top: '55%', right: '65%', rot: 0 },
        { src: 'camera.png', size: 130, top: '70%', right: '45%', rot: 20 },
        { src: 'clip.png', size: 80, top: '72%', right: '75%', rot: -8 },
        { src: 'glasses.png', size: 165, top: '84%', right: '30%', rot: -7 },
    ];

    const allStickers = [
        // ARRIBA — 10 stickers, más esparcidos
        { src: 'calendar.png', size: 95, top: '8%', left: '8%', rot: -12 },
        { src: 'laptop.png', size: 100, top: '0%', left: '28%', rot: 12 },
        { src: 'puzle.png', size: 60, top: '10%', left: '48%', rot: 5 },
        { src: 'coffee.png', size: 85, top: '2%', left: '65%', rot: -5 },
        { src: 'notebook.png', size: 90, top: '8%', left: '82%', rot: -10 },
        { src: 'envelope.png', size: 85, top: '18%', left: '3%', rot: -40 },
        { src: 'heart.png', size: 65, top: '12%', left: '28%', rot: 6 },
        { src: 'clip.png', size: 50, top: '18%', left: '58%', rot: -6 },
        { src: 'tape.png', size: 80, top: '14%', left: '66%', rot: 8 },
        { src: 'glasses.png', size: 100, top: '18%', left: '28%', rot: -8 },

        // ABAJO — 10 stickers, igual de esparcidos
        { src: 'light.png', size: 100, top: '74%', left: '4%', rot: 10 },
        { src: 'headphones.png', size: 90, top: '84%', left: '28%', rot: -8 },
        { src: 'star.png', size: 110, top: '84%', left: '6%', rot: 6 },
        { src: 'plane.png', size: 85, top: '75%', left: '28%', rot: -18 },
        { src: 'star_mini.png', size: 55, top: '85%', left: '48%', rot: 0 },
        { src: 'notes.png', size: 95, top: '76%', left: '50%', rot: 6 },
        { src: 'pen.png', size: 95, top: '72%', left: '74%', rot: 55 },
        { src: 'phone.png', size: 75, top: '85%', left: '60%', rot: 8 },
        { src: 'rule.png', size: 90, top: '58%', left: '86%', rot: -10 },
        { src: 'camera.png', size: 95, top: '86%', left: '76%', rot: 18 },
    ];

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

    const screens = useBreakpoint()

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

                    <button className='login-lang-toggle' onClick={toggleLanguage}>
                        {t('footer.lang_toggle')}
                    </button>

                    {/* <img src='/images/paper.jpg' alt='' style={{
                    position:'absolute', width:'100%', objectFit:'cover',
                    opacity:0.5, mixBlendMode:'multiply'
                }}/> */}

                    <div className='left_side_stickers stickers-enter'>
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

                    </div>

                    <div className='login-form-container' style={{
                        height: onShowComponentes ? screens.xs ? '523px' : '623px' : screens.xs ? '432px' : '462px',
                        // display: 'none'
                    }}>

                        <div style={{
                            opacity: onCreateAccount ? 0 : 1,
                            display: onShowComponentes ? 'none' : 'flex'
                        }} className='login-image-container'>
                            <img alt='' src="/images/negro-morado.png" />
                        </div>

                        <div className='texts_container' style={{
                            opacity: onCreateAccount ? 1 : 0,
                            display: onShowComponentes ? 'flex' : 'none'
                        }}>
                            <span className='page_title'>{t('login.register_title_part1')} <span className='underline'>{t('login.register_title_keyword')}</span> {t('login.register_title_part2')}</span>
                            <span className='page_subtitle'>{t('login.register_subtitle_part1')} <span className='circle'>{t('login.register_subtitle_keyword')}</span> {t('login.register_subtitle_part2')}</span>
                        </div>

                        <div className='col' style={{
                            opacity: onCreateAccount ? 1 : 0,
                            display: onShowComponentes ? 'flex' : 'none'
                        }}>
                            <small>{t('login.name_label')}</small>
                            <Input
                                className="login_input"
                                value={name}
                                onChange={(e) => setName(e.target.value)} placeholder={t('login.name_placeholder')} />
                        </div>

                        <div className='col'>
                            <small>{t('login.email_label')}</small>
                            <Input
                                className="login_input"
                                onChange={(e) => setUsername(e.target.value)}
                                value={username} placeholder='juan_perez@gmail.com' />
                        </div>

                        <div className='col'>
                            <small>{t('login.password_label')}</small>
                            <Input.Password
                                className="login_input"
                                onChange={(e) => setPassword(e.target.value)}
                                value={password}
                                placeholder="******"
                                iconRender={(visible) => (visible ? <Eye size={14} /> : <EyeOff size={14} />)}
                            />
                        </div>


                        <Button className='login_btn' onClick={onCreateAccount ? handleCreate : handleLogin}>{onShowComponentes ? t('login.btn_register') : t('login.btn_login')}</Button>

                        <span className='login-label'>{onShowComponentes ? t('login.have_account') : t('login.no_account')} <a onClick={() => setOnCreateAccount(!onCreateAccount)} className='label-forgot-password'>{onShowComponentes ? t('login.switch_to_login') : t('login.switch_to_register')}</a></span>


                    </div>

                    <div className='right_side_stickers stickers-enter'>
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
                    </div>


                    <img className='texture_img_top' src="/images/texture_bg.png" alt='' />

                    <img className='texture_img_right' src="/images/texture_bg.png" alt='' />


                </div>
            </>

            : <></>

    )
}


