import { useState } from 'react'
import { Button, Modal } from 'antd'
import { Check, Image, Share2, Shield, ShoppingCart, Star, X } from 'lucide-react'

const KW = ({ children }) => (
    <strong style={{ fontWeight: 600,   }}>{children}</strong>
)

const PLANS = [
    {
        id: 'pro',
        name: 'Plan Pro',
        price: '$3,499',
        period: 'MXN · pago único',
        badge: 'Más popular',
        description: (
            <p className='pm-publish-plan-desc'>
                Una <KW>invitación digital</KW> para que te olvides de impresiones y reimpresiones.
                {' '}Un <KW>gestor de invitados</KW> para alejarte del Excel de 200 filas, sin perseguir a nadie.
                {' '}Y el <KW>acomodo de mesas</KW> para que el seating chart no te quite el sueño.
                {' '}Y un <KW>Side Event</KW> para ese momento que no puede faltar.
            </p>
        ),
        extras: [
            { label: 'Envíos automáticos por WhatsApp', desc: 'Invita a todos en minutos' },
            { label: '2 Side Events adicionales', desc: 'Porque tu boda son muchos momentos' },
            { label: 'Pases digitales + Apple Wallet', desc: 'Para que evites las filas en la entrada.' },
        ],
        features: null,
        note: null,
    },
    {
        id: 'lite',
        name: 'Plan Lite',
        price: '$2,499',
        period: 'MXN · pago único',
        badge: null,
        description: (
            <p className='pm-publish-plan-desc'>
                Una <KW>invitación digital</KW> para que te olvides de impresiones y reimpresiones.
                {' '}Un <KW>gestor de invitados</KW> para alejarte del Excel de 200 filas, sin perseguir a nadie.
                {' '}Y el <KW>acomodo de mesas</KW> para que el seating chart no te quite el sueño.
                {' '}Y un <KW>Side Event</KW> para ese momento que no puede faltar.
            </p>
        ),
        features: null,
        note: null,
    },
]

export const PublishModal = ({ open, onClose, invitation }) => {
    const [selected, setSelected] = useState('pro')
    const plan = PLANS.find(p => p.id === selected)
    const coverImg = invitation?.cover?.image?.dev || invitation?.cover?.image?.prod
    const eventName = invitation?.cover?.title?.text?.value

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width='min(920px, 95vw)'
            centered
            closeIcon={false}
            styles={{ body: { padding: '0px', borderRadius: 36, overflow: 'hidden' } }}
            
        >
            <div className='pm-publish-modal'>

                {/* ── Close ── */}
                <button className='pm-publish-close' onClick={onClose}>
                    <X size={15} strokeWidth={2.5} />
                </button>

                {/* ── Left: plan selection ── */}
                <div className='pm-publish-left'>
                    <h2 className='pm-publish-title'>Elige tu plan</h2>
                    <p className='pm-publish-subtitle'>Una sola compra · tu invitación activa para siempre</p>

                    {PLANS.map(p => (
                        <div
                            key={p.id}
                            className={`pm-publish-plan${selected === p.id ? ' pm-publish-plan--selected' : ''}`}
                            onClick={() => setSelected(p.id)}
                        >
                            {p.badge && (
                                <div className='pm-publish-badge'>
                                    <Star size={11} strokeWidth={2} />
                                    {p.badge}
                                </div>
                            )}

                            <div className='pm-publish-plan-header'>
                                <div className={`pm-publish-radio${selected === p.id ? ' pm-publish-radio--on' : ''}`}>
                                    {selected === p.id && <div className='pm-publish-radio-dot' />}
                                </div>
                                <div className='pm-publish-plan-meta'>
                                    <span className='pm-publish-plan-name'>{p.name}</span>
                                    <span className='pm-publish-plan-price'>
                                        {p.price} <small>{p.period}</small>
                                    </span>
                                </div>
                            </div>

                            <div className='pm-publish-features'>
                                {p.description ?? p.features?.map(([left, right], i) => (
                                    <div key={i} className='pm-publish-feature-row'>
                                        <div className='pm-publish-feature'>
                                            <Check size={13} strokeWidth={2.5} className='pm-check' />
                                            <span>{left}</span>
                                        </div>
                                        <div className='pm-publish-feature'>
                                            <Check size={13} strokeWidth={2.5} className='pm-check' />
                                            <span>{right}</span>
                                        </div>
                                    </div>
                                ))}
                                {p.extras && (
                                    <div className='pm-publish-extras'>
                                        <div className='pm-publish-extras-divider' />
                                        <span className='pm-publish-extras-label'>Y además incluye:</span>
                                        {p.extras.map((ex, i) => (
                                            <p key={i} className='pm-publish-plan-desc' style={{ marginTop: 6 }}>
                                                <KW>{ex.label}</KW>: {ex.desc}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {p.note && <p className='pm-publish-plan-note'>{p.note}</p>}
                        </div>
                    ))}
                </div>

                {/* ── Right: checkout summary ── */}
                <div className='pm-publish-right'>
                    <span className='pm-publish-summary-label'>Estás publicando</span>

                    <div className='pm-publish-event-row'>
                        <div className='pm-publish-event-thumb'>
                            {coverImg
                                ? <img src={coverImg} alt='' />
                                : <Image size={20} color='#aaa' />
                            }
                        </div>
                        <div className='pm-publish-event-info'>
                            <span className='pm-publish-event-name'>{eventName}</span>
                            <span className='pm-publish-event-type'>boda · portada lista</span>
                        </div>
                    </div>

                    <div className='pm-publish-divider' />

                    <div className='pm-publish-price-row'>
                        <span className='pm-publish-plan-label'>{plan?.name}</span>
                        <span className='pm-publish-price-big'>{plan?.price}</span>
                    </div>
                    <span className='pm-publish-price-note'>Pago único · activa para siempre</span>

                    <Button
                        type='primary'
                        block
                        size='large'
                        icon={<ShoppingCart size={15} />}
                        style={{ borderRadius: 14, height: 52, fontSize: 16, fontWeight: 700, marginTop: 8 }}
                    >
                        Comprar
                    </Button>

                    <div className='pm-publish-security'>
                        <Shield size={13} />
                        <span>Pago seguro con Stripe</span>
                    </div>
                </div>

            </div>
        </Modal>
    )
}
