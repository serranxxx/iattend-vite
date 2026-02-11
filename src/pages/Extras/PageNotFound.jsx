import React from 'react'
import { Button } from 'antd'
import { Link } from 'react-router-dom'
import { images } from '../../helpers/assets/images'


export const PageNotFound = () => {
    return (
        <div style={{
            width: '100%', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column'
        }}>
            <div style={{
                width: '100px', height: '50px',
                marginTop: '-20vh'
            }}>
                <img alt='' src={images.eyes} style={{
                    width: '100%', objectFit: 'cover'
                }} />
            </div>
            <span className='try-inv-head' style={{ textAlign: 'center', marginTop: '40px', marginBottom: '10px' }}>Esta pagina no existe</span>
            <Link to="/">
                <Button
                    id="access-button"
                >
                    Regresar
                </Button>
            </Link>
        </div>
    )
}
