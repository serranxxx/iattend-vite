import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Input } from 'antd'
import { Download, Trash2, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import styles from './PhotoWall.module.css'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'

function secondsSince(date) {
    return Math.floor((Date.now() - new Date(date).getTime()) / 1000)
}

function formatLastUpdated(seconds) {
    if (seconds < 10) return 'justo ahora'
    if (seconds < 60) return `hace ${seconds} segundos`
    const m = Math.floor(seconds / 60)
    if (m === 1) return 'hace 1 minuto'
    return `hace ${m} minutos`
}

function daysUntil(isoDate) {
    if (!isoDate) return null
    const diff = new Date(isoDate).getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export const PhotoWall = ({ eventId, allowAdmin }) => {
    const [photos, setPhotos] = useState([])
    const [lastUpdated, setLastUpdated] = useState(null)
    const [error, setError] = useState(null)
    const [, setTick] = useState(0)
    const [newPhotoIds, setNewPhotoIds] = useState(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [activeGuest, setActiveGuest] = useState(null)

    useEffect(() => {
        if (!eventId) return

        supabase
            .from('event_photos')
            .select('*')
            .eq('event_id', eventId)
            .order('uploaded_at', { ascending: false })
            .then(({ data, error: err }) => {
                if (err) { setError(err.message); return }
                setPhotos(data ?? [])
                setLastUpdated(new Date())
            })

        const channel = supabase
            .channel(`event_photos_${eventId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'event_photos', filter: `event_id=eq.${eventId}` },
                (payload) => {
                    const photo = payload.new
                    setNewPhotoIds(prev => new Set([...prev, photo.id]))
                    setPhotos(prev => [photo, ...prev])
                    setLastUpdated(new Date())
                    setTimeout(() => setNewPhotoIds(prev => {
                        const next = new Set(prev)
                        next.delete(photo.id)
                        return next
                    }), 800)
                }
            )
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [eventId])

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 10000)
        return () => clearInterval(id)
    }, [])

    const guestNames = useMemo(() => {
        const names = [...new Set(photos.map(p => p.guest_name || 'Invitado'))]
        return names.sort()
    }, [photos])

    const daysLeft = useMemo(() => {
        if (!photos.length) return null
        const dates = photos.map(p => p.expires_at).filter(Boolean)
        if (!dates.length) return null
        const earliest = dates.reduce((a, b) => a < b ? a : b)
        return daysUntil(earliest)
    }, [photos])

    const filteredPhotos = useMemo(() => {
        let list = photos
        if (activeGuest) list = list.filter(p => (p.guest_name || 'Invitado') === activeGuest)
        if (searchQuery.trim()) {
            const q = searchQuery.trim().toLowerCase()
            list = list.filter(p => (p.guest_name || 'Invitado').toLowerCase().includes(q))
        }
        return list
    }, [photos, activeGuest, searchQuery])

    const handleDelete = (photo) => {
        Modal.confirm({
            title: 'Eliminar foto',
            content: `¿Eliminar la foto de ${photo.guest_name || 'Invitado'}?`,
            okText: 'Eliminar',
            okButtonProps: { danger: true },
            cancelText: 'Cancelar',
            onOk: async () => {
                await fetch(`${API_URL}/api/photos/${photo.id}`, { method: 'DELETE' })
                setPhotos(prev => prev.filter(p => p.id !== photo.id))
                setLastUpdated(new Date())
            },
        })
    }

    const handleDownload = (photo) => {
        const a = document.createElement('a')
        a.href = photo.public_url
        a.download = `foto-${photo.guest_name || 'invitado'}.jpg`
        a.target = '_blank'
        a.click()
    }

    const elapsed = lastUpdated ? secondsSince(lastUpdated) : null

    return (
        <div className={styles.container}>

            {/* ── Top bar ── */}
            <div className={styles.topBar}>
                <div className={styles.meta}>
                    {daysLeft !== null && (
                        <span className={styles.daysLeft}>
                            {daysLeft} {daysLeft === 1 ? 'día' : 'días'} restantes
                        </span>
                    )}
                    {daysLeft !== null && <span className={styles.dot}>·</span>}
                    <span className={styles.count}>
                        {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
                    </span>
                    {lastUpdated && (
                        <>
                            <span className={styles.dot}>·</span>
                            <span className={styles.updated}>actualizado {formatLastUpdated(elapsed)}</span>
                        </>
                    )}
                </div>
                <Input
                    prefix={<Search size={13} style={{ color: '#aaa' }} />}
                    placeholder="Buscar por nombre"
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setActiveGuest(null) }}
                    className={styles.searchInput}
                    allowClear
                />
            </div>

            {/* ── Guest pills ── */}
            {guestNames.length > 0 && (
                <div className={styles.pillsRow}>
                    <button
                        className={`${styles.pill} ${!activeGuest ? styles.pillActive : ''}`}
                        onClick={() => { setActiveGuest(null); setSearchQuery('') }}
                    >
                        Todos
                    </button>
                    {guestNames.map(name => (
                        <button
                            key={name}
                            className={`${styles.pill} ${activeGuest === name ? styles.pillActive : ''}`}
                            onClick={() => { setActiveGuest(activeGuest === name ? null : name); setSearchQuery('') }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}

            {/* ── Grid / states ── */}
            {error ? (
                <div className={styles.empty} style={{ color: '#ff4d4f' }}>Error al cargar fotos: {error}</div>
            ) : photos.length === 0 ? (
                <div className={styles.emptyState}>
                    <span className={styles.emptyTitle}>Aún no hay fotos</span>
                    <span className={styles.emptyDesc}>
                        El día de tu evento, cada que tus invitados tomen una foto la verás aparecer aquí en tiempo real.
                        Tendrás 30 días para descargarlas antes de que se eliminen automáticamente.
                    </span>
                </div>
            ) : filteredPhotos.length === 0 ? (
                <div className={styles.empty}>
                    Sin resultados para "{activeGuest || searchQuery}"
                </div>
            ) : (
                <div className={styles.grid}>
                    {filteredPhotos.map(photo => (
                        <div
                            key={photo.id}
                            className={`${styles.card} ${newPhotoIds.current?.has(photo.id) ? styles.cardNew : ''}`}
                        >
                            <img
                                src={photo.public_url}
                                alt={photo.guest_name || 'Invitado'}
                                className={styles.image}
                            />
                            <div className={styles.overlay}>
                                <span className={styles.guestName}>{photo.guest_name || 'Invitado'}</span>
                            </div>
                            {allowAdmin && (
                                <div className={styles.actions}>
                                    <button
                                        className={styles.actionBtn}
                                        onClick={() => handleDownload(photo)}
                                        title="Descargar"
                                    >
                                        <Download size={15} />
                                    </button>
                                    <button
                                        className={`${styles.actionBtn} ${styles.actionBtnDelete}`}
                                        onClick={() => handleDelete(photo)}
                                        title="Eliminar"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
