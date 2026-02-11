import { Col, Row } from 'antd';
import React, { useState, useEffect } from 'react';
import { darker, formatDate, lighter } from '../../helpers/assets/functions';

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import Confetti from '../Helpers/Conffeti';
import ConfettiComponent from '../Helpers/Conffeti';

dayjs.extend(utc);
dayjs.extend(timezone);


function Countdown({ targetDate, mainColor, theme, font, dev, colorPalette, color }) {

    const [isToday, setIsToday] = useState(false)
    const [currentColor, setCurrentColor] = useState(null)

    useEffect(() => {
        setCurrentColor(color ? color : mainColor)
    }, [])


    const cleanDate = (dateString) => {
        if (dateString) {
            // Verifica si la cadena de fecha termina con '000Z'
            if (dateString.endsWith("000Z")) {
                // Elimina los últimos 4 caracteres (los 3 ceros y la 'Z')
                return dateString.slice(0, -5);
            }

            // Si no incluye '000Z', la devuelve sin cambios
            return dateString;
        }
    };

    const calculateTimeLeft = () => {
        const now = new Date(); // Fecha actual
        const target = new Date(cleanDate(targetDate)); // Fecha objetivo limpiada

        // Si la fecha objetivo es menor que la fecha actual, retorna todos ceros
        if (target < now) {
            return {
                days: 0,
                hours: 0,
                minutes: 0,
                seconds: 0
            };
        }

        // Si la fecha objetivo es mayor o igual a hoy, realiza el cálculo
        const difference = +target - +now;

        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            };
        }

        return timeLeft;
    };

    const checkIfToday = (targetDate) => {
        const today = new Date();
        const target = new Date(cleanDate(targetDate));

        // Comparar solo el año, mes y día
        return (
            today.getFullYear() === target.getFullYear() &&
            today.getMonth() === target.getMonth() &&
            today.getDate() === target.getDate()
        );
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearTimeout(timer);
    });

    const { days, hours, minutes, seconds } = timeLeft;


    useEffect(() => {
        setIsToday(checkIfToday(targetDate));
    }, [targetDate])



    return (
        <div className="date-container">
            <span className="date-date" style={{ color: !color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color, fontFamily: font }}>
                {formatDate(targetDate)}
            </span>

            {
                isToday ?

                    <span className="date-unit"
                        style={{
                            fontSize: '22px',
                            color: !color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color, fontFamily: font
                        }}>¡Es Hoy!</span>


                    :
                    <>
                        <hr
                            className="date-divider"
                            style={{
                                border: `1px solid ${!color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color}`,
                                color: !color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color
                            }}
                        />
                        <Row className="date-row">
                            {['days', 'hours', 'minutes', 'seconds'].map(unit => (
                                <Col key={unit} className="date-col">
                                    <span className="date-time" style={{ color: !color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color, fontFamily: font }}>
                                        {eval(unit)}
                                    </span>
                                    <span className="date-unit" style={{ color: !color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color, fontFamily: font }}>
                                        {eval(unit) === 1 ? unit.slice(0, -1) : unit}
                                    </span>
                                </Col>
                            ))}
                        </Row>
                    </>
            }

        </div>
    );
}

export function CountdownDev({ targetDate, MainColor, theme, font, dev, colorPalette, color }) {

    const calculateTimeLeft = () => {
        const difference = +new Date(targetDate) - +new Date();
        let timeLeft = {};

        if (difference > 0) {
            timeLeft = {
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60)
            };
        }

        return timeLeft;
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearTimeout(timer);
    });

    const { days, hours, minutes, seconds } = timeLeft;

    return (
        <div className="date-container">
            <p className="date-date" style={{ color: !color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color, fontFamily: font, fontSize: '14px', fontWeight: '600' }}>
                {formatDate(targetDate)}
            </p>
            <hr
                className="date-divider"
                style={{
                    border: `1px solid ${!color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color}`,
                    color: !color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color,
                    margin: '8px 0',
                    height: '1px'
                }}
            />
            <Row className="date-row">
                {['days', 'hours', 'minutes', 'seconds'].map(unit => (
                    <Col key={unit} className="date-col">
                        <p className="date-time" style={{ color: !color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color, fontFamily: font, fontSize: '18px', margin: 0 }}>
                            {eval(unit)}
                        </p>
                        <p className="date-unit" style={{ color: !color ? theme ? lighter(colorPalette.primary, 0.6) : lighter(colorPalette.accent, 0.6) : color, fontFamily: font, fontSize: '12px', margin: 0 }}>
                            {eval(unit) === 1 ? unit.slice(0, -1) : unit}
                        </p>
                    </Col>
                ))}
            </Row>
        </div>
    );
}


export default Countdown;
