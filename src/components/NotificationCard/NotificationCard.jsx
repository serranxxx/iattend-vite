import React, { useMemo } from 'react'
import './notification-card.css'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/es'
import { GoArrowRight } from 'react-icons/go'

dayjs.extend(relativeTime)
dayjs.locale('es')

export const NotificationCard = ({ noti, guests = [], refreshPage }) => {
    const formatDate = (date) => {
        const now = dayjs()
        const d = dayjs(date)

        if (!date) return ''

        // Más de 24h → DD/MM/YYYY
        if (now.diff(d, 'hour') >= 24) {
            return d.format('DD/MM/YYYY')
        }

        // Menos de 24h → "hace X minutos"
        return d.fromNow()
    }

    const getCompanions = () => {
        if (!noti?.has_companion) return []
        return guests.filter(g => g.companion_id === noti.id)
    }

    const { mainText, subText, footerText } = useMemo(() => {
        if (!noti) return { mainText: '', subText: '', footerText: '' }

        const { name, state, last_action, last_action_by, has_companion } = noti
        const companions = getCompanions()
        const companionNames = companions.map(c => c.name)
        const dateText = formatDate(noti.last_update_date || noti.created_at)

        let main = ''
        let sub = ''

        // --------------------------------------------------
        // 🟦 REGLA ESPECIAL 1:
        // Si el USUARIO cambia de "creado" → "creado"
        // Mostrar: "Has agregado a X a tu lista de invitados"
        // --------------------------------------------------
        if (last_action_by && last_action === 'creado' && state === 'creado') {
            main = `Has agregado a ${name} a tu lista de invitados`

            if (has_companion && companions.length > 0) {
                sub = `Con ${companions.length} acompañantes: ${companionNames.join(', ')}.`
            }

            return {
                mainText: main,
                subText: sub.trim(),
                footerText: dateText,
            }
        }

        // --------------------------------------------------
        // 🟦 REGLA ESPECIAL 2 (NUEVA):
        // Si el USUARIO cambia de "creado" → "esperando"
        // Mostrar: "Has enviado la invitación a X, esperando respuesta"
        // --------------------------------------------------
        if (last_action_by && last_action === 'creado' && state === 'esperando') {
            if (has_companion && companions.length > 0) {
                main = `Enviaste la invitación a ${name} y a sus acompañantes ${companionNames.join(', ')}, esperando respuesta`
            } else {
                main = `Enviastela invitación a ${name}, esperando respuesta`
            }

            return {
                mainText: main,
                subText: '',
                footerText: dateText,
            }
        }

        // --------------------------------------------------
        // 🟦 Si EL USUARIO hace el cambio (excepto arriba)
        // --------------------------------------------------
        if (last_action_by) {
            if (has_companion && companions.length > 0) {
                main = `Has editado el estado de ${name} y de sus acompañantes ${companionNames.join(', ')} a ${state}`
            } else {
                main = `Has editado el estado de ${name} a ${state}`
            }
        }

        // --------------------------------------------------
        // 🟨 Si EL INVITADO hace el cambio
        // --------------------------------------------------
        else {
            if (state === 'confirmado' || state === 'rechazado') {
                const isConfirmed = state === 'confirmado'
                main = `${name} ha ${isConfirmed ? 'confirmado' : 'rechazado'} su asistencia`

                if (has_companion && companions.length > 0) {
                    const same = companions.filter(c => c.state === state)
                    if (same.length > 0) {
                        const sameNames = same.map(c => c.name).join(', ')
                        sub = `Sus acompañantes ${sameNames} también han ${isConfirmed ? 'confirmado' : 'rechazado'} su asistencia.`
                    }
                }
            }
            else if (state === 'esperando') {
                main = `${name} aún no ha respondido tu invitación`
            }
            else if (state === 'creado') {
                main = `Has añadido a ${name} a tu lista de invitados`
            }
            else {
                main = `${name} tiene una actualización en su estado`
            }
        }

        return {
            mainText: main,
            subText: sub.trim(),
            footerText: dateText,
        }
    }, [noti, guests])




    return (
        <div className={`card-not card-${noti.state}`}>
            <div className={`status-box state-${noti.state}`}>
                <span>{noti.last_action}</span>
                <GoArrowRight />
                <span>{noti.state}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%'
                }}>
                    <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{noti.last_action_by ? 'Has hecho un cambio' : "Recibiste una actualización"}</span>
                    <div className="card-not-footer">{footerText}</div>
                </div>
                <span className="card-not-main">{mainText}</span>


            </div>


        </div>
    )
}