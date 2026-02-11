import { Button, Layout, Modal, Popover, Row } from 'antd'
import React, { useState } from 'react'
import { Login } from '../components/Auth/Login'
import { FooterApp } from '../modules/Footer/FooterApp'
import { FaCircleInfo } from 'react-icons/fa6'
import { FaCheck } from 'react-icons/fa'
import { HeaderBuild } from '../modules/Header/Header'
import { all_features } from '../helpers/assets/app-features'

export const FeaturesPage = () => {

    const list_items = [
        'Configuraciones generales',
        'Portada',
        'Mensajes',
        'Itinerario',
        'Dress code',
        'Mesa de regalos',
        'Galería',
        'Administración de invitados'
    ]
    

    const [openLogin, setOpenLogin] = useState(false)

    return (
        <>

            <Layout
                // className='responsive-web'
                style={{
                    position: 'relative',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'var(--ft-color)'
                }}>
                <HeaderBuild position={'pricing'} setOpenLogin={setOpenLogin} isVisible={true} />
                <div className='pricing-main-container'>

                    <div className='pricing-title-subtext-container'>
                        {/* <span className='pricing-title-page'>Conoce el plan perfecto para tu evento</span> */}
                        <span className='pricing-title-page'>Explora las cientos de características disponibles</span>
                        <span className='pricing-sub-text'>Disfruta de todas las características sin importar el plan que elijas. Paga solo por el tiempo que mantengas tu invitación activa y personaliza cada detalle a tu gusto.</span>
                    </div>

                    <div className='pricing-features-conainer'>
                        {
                            list_items.map((item, index) => (
                                <div key={index} style={{
                                    width: '100%',
                                }}>
                                    <div className='prcing-feature-row'>
                                        <span className='pricing-feature-text' style={{
                                            fontWeight: 400
                                        }}>{item}</span>
                                    </div>


                                    {
                                        all_features.map((feature, i) => (
                                            feature.type === item &&
                                            <div key={i} className='prcing-feature-row'>

                                                <Row style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'row'
                                                }}>
                                                    <span className='pricing-feature-text' style={{
                                                        fontWeight: 600
                                                    }}> {feature.bold}</span>
                                                    <Popover content={feature.text} trigger="click" style={{ width: '100px' }} className='pricing-hidde-item'>
                                                        <Button

                                                            icon={<FaCircleInfo style={{ color: 'var(--text-color-50)' }} />}
                                                            type='ghost'
                                                        />
                                                    </Popover>
                                                </Row>

                                                <FaCheck size={18} style={{ marginRight: '15px' }} className='pricing-hidde-item' />
                                            </div>
                                        ))
                                    }
                                </div>
                            ))
                        }

                    </div>

                </div >
                <FooterApp></FooterApp>

                <Modal
                    open={openLogin}
                    onClose={() => setOpenLogin(false)}
                    onCancel={() => setOpenLogin(false)}
                    footer={null} // Opcional: Elimina el footer del modal si no es necesario
                    style={{
                        top: 40,
                        display: 'flex',
                        alignItems: 'center', justifyContent: 'center'
                    }}>
                    <Login position={'land-page'} setOpenLogin={setOpenLogin} />

                </Modal>


            </Layout >

        </>
    )
}
