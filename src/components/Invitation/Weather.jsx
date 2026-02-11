import React, { useEffect, useState } from 'react'
import { CurrentForecast, } from '../../services/apiWeather'

import {
    TiWeatherCloudy, TiWeatherDownpour, TiWeatherPartlySunny, TiWeatherShower,
    TiWeatherSnow, TiWeatherStormy, TiWeatherSunny, TiWeatherWindy, TiWeatherWindyCloudy
} from "react-icons/ti";
import { Col, } from 'antd';
import {  switchdt } from '../../helpers/functions';
import { useWeather } from '../../hooks/customHook';


const currentIcon = (description, colorPalette, invertedColors) => {
    switch (description) {
        case 'Clear': return <TiWeatherSunny size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Clouds': return <TiWeatherCloudy size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Rain': return <TiWeatherDownpour size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Drizzle': return <TiWeatherShower size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Thunderstorm': return <TiWeatherStormy size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Snow': return <TiWeatherSnow size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Mist': return <TiWeatherPartlySunny size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Haze': return <TiWeatherPartlySunny size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Fog': return <TiWeatherWindyCloudy size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Smoke': return <TiWeatherWindyCloudy size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Sand': return <TiWeatherWindy size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Dust': return <TiWeatherWindy size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        case 'Tornado': return <TiWeatherWindy size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
        default: return <TiWeatherSunny size={22} style={{ color: invertedColors ? colorPalette.primary : colorPalette.accent }} />
    }
}


export const ForecastWeather = ({ cp, MainColor, theme, font, colorPalette, invertedColors }) => {

    const { response, loading, error, operation } = useWeather()
    const [weather, setWeather] = useState([])
    const [onError, setOnError] = useState(false)

    useEffect(() => {
        CurrentForecast(operation, cp, 'mx')
    }, [])

    useEffect(() => {
        if (response) {
            if (response.data.list) {
                const list = response.data.list;
                // Mapear la lista y actualizar el estado una sola vez al final
                const updatedWeather = list.map((item) => ({
                    weather: item.main.temp,
                    time: switchdt(item.dt),
                    icon: currentIcon(item.weather[0].main, colorPalette, invertedColors)
                }));
                setWeather(updatedWeather.slice(0, 5)); // Actualizar el estado con los primeros 5 elementos
                setOnError(false)
            }
        }
    }, [response]);


    return (

        weather.length > 0 &&
        <div style={{
            height: '100%', width: '100%',
            backgroundColor: 'transparent', padding: '5% 8%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
            color: invertedColors ? colorPalette.primary : colorPalette.accent
        }}>
            {
                weather.slice(0, 5).map((item, index) => (
                    <Col
                        key={index}
                        style={{
                            width: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexDirection: 'column', margin: '0 10px',
                        }}>

                        <span style={{
                            textAlign: 'center', fontSize: '0.8em', width: '100%', fontFamily: font,
                            fontWeight: 600, color: invertedColors ? colorPalette.primary : colorPalette.accent, margin: '0 0 5px 0'
                        }}>{item.time}</span>

                        {
                            item.icon
                        }


                        <span style={{
                            fontSize: '1em', fontFamily: font, width: '100%',
                            textAlign: 'center', margin: '5px 0 0 0', color: invertedColors ? colorPalette.primary : colorPalette.accent,
                            fontWeight: 600,
                        }}>{Math.round(item.weather * 10) / 10}°</span>



                    </Col>
                ))
            }



        </div >
    )
}


// https://api.openweathermap.org/data/2.5/weather?zip=31130,MX&units=metric&appid=082be73deb2bcc79d867d128e39dfa2b