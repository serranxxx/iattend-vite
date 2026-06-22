import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { HeaderDashboard } from '../../modules/Header/Header'
import { FooterApp } from '../../modules/Footer/FooterApp'
import { PhotoWall } from '../../components/PhotoWall/PhotoWall'
import { supabase } from '../../lib/supabase'
import { load } from '../../helpers/assets/images'
import './dashboard.css'
import styles from './PhotoWallPage.module.css'

export const PhotoWallPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const id = searchParams.get('id')
    const [invitation, setInvitation] = useState(null)
    const interBubbleRef = useRef(null)

    useEffect(() => {
        if (!id) { navigate('/invitations'); return }
        supabase
            .from('invitations')
            .select('data')
            .eq('id', id)
            .single()
            .then(({ data }) => setInvitation(data?.data ?? null))
    }, [id])

    useEffect(() => {
        const el = interBubbleRef.current
        if (!el) return
        let curX = 0, curY = 0, tgX = 0, tgY = 0, rafId
        const move = () => {
            curX += (tgX - curX) / 20
            curY += (tgY - curY) / 20
            el.style.transform = `translate(${Math.round(curX)}px, ${Math.round(curY)}px)`
            rafId = requestAnimationFrame(move)
        }
        const onMouseMove = (e) => { tgX = e.clientX; tgY = e.clientY }
        window.addEventListener('mousemove', onMouseMove)
        move()
        return () => { window.removeEventListener('mousemove', onMouseMove); cancelAnimationFrame(rafId) }
    }, [invitation])

    if (!invitation) return (
        <div className='build-loading-container'>
            <img alt='' src={load} style={{ width: '200px' }} />
        </div>
    )

    return (
        <div className={styles.page}>
            <HeaderDashboard mode='photowall' invitation={invitation} />

            <div className={styles.body}>
                <div className="gradient-bg">
                    <div className="gradients-container">
                        <div className="g1" />
                        <div className="g2" />
                        <div className="g3" />
                        <div className="g4" />
                        <div className="g5" />
                        <div className="interactive" ref={interBubbleRef} />
                    </div>
                </div>

                <div className={styles.content}>
                    <PhotoWall eventId={id} allowAdmin={true} />
                </div>
            </div>

            <FooterApp />
        </div>
    )
}
