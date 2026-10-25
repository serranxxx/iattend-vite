import { useState } from 'react'
import { Drawer, Grid, Segmented, Select } from 'antd'
import { useTranslation } from 'react-i18next'
import { ArrowRight, MailCheck, Send } from 'lucide-react'
import { Screen, ScreenHeader, StickyFooter, PrimaryButton, Field, TextInput, Hint } from '../../modules/Sales/SalesUi'
import { asignarCliente, asignarClienteFlash } from './plannerEventApi'
import salesStyles from '../../modules/Sales/VendorNewSale.module.css'
import styles from './PlannerEventDrawer.module.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Envía a su cliente un evento (invitación o Evento Flash) que el planner
 * creó "para enviar después" (sin user_id).
 *   Cliente nuevo: con nombre y correo se crea su cuenta, se le asigna el
 *   evento y le llega su usuario y contraseña.
 *   Cliente existente: se elige de `clientes` (los correos de sus eventos de
 *   clientes); solo se le asigna y le llega un aviso de que tiene un evento
 *   nuevo (sin contraseña).
 * Backend: controllers/planner.js → asignarCliente / asignarClienteFlash
 * (resuelve por correo si la cuenta ya existe).
 */
export const PlannerSendDrawer = ({ invitation, clientes = [], onClose, onSent }) => {
    const screens = Grid.useBreakpoint()
    return (
        <Drawer
            open={!!invitation}
            onClose={onClose}
            placement='right'
            width={screens.sm ? 520 : '100%'}
            destroyOnHidden
            closable={false}
            title={null}
            style={{ borderRadius: screens.sm ? '20px 0 0 20px' : 0, overflow: 'hidden' }}
            styles={{ header: { display: 'none' }, body: { padding: 0 } }}
        >
            {invitation && <SendFlow invitation={invitation} clientes={clientes} onClose={onClose} onSent={onSent} />}
        </Drawer>
    )
}

const SendFlow = ({ invitation, clientes, onClose, onSent }) => {
    const { t } = useTranslation()
    // 'nuevo' | 'existente' (solo si ya tiene clientes).
    const [modo, setModo] = useState('nuevo')
    const existente = modo === 'existente'
    const [nombre, setNombre] = useState('')
    const [correo, setCorreo] = useState('')
    const [elegido, setElegido] = useState(null)
    const [enviando, setEnviando] = useState(false)
    const [error, setError] = useState('')
    const [enviado, setEnviado] = useState(null)

    const evento = invitation?.data?.cover?.title?.text?.value || invitation?.name
    const completo = existente ? !!elegido : (!!nombre.trim() && EMAIL_RE.test(correo.trim()))
    const correoFinal = existente ? elegido : correo.trim()

    const enviar = async () => {
        if (enviando || !completo) return
        setError('')
        setEnviando(true)
        try {
            const payload = existente
                ? { correo_cliente: elegido }
                : { correo_cliente: correo.trim(), nombre_cliente: nombre.trim() }
            // Un Evento Flash es un side event: su envío va por otra ruta.
            const { data } = invitation._flash
                ? await asignarClienteFlash(invitation._flash.id, payload)
                : await asignarCliente(invitation.id, payload)
            setEnviado(data)
        } catch (err) {
            setError(err.response?.data?.msg || t('planner_event.err_generic'))
        }
        setEnviando(false)
    }

    if (enviado) {
        return (
            <Screen embedded footer={(
                <StickyFooter solid>
                    <PrimaryButton onClick={() => { onSent?.(); onClose() }} iconEnd={<ArrowRight size={18} aria-hidden='true' />}>
                        {t('planner_event.back_to_events')}
                    </PrimaryButton>
                </StickyFooter>
            )}>
                <div className={styles.listo}>
                    <span className={styles.listoIcono}><MailCheck size={28} /></span>
                    <h1 className={styles.listoTitulo}>{t('planner_send.done_title')}</h1>
                    <p className={styles.listoTexto}>
                        {enviado.cliente_existente
                            ? t('planner_send.done_existing', { correo: correoFinal })
                            : t('planner_send.done_new', { correo: correoFinal })}
                    </p>
                </div>
            </Screen>
        )
    }

    return (
        <Screen embedded footer={(
            <StickyFooter solid>
                {error && <p className={salesStyles.error} role='alert'>{error}</p>}
                <PrimaryButton icon={<Send size={18} />} loading={enviando} disabled={!completo} onClick={enviar}>
                    {t(existente ? 'planner_send.submit_existing' : 'planner_send.submit')}
                </PrimaryButton>
            </StickyFooter>
        )}>
            <ScreenHeader title={t('planner_send.title')} onBack={onClose} backLabel={t('planner_event.cancel')} />
            <Hint>{t(existente ? 'planner_send.intro_existing' : 'planner_send.intro', { evento })}</Hint>
            {clientes.length > 0 && (
                <Segmented
                    block
                    value={modo}
                    onChange={setModo}
                    options={[
                        { value: 'nuevo', label: t('planner_send.mode_new') },
                        { value: 'existente', label: t('planner_send.mode_existing') },
                    ]}
                />
            )}
            {existente ? (
                <Field label={t('planner_send.pick_client')} htmlFor='ps-client'>
                    <Select
                        id='ps-client'
                        showSearch
                        size='large'
                        style={{ width: '100%' }}
                        placeholder={t('planner_send.pick_client_placeholder')}
                        value={elegido}
                        onChange={setElegido}
                        optionFilterProp='busqueda'
                        options={clientes.map(c => ({
                            value: c.correo,
                            busqueda: `${c.nombre ?? ''} ${c.correo} ${c.eventos.join(' ')}`,
                            label: (
                                <span className={styles.clienteOpcion}>
                                    <span className={styles.clienteCorreo}>{c.nombre || c.correo}</span>
                                    <span className={styles.clienteEventos}>{c.nombre ? `${c.correo} · ` : ''}{c.eventos.join(' · ')}</span>
                                </span>
                            ),
                        }))}
                    />
                </Field>
            ) : (<>
            <Field label={t('planner_event.client_name')} htmlFor='ps-name'>
                <TextInput id='ps-name' autoComplete='off' value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </Field>
            <Field label={t('planner_event.client_email')} htmlFor='ps-email' hint={<Hint>{t('planner_event.client_email_hint')}</Hint>}>
                <TextInput
                    id='ps-email'
                    type='email'
                    inputMode='email'
                    autoComplete='off'
                    autoCapitalize='none'
                    placeholder='cliente@correo.com'
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                />
            </Field>
            </>)}
        </Screen>
    )
}
