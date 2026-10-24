import { useEffect, useRef, useState } from 'react'
import { Button, Input, message, Segmented } from 'antd'
import { Upload, X } from 'lucide-react'
import { SiSpotify } from 'react-icons/si'
import { useTranslation } from 'react-i18next'
import { searchSpotifyTracks } from '../../helpers/services/spotify'
import { uploadSongAudio } from '../../helpers/services/uploadAudio'
import styles from './CancionFlash.module.css'
import ed from './SideEventEditor.module.css'

/*
  Canción de un Evento Flash (panel del editor). Mismo flujo y mismo formato
  que el Save the Date (SaveTheDatePage → panelSong): buscar en Spotify o
  subir un archivo. `body.song`: { id, source: 'spotify'|'upload', name,
  artist, albumArt, previewUrl }. La página del invitado la toca con
  SongPlayer (iattend-events), igual que el Save the Date.
*/
export const CancionFlash = ({ song, onChange, carpeta }) => {
    const { t } = useTranslation()
    const [modo, setModo] = useState('search')
    const [busqueda, setBusqueda] = useState('')
    const [resultados, setResultados] = useState([])
    const [buscando, setBuscando] = useState(false)
    const [subiendo, setSubiendo] = useState(false)
    const archivoRef = useRef(null)

    useEffect(() => {
        if (!busqueda.trim()) {
            setResultados([])
            return
        }
        setBuscando(true)
        const timer = setTimeout(async () => {
            try {
                setResultados(await searchSpotifyTracks(busqueda))
            } catch {
                setResultados([])
            } finally {
                setBuscando(false)
            }
        }, 400)
        return () => clearTimeout(timer)
    }, [busqueda])

    const elegir = (track) => {
        onChange({
            id: track.id,
            source: 'spotify',
            name: track.name,
            artist: track.artists[0].name,
            albumArt: track.album.images[track.album.images.length - 1]?.url,
            previewUrl: track.preview_url,
        })
        setBusqueda('')
        setResultados([])
    }

    const subir = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setSubiendo(true)
        try {
            // Va a `flash-<id>/audio/`, que el picker de imágenes no lista.
            const url = await uploadSongAudio({ file, invitationID: carpeta })
            if (!url) return
            onChange({
                id: `upload-${Date.now()}`,
                source: 'upload',
                name: file.name.replace(/\.[^/.]+$/, ''),
                artist: '',
                albumArt: null,
                previewUrl: url,
            })
        } catch (err) {
            console.error(err)
            message.error(t('build_generals.song_upload_error'))
        } finally {
            setSubiendo(false)
        }
    }

    if (song) {
        return (
            <div className={styles.songCard}>
                {song.albumArt && <img src={song.albumArt} alt='' className={styles.songArt} />}
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div className={styles.songName}>{song.name}</div>
                    {song.artist && <div className={styles.songArtist}>{song.artist}</div>}
                </div>
                <Button
                    type='text'
                    size='small'
                    aria-label={t('side_events.song_remove')}
                    onClick={() => onChange(null)}
                    icon={<X size={14} />}
                    style={{ color: '#888', flexShrink: 0 }}
                />
            </div>
        )
    }

    return (
        <>
            <Segmented
                block
                value={modo}
                onChange={setModo}
                options={[
                    { label: t('build_generals.song_mode_spotify'), value: 'search' },
                    { label: t('build_generals.song_mode_upload'), value: 'upload' },
                ]}
            />

            {modo === 'search' ? (
                <>
                    <Input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder={t('build_generals.song_placeholder')}
                        prefix={<SiSpotify style={{ color: '#1DB954' }} />}
                    />
                    {buscando && <span className={ed.hint}>{t('build_generals.song_searching')}</span>}
                    {resultados.length > 0 && (
                        <div className={styles.songResults}>
                            {resultados.map((track) => (
                                <div key={track.id} onClick={() => elegir(track)} className={styles.songResult}>
                                    {track.album.images[track.album.images.length - 1]?.url && (
                                        <img src={track.album.images[track.album.images.length - 1].url} alt='' className={styles.songResultArt} />
                                    )}
                                    <div style={{ overflow: 'hidden' }}>
                                        <div className={styles.songName}>{track.name}</div>
                                        <div className={styles.songArtist}>{track.artists[0]?.name}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <>
                    <input ref={archivoRef} type='file' accept='audio/*' style={{ display: 'none' }} onChange={subir} />
                    <Button loading={subiendo} icon={<Upload size={14} />} onClick={() => archivoRef.current?.click()}>
                        {t('build_generals.song_upload_btn')}
                    </Button>
                    <span className={ed.hint}>{t('build_generals.song_upload_hint')}</span>
                </>
            )}
        </>
    )
}
