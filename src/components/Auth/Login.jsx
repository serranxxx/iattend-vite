import { Button, Input, message } from 'antd'
import React, { useContext, useState } from 'react'
import { onNewUser } from '../../services/apiLogin'
import { useInvitation } from '../../hooks/customHook'
import { appContext } from '../../context'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { images } from '../../helpers/assets/images'
import { RiEye2Line, RiEyeCloseLine } from 'react-icons/ri'

export const Login = () => {

    const { operation } = useInvitation()
    const navigate = useNavigate();
    const { login, logged } = useContext(appContext)
    const [createAccount, setCreateAccount] = useState(false)
    const [username, setUsername] = useState(null)
    const [password, setPassword] = useState(null)

    const [newName, setNewName] = useState(null)
    const [newUsername, setNewUsername] = useState(null)
    const [newPassword, setNewPassword] = useState(null)

    const [seePasswrod, setSeePasswrod] = useState(false)

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
                message.error('Por favor escribe un correo electrónico')
            }
            else {
                message.error('Por favor escribe una constraseña')
            }
        }

    }

    const handleCreate = () => {
        if (newName && newUsername && newPassword) {
            onNewUser(operation, newName, newUsername, newPassword)

        } else {
            if (!newName) {
                message.error('Por favor escribe un nombre');
            } else if (!newUsername) {
                message.error('Por favor escribe un correo electrónico');
            } else {
                message.error('Por favor escribe una contraseña');
            }
        }
    }

    // useEffect(() => {
    //     if (response) {
    //         if (response.data.ok) {
    //             switch (response.data.msg) {
    //                 case "User uploaded":
    //                     message.success('¡Nuevo usuario creado!');
    //                     // setUsername(newUsername);
    //                     // setPassword(newPassword);
    //                     // setNewName(null);
    //                     // setNewUsername(null);
    //                     // setNewPassword(null);
    //                     // setCreateAccount(false)
    //                     break;

    //                 case "Valid user":
    //                     localStorage.setItem("user-email", username)
    //                     setUsername(null)
    //                     setPassword(null)

    //                     const token = response.data.data.token
    //                     localStorage.setItem("token", token)
    //                     localStorage.setItem("token-expires", tokenExpires())
    //                     navigate("/invitations")

    //                     const user = {
    //                         name: response.data.data.username,
    //                         uid: response.data.data.uid,
    //                         role: response.data.data.role,
    //                         enterprise: response.data.data.enterprise,
    //                         email: username
    //                     }
    //                     message.success("Sesión iniciada")
    //                     login(user)
    //                     break

    //                 default:
    //                     break;
    //             }


    //         } else {
    //             message.error(response.data.msg)
    //         }

    //     }
    // }, [response])


    return (

        !logged ?
            // !mini ?
            <div className='login-container'>

                {

                    !createAccount ?

                        <>
                            <div className='login-image-container'>
                                <img src={images.decoration_5} alt='' />
                            </div>


                            <div className='login-form-container'>
                                <Input onChange={(e) => setUsername(e.target.value)} value={username} placeholder='Email' className='gc-input-text login-input' />
                                <div className='password-button-container'>
                                    <Input type={!seePasswrod ? 'password' : ''} onChange={(e) => setPassword(e.target.value)} value={password} placeholder='Contraseña' className='gc-input-text login-input' />
                                    <Button
                                        onClick={() => setSeePasswrod(!seePasswrod)} type='ghost' className='see-password-button'
                                        icon={!seePasswrod ? <RiEyeCloseLine size={18} /> : <RiEye2Line size={18} />} />
                                </div>

                                <Button style={{
                                    marginTop: '16px'
                                }} onClick={handleLogin} className='primarybutton--active'>Iniciar Sesión</Button>


                            </div>
                        </>

                        : <>
                            <>
                                <div className='login-image-container'>
                                    <img src={images.login} alt='' />
                                </div>

                                <div className='login-form-container'>
                                    <Input onChange={(e) => setNewName(e.target.value)} value={newName} placeholder='Nombre' className='gc-input-text login-input' />
                                    <Input onChange={(e) => setNewUsername(e.target.value)} value={newUsername} placeholder='Email' className='gc-input-text login-input' />
                                    <div className='password-button-container'>
                                        <Input type={!seePasswrod ? 'password' : ''} onChange={(e) => setNewPassword(e.target.value)} value={newPassword} placeholder='Contraseña' className='gc-input-text login-input' />
                                        <Button
                                            onClick={() => setSeePasswrod(!seePasswrod)} type='ghost' className='see-password-button'
                                            icon={!seePasswrod ? <RiEyeCloseLine size={18} /> : <RiEye2Line size={18} />} />
                                    </div>
                                    <Button onClick={handleCreate} className='primarybutton mt'>Crear cuenta</Button>
                                    <span className={'login-label'}>¿Ya tienes una cuenta? <span onClick={() => setCreateAccount(false)} className={'label-forgot-password'}>Inicia sesión</span></span>

                                </div>
                            </>
                        </>

                }


            </div>

            : <></>


    )
}


