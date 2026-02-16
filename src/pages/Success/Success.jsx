import React from 'react'
import './success.css'
import { Button } from 'antd'
import { Link } from 'react-router-dom'

export const Success = () => {
    return (
        <div className='success_cont'>
            <img src='/images/loop2.svg' alt='' className='loop_1' />
            <div className='succes_row'>
                <img src='/images/coin.svg' alt='' style={{
                    width: '200px',
                }} />
                <span style={{ maxWidth: '50%', }}>Haz agregado créditos exitosamente</span>
            </div>
{/* 
            <Link to=""> */}
                {/* <Button style={{
                    fontSize: '44px', height: 'auto',
                    padding: '12px 44px'
                }} className='primarybutton--active'>Regresar</Button> */}
            {/* </Link> */}

        </div>
    )
}
