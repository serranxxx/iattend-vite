import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message, Popover } from 'antd'
import { LoaderCircle, Music, Upload, X } from 'lucide-react'
import { searchSpotifyTracks } from '../../../../helpers/services/spotify'
import { uploadSongAudio } from '../../../../helpers/services/uploadAudio'
import styles from './ElementBar.module.css'

// Barra de la canción de la portada (cover.song), arriba de la pieza. Se abre
// con el chip "Canción" y reemplaza en escritorio a su popover (CancionFlash):
// mismo formato de canción ({ id, source, name, artist, albumArt, previewUrl }).
// Con canción: portada del disco, nombre y quitar. Sin canción: buscador de
// Spotify (resultados en un popover debajo) o "Subir" un audio.
export const SongBar = ({ invitation, invitationID, setInvitation, setSaved }) => {
    const { t } = useTranslation()
    const song = invitation?.cover?.song ?? null
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [uploading, setUploading] = useState(false)
    const fileRef = useRef(null)

    const setSong = (value) => {
        setInvitation((prev) => ({ ...prev, cover: { ...prev.cover, song: value } }))
        setSaved(false)
    }

    useEffect(() => {
        if (!query.trim()) { setResults([]); return }
        setSearching(true)
        const timer = setTimeout(async () => {
            try { setResults(await searchSpotifyTracks(query)) } catch { setResults([]) } finally { setSearching(false) }
        }, 400)
        return () => clearTimeout(timer)
    }, [query])

    const pick = (track) => {
        setSong({
            id: track.id,
            source: 'spotify',
            name: track.name,
            artist: track.artists[0].name,
            albumArt: track.album.images[track.album.images.length - 1]?.url,
            previewUrl: track.preview_url,
        })
        setQuery('')
        setResults([])
    }
    const upload = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setUploading(true)
        try {
            const url = await uploadSongAudio({ file, invitationID })
            if (url) setSong({ id: `upload-${Date.now()}`, source: 'upload', name: file.name.replace(/\.[^/.]+$/, ''), artist: '', albumArt: null, previewUrl: url })
        } catch (err) {
            console.error(err)
            message.error(t('build_generals.song_upload_error'))
        } finally {
            setUploading(false)
        }
    }

    if (song) {
        return (
            <div className={styles.bar} data-edit-keep data-text-bar>
                {song.albumArt
                    ? <img className={styles.thumb} src={song.albumArt} alt="" />
                    : <span className={styles.barIcon}><Music size={18} /></span>}
                <span className={styles.songText}>
                    <strong>{song.name}</strong>
                    {song.artist && <span>{song.artist}</span>}
                </span>
                <span className={styles.divider} />
                <button type="button" className={styles.iconBtn} title={t('side_events.song_remove')} onClick={() => setSong(null)}>
                    <X size={18} />
                </button>
            </div>
        )
    }

    return (
        <div className={styles.bar} data-edit-keep data-text-bar>
            <span className={styles.barIcon} style={{ color: '#1DB954' }}>
                {searching ? <LoaderCircle size={18} className={styles.spin} /> : <Music size={18} />}
            </span>
            <Popover
                open={results.length > 0}
                placement="bottom"
                arrow={false}
                content={(
                    <div className={`${styles.songResults} scroll-invitation`} data-text-bar onMouseDown={(e) => e.stopPropagation()}>
                        {results.map((track) => (
                            <button key={track.id} type="button" className={styles.menuItem} onClick={() => pick(track)}>
                                {track.album.images[track.album.images.length - 1]?.url && (
                                    <img className={styles.songArt} src={track.album.images[track.album.images.length - 1].url} alt="" />
                                )}
                                <span className={styles.songText}>
                                    <strong>{track.name}</strong>
                                    <span>{track.artists[0]?.name}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            >
                <input
                    autoFocus
                    className={styles.addressInput}
                    placeholder={t('build_generals.song_placeholder')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </Popover>
            <span className={styles.divider} />
            <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={upload} />
            <button type="button" className={styles.textBtn} disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <LoaderCircle size={17} className={styles.spin} /> : <Upload size={17} />} {t('build_generals.song_mode_upload')}
            </button>
        </div>
    )
}
