import React, { useContext } from 'react'
import { darker, lighter } from '../../helpers/functions'
import { appContext } from '../../context/AuthContext'
import {  Separador } from '../../components/invitation/Logos'


export const Generals = ({ content }) => {

    const { theme, font } = useContext(appContext)

    const MainColor = "#000000"

    return (

        <div style={{
            display: 'flex', alignItems: 'center',
            justifyContent: 'flex-start', width: '100%', height: '89vh',
            overflow: 'hidden', flexDirection: 'column',
            backgroundColor: theme ? lighter(MainColor, 0.9) : `${darker(MainColor, 0.6)}`,
        }}>

            <div style={{
                width: '80%',
                marginTop: '5vh',
            }}>
                <h1 style={{
                    color: theme ? darker(MainColor, 0.4) : `${lighter(MainColor, 0.5)}`, width: '100%',
                    textAlign: 'center', fontSize: `5em`, wordBreak: 'break-word',
                    opacity: `${content.opacity}`, fontFamily: font, fontWeight: 800,
                    // content.fontWeight,
                    margin: '30px 0'
                }}>Lorem ipsum</h1>
            </div>


            <p
                style={{
                    margin: `10px 0 30px 0`,
                    color: theme ? darker(MainColor, 0.4) : lighter(MainColor, 0.5), fontFamily: font
                }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam purus turpis, aliquet id dapibus sed.</p>

            <Separador MainColor={MainColor} width={'100%'} />

            <p
                style={{
                    margin: `30px 0 10px 0`,
                    color: theme ? darker(MainColor, 0.4) : lighter(MainColor, 0.5), fontFamily: font
                }}>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam purus turpis, aliquet id dapibus sed.</p>



        </div>

    )
}
