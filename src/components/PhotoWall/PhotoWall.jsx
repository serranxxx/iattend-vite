import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Input } from 'antd'
import { Download, Trash2, Search, Heart, Loader2 } from 'lucide-react'
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
    const [likesMap, setLikesMap] = useState({})
    const [likersModal, setLikersModal] = useState(null)
    const [downloadingIds, setDownloadingIds] = useState(new Set())

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
        if (!eventId) return
        fetch(`${API_URL}/api/photos/likes/event/${eventId}`)
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                const map = {}
                for (const like of data) {
                    if (!map[like.photo_id]) map[like.photo_id] = []
                    map[like.photo_id].push(like.guest_name)
                }
                setLikesMap(map)
            })
            .catch(() => {})
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

    const handleDownload = async (photo) => {
        setDownloadingIds(prev => new Set([...prev, photo.id]))
        try {
            const res = await fetch(photo.public_url)
            const blob = await res.blob()
            const imageBitmap = await createImageBitmap(blob)
            const canvas = document.createElement('canvas')
            canvas.width = imageBitmap.width
            canvas.height = imageBitmap.height
            canvas.getContext('2d').drawImage(imageBitmap, 0, 0)
            canvas.toBlob((outputBlob) => {
                const url = URL.createObjectURL(outputBlob)
                const a = document.createElement('a')
                a.href = url
                a.download = `iattend-${(photo.guest_name || 'invitado').replace(/\s+/g, '-')}-photo.png`
                a.click()
                URL.revokeObjectURL(url)
            }, 'image/png')
        } finally {
            setDownloadingIds(prev => { const next = new Set(prev); next.delete(photo.id); return next })
        }
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
                    {filteredPhotos.map(photo => {
                        const likers = likesMap[photo.id] ?? []
                        const count = likers.length
                        return (
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
                                {count > 0 && (
                                    <button
                                        className={styles.likesBadge}
                                        onClick={() => setLikersModal({ photo, likers })}
                                        title="Ver likes"
                                    >
                                        <Heart size={11} fill="currentColor" />
                                        <span>{count}</span>
                                    </button>
                                )}
                                {allowAdmin && (
                                    <div className={styles.actions}>
                                        <button
                                            className={styles.actionBtn}
                                            onClick={() => handleDownload(photo)}
                                            disabled={downloadingIds.has(photo.id)}
                                            title="Descargar"
                                        >
                                            {downloadingIds.has(photo.id)
                                                ? <Loader2 size={15} className={styles.spinning} />
                                                : <Download size={15} />}
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
                        )
                    })}
                </div>
            )}

        <Modal
            open={!!likersModal}
            onCancel={() => setLikersModal(null)}
            footer={null}
            title={
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Heart size={15} fill="#ff4d6d" color="#ff4d6d" />
                    {likersModal?.likers.length} {likersModal?.likers.length === 1 ? 'like' : 'likes'} — {likersModal?.photo.guest_name || 'Invitado'}
                </span>
            }
            width={360}
        >
            {likersModal && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {likersModal.likers.map(name => (
                        <li key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: '#fff0f3', color: '#ff4d6d',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: 13, flexShrink: 0,
                            }}>
                                {name[0]?.toUpperCase()}
                            </span>
                            <span style={{ fontSize: 14, color: '#1a1a1a' }}>{name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Modal>
    </div>
    )
}
