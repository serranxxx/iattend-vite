import React from 'react'
import { Login } from '../components/Auth/Login'
import { HeaderBuild } from '../modules/Header/Header'
import { FooterApp } from '../modules/Footer/FooterApp'
import { Layout } from 'antd'


export const LoginPage = () => {
    return (
        <div className='invitations-page-main-container'>

            <Layout
                style={{
                    position: 'relative', width: '100%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: '#FFF', minHeight:'auto', marginTop:'160px',
                    
                    // height: '100vh'
                }}>
                <HeaderBuild position={'invitations'} isVisible={true} />
                <Login />
                
            </Layout>
            <FooterApp></FooterApp>
        </div>
    )
}
