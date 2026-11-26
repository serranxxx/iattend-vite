import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import polaroid1 from '../../assets/pops-azul/col-polaroid-1.webp'
import polaroid3 from '../../assets/pops-azul/col-polaroid-3.webp'
import objeto1 from '../../assets/pops-azul/col-obj-1.webp'
import tijeras from '../../assets/pops-azul/tijeras-recorte.png'
import explosion from '../../assets/pops-stickers/craft/explosion.svg'
import globo from '../../assets/pops-stickers/craft/globo.svg'
import ojos from '../../assets/pops-stickers/craft/ojos.svg'
import corazon from '../../assets/pops-stickers/craft/corazon.svg'
import destello from '../../assets/pops-stickers/craft/destello.svg'
import s from './LoginPops.module.css'

/*
  Login y Crear cuenta de Pops (handoff "Pops — Login y Crear cuenta",
  Collage azul). Lo pinta Login.jsx cuando la URL trae `espacio=pops`
  (correos de acceso de un Pop, landing, editor sin cuenta `/crear-pop`); la
  lógica (Supabase, crear cuenta, Google / Apple, a dónde entra) es la de
  Login.jsx y llega por props. `registro`: Crear cuenta (`?mode=register`).
  Collage solo en escritorio, a los lados del formulario; en el celular, tres
  stickers en las esquinas.
  Cambiar entre Entrar y Crear cuenta lleva transición: el logo se encoge o
  crece, el título entra como recortes que se pegan, el ticket entra como una
  hoja nueva (desde abajo, girando) y la etiqueta del pie rebota. Con `prefers-reduced-motion`, sin animación.
*/

const Logo = ({ chico }) => (
    <span className={s.logo} data-chico={chico || undefined}>
        <span aria-hidden className={s.logoCinta} />
        <span className={s.logoPops}>Pops</span>
        <span className={s.logoBy}>by iattend</span>
    </span>
)

const Google = () => (
    <svg width='18' height='18' viewBox='0 0 48 48' aria-hidden>
        <path fill='#EA4335' d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z' />
        <path fill='#4285F4' d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z' />
        <path fill='#FBBC05' d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z' />
        <path fill='#34A853' d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z' />
    </svg>
)

const Apple = () => (
    <svg width='16' height='18' viewBox='0 0 16 19' fill='currentColor' aria-hidden>
        <path d='M13.2 10c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.8-3.5.8-.7 0-1.8-.8-3-.8C3.7 4.6 2.2 5.5 1.4 7c-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 3 2.4 1.2 0 1.6-.8 3.1-.8 1.4 0 1.8.8 3.1.8 1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7 0 0-2.8-1-2.8-3.9zM10.9 3c.6-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.1 1.8-1 2.9 1.1.1 2.1-.5 2.8-1.3z' />
    </svg>
)

const Campo = ({ etiqueta, error, children }) => (
    <label className={s.campo}>
        <span className={s.etiqueta}>{etiqueta}</span>
        {children}
        {error && <span className={s.error}>{error}</span>}
    </label>
)

// Números de las reglas (marca larga cada 144 px; 72 en el celular).
const NUMEROS = Array.from({ length: 14 }, (_, i) => i + 1)

export const LoginPops = ({
    registro, nombre, correo, contrasena, onNombre, onCorreo, onContrasena,
    onEntrar, onCrear, onGoogle, onApple, onCambiarModo, error,
}) => {
    const { t } = useTranslation()
    const [verContrasena, setVerContrasena] = useState(false)
    const enviar = (e) => {
        e.preventDefault()
        if (registro) onCrear()
        else onEntrar()
    }

    return (
        <div className={s.pagina}>
            {/* Reglas, números y trazos del tablero. */}
            <span aria-hidden className={s.reglaArriba} />
            <span aria-hidden className={s.reglaIzq} />
            <span aria-hidden className={s.reglaDer} />
            <span aria-hidden className={s.numeros}>
                {NUMEROS.map(n => <span key={`a${n}`} className={s.numArriba} style={{ '--n': n }}>{n}</span>)}
                {NUMEROS.map(n => <span key={`i${n}`} className={s.numIzq} style={{ '--n': n }}>{n}</span>)}
                {NUMEROS.map(n => <span key={`d${n}`} className={s.numDer} style={{ '--n': n }}>{n}</span>)}
            </span>
            <span aria-hidden className={s.trazo1} />
            <span aria-hidden className={s.trazo2} />
            <span aria-hidden className={s.circulo} />
            <span aria-hidden className={s.luz} />

            {/* Collage (escritorio): a los lados, nunca detrás del formulario. */}
            <div aria-hidden className={s.collage}>
                <div className={`${s.polaroid} ${s.polaroidIzq}`}>
                    <span className={s.polaroidCinta} />
                    <img src={polaroid1} alt='' />
                    <span>{t('login_pops.cap_posada')}</span>
                </div>
                <img src={objeto1} alt='' className={s.objeto} />
                <img src={explosion} alt='' className={`${s.st} ${s.stExplosion}`} />
                <img src={globo} alt='' className={`${s.st} ${s.stGlobo}`} />
                <span className={s.hechoPorTi}>{t('login_pops.made_by_you')}</span>
                <div className={`${s.polaroid} ${s.polaroidDer}`}>
                    <span className={s.polaroidCinta} />
                    <img src={polaroid3} alt='' />
                    <span>{t('login_pops.cap_cumple')}</span>
                </div>
                <img src={tijeras} alt='' className={s.tijeras} />
                <img src={ojos} alt='' className={`${s.st} ${s.stOjos}`} />
                <img src={corazon} alt='' className={`${s.st} ${s.stCorazon}`} />
                <img src={destello} alt='' className={`${s.st} ${s.stDestello}`} />
            </div>
            {/* Celular: tres stickers en las esquinas. */}
            <div aria-hidden className={s.stickersMovil}>
                <img src={explosion} alt='' className={s.mExplosion} />
                <img src={corazon} alt='' className={s.mCorazon} />
                <img src={destello} alt='' className={s.mDestello} />
            </div>

            <main className={s.columna} data-registro={registro || undefined}>
                <Logo chico={registro} />

                {registro && (
                    <>
                        <h1 className={s.titulo}>
                            <span className={`${s.recorte} ${s.recortePapel}`}>{t('login_pops.title_1')}</span>
                            <span className={`${s.recorte} ${s.recorteLima}`}>{t('login_pops.title_2')}</span>
                        </h1>
                        <p className={s.sub}>{t('login_pops.sub')}</p>
                    </>
                )}

                {/* `key`: cada modo es una hoja nueva (entra con su animación). */}
                <div key={registro ? 'crear' : 'entrar'} className={s.ticketSombra}>
                    <span aria-hidden className={s.ticketCinta} />
                    <form className={s.ticket} onSubmit={enviar} noValidate>
                        <div className={s.ticketCabeza}>
                            <span>{t(registro ? 'login_pops.create_head' : 'login_pops.login_head')}</span>
                            <span className={s.ticketNota}>{t(registro ? 'login_pops.create_note' : 'login_pops.login_note')}</span>
                        </div>

                        {registro && (
                            <Campo etiqueta={t('login_pops.name')}>
                                <input className={s.input} type='text' autoComplete='name' placeholder='Juan Pérez' value={nombre ?? ''} onChange={(e) => onNombre(e.target.value)} />
                            </Campo>
                        )}
                        <Campo etiqueta={t('login_pops.email')}>
                            <input className={s.input} type='email' autoComplete='email' placeholder='juan_perez@gmail.com' value={correo ?? ''} onChange={(e) => onCorreo(e.target.value)} />
                        </Campo>
                        <Campo etiqueta={t('login_pops.password')} error={error}>
                            <span className={s.inputCaja} data-error={error || undefined}>
                                <input
                                    className={s.inputSolo}
                                    type={verContrasena ? 'text' : 'password'}
                                    autoComplete={registro ? 'new-password' : 'current-password'}
                                    value={contrasena ?? ''}
                                    onChange={(e) => onContrasena(e.target.value)}
                                />
                                <button type='button' className={s.ver} onClick={() => setVerContrasena(v => !v)}>
                                    {t(verContrasena ? 'login_pops.hide' : 'login_pops.show')}
                                </button>
                            </span>
                        </Campo>

                        <button type='submit' className={s.cta}>{t(registro ? 'login_pops.create' : 'login_pops.login')}</button>

                        <div className={s.separador}><span />{t('login_pops.or')}<span /></div>
                        <div className={s.sociales}>
                            <button type='button' className={s.google} onClick={onGoogle}><Google />Google</button>
                            <button type='button' className={s.apple} onClick={onApple}><Apple />Apple</button>
                        </div>
                    </form>
                </div>

                <p key={registro ? 'pie-crear' : 'pie-entrar'} className={s.pie}>
                    {t(registro ? 'login_pops.have_account' : 'login_pops.no_account')}
                    <button type='button' className={s.pieBoton} data-registro={registro || undefined} onClick={() => onCambiarModo(!registro)}>
                        {t(registro ? 'login_pops.go_login' : 'login_pops.go_create')}
                    </button>
                </p>
            </main>
        </div>
    )
}

export default LoginPops
