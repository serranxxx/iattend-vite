import React from 'react'
import { Button } from 'antd'
import { Link } from 'react-router-dom'
import { images } from '../../helpers/assets/images'
import { useTranslation } from 'react-i18next'


export const PageNotFound = () => {
    const { t } = useTranslation()

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
            <span className='try-inv-head' style={{ textAlign: 'center', marginTop: '40px', marginBottom: '10px' }}>
                {t('not_found.title')}
            </span>
            <Link to="/">
                <Button id="access-button">
                    {t('not_found.back')}
                </Button>
            </Link>
        </div>
    )
}
