import { useEffect, useRef, useState } from 'react'
import { Button, Dropdown, Input, InputNumber, Select, message } from 'antd'
import { Link } from 'react-router-dom'
import { ArrowLeft, Palette, Paintbrush, Upload as UploadIcon, Trash2, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { uploadTextureImage } from '../../helpers/services/uploadImage'
import { colorCollection } from '../../helpers/services/colorPalette'
import { HeaderBuild } from '../../modules/Header/Header'
import { BuildContent } from '../../modules/Invitation/Build/PageSections/BuildContent'
import { load } from '../../helpers/assets/images'
import '../../modules/Invitation/Build/PageSections/build-invitation.css'

const LAB_INVITATION_ID = '3cb0ab8b-41cb-428d-b383-ff9d5bbae17d'

const BLEND_OPTIONS = [
    'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
    'color-dodge', 'color-burn', 'hard-light', 'soft-light',
    'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
].map(value => ({ value, label: value }))

const DEFAULT_FILTER = 'grayscale(1) contrast(1) brightness(1)'

export const TextureLabPage = () => {
    const [messageApi, contextHolder] = message.useMessage()

    const [invitation, setInvitation] = useState(null)
    const [positionY, setPositionY] = useState('generals')
    const [onHide, setOnHide] = useState(() => window.innerWidth <= 750)
    const [device, setDevice] = useState('ios')

    const [opacity, setOpacity] = useState(0.5)
    const [blend, setBlend] = useState('multiply')
    const [textureName, setTextureName] = useState('')
    const [uploadedImage, setUploadedImage] = useState(null) // { url, path }
    const [uploading, setUploading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [searchCollection, setSearchCollection] = useState('')

    const fileInputRef = useRef(null)
    const uploadedImageRef = useRef(null)
    useEffect(() => { uploadedImageRef.current = uploadedImage }, [uploadedImage])

    useEffect(() => {
        const getLabInvitation = async () => {
            const { data, error } = await supabase
                .from('invitations')
                .select('data, id')
                .eq('id', LAB_INVITATION_ID)
                .maybeSingle()

            if (error || !data) {
                messageApi.error('No se pudo cargar la invitación de prueba')
                return
            }
            // Mismo espejo dev/prod que arma BuildPage.jsx antes de alimentar
            // ReactHost -- sin esto el host de iattend-events truena al leer
            // cover.image.dev/quote.image.dev, que en la data guardada siempre
            // vienen en null (solo se llenan en memoria durante la edición).
            const raw = data.data
            setInvitation({
                ...raw,
                cover: {
                    ...raw.cover,
                    image: { ...raw.cover?.image, dev: raw.cover?.image?.prod },
                },
                quote: {
                    ...raw.quote,
                    image: { ...raw.quote?.image, dev: raw.quote?.image?.prod },
                },
                dresscode: { ...raw.dresscode, dev: raw.dresscode?.prod },
                gallery: { ...raw.gallery, dev: raw.gallery?.prod },
            })
        }
        getLabInvitation()
    }, [])

    // Cleanup best-effort: si se navega fuera del Laboratorio sin guardar ni
    // descartar explícitamente, se borra la imagen huérfana subida a Storage.
    useEffect(() => {
        return () => {
            if (uploadedImageRef.current?.path) {
                supabase.storage.from('assets').remove([uploadedImageRef.current.path])
            }
        }
    }, [])

    const textureOverride = uploadedImage ? {
        image: uploadedImage.url,
        opacity,
        blend,
        filter: DEFAULT_FILTER,
    } : null

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        setUploading(true)
        try {
            if (uploadedImage?.path) {
                await supabase.storage.from('assets').remove([uploadedImage.path])
            }
            const { url, path } = await uploadTextureImage(file)
            setUploadedImage({ url, path })
            setTextureName(prev => prev || file.name.replace(/\.[^/.]+$/, ''))
        } catch (err) {
            console.error(err)
            messageApi.error('Error al subir la imagen')
        } finally {
            setUploading(false)
        }
    }

    const changeByCollection = (c) => {
        setInvitation(prev => ({
            ...prev,
            generals: {
                ...prev.generals,
                colors: {
                    ...prev.generals.colors,
                    primary: c.primary,
                    secondary: c.secondary,
                    accent: c.accent,
                    actions: c.actions,
                },
            },
        }))
    }

    const handleGuardar = async () => {
        if (!uploadedImage) return
        if (!textureName.trim()) { messageApi.error('Ponle un nombre a la textura'); return; }
        setSaving(true)
        try {
            const { data: existing } = await supabase.from('textures').select('sort_order').order('sort_order', { ascending: false }).limit(1)
            const nextSortOrder = (existing?.[0]?.sort_order ?? -1) + 1
            const { error } = await supabase
                .from('textures')
                .insert({
                    name: textureName.trim(),
                    image_url: uploadedImage.url,
                    opacity,
                    blend,
                    filter: DEFAULT_FILTER,
                    sort_order: nextSortOrder,
                    is_active: true,
                })
            if (error) { messageApi.error('Error al guardar la textura'); return; }
            messageApi.success('Textura guardada')
            setUploadedImage(null)
            setOpacity(0.5)
            setBlend('multiply')
            setTextureName('')
        } finally {
            setSaving(false)
        }
    }

    const handleDescartar = async () => {
        if (uploadedImage?.path) {
            await supabase.storage.from('assets').remove([uploadedImage.path])
        }
        setUploadedImage(null)
        setOpacity(0.5)
        setBlend('multiply')
        setTextureName('')
        messageApi.info('Descartado')
    }

    const filteredCollection = colorCollection.filter((item) => {
        const query = searchCollection.trim().toLowerCase()
        if (!query) return true
        return (
            item.name.toLowerCase().includes(query) ||
            item.keywords.some((keyword) => keyword.toLowerCase().includes(query))
        )
    })

    const coleccionContent = (
        <div className="color_palette_container">
            <div className='collection_header_search'>
                <span className='collection_title'>Paleta de colores</span>
                <Input
                    value={searchCollection}
                    onChange={(e) => setSearchCollection(e.target.value)}
                    className='collection_search'
                    placeholder='Buscar...'
                    style={{ maxWidth: '300px', borderRadius: '99px' }}
                />
            </div>
            <div className='collection_grid scroll-invitation'>
                {filteredCollection.map((c, index) => (
                    <div key={index} className='color_collection_cont'>
                        <div className='collection_cont'>
                            <div style={{ backgroundColor: c.primary, width: '50px' }} className='collection_item' />
                            <div style={{ backgroundColor: c.secondary, width: '50px' }} className='collection_item' />
                            <div style={{ backgroundColor: c.accent, width: '50px' }} className='collection_item' />
                            <div style={{ backgroundColor: c.actions, width: '50px' }} className='collection_item' />
                        </div>
                        <div className='name_collection'>
                            <span>{c.name}</span>
                            <Button onClick={() => changeByCollection(c)} type='text' icon={<Paintbrush size={14} />} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    if (!invitation) {
        return (
            <div className='build-loading-container'>
                <img alt='' src={load} style={{ width: '200px' }} />
            </div>
        )
    }

    return (
        <div className='invitations-page-main-container'>
            {contextHolder}
            <HeaderBuild position='admin' />
            <div className='build-componentes-container' style={{ margin: '0px', position: 'relative', justifyContent: 'flex-start', gap: '24px', alignItems: 'flex-start' }}>
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '16px', width: '320px', flexShrink: 0,
                    backgroundColor: '#FFF', borderRadius: '16px', padding: '20px', boxShadow: '0px 0px 12px rgba(0,0,0,0.08)',
                }}>
                    <Link to='/admin?tab=texturas'>
                        <Button icon={<ArrowLeft size={14} />} type='text' style={{ paddingLeft: 0 }}>Volver a Texturas</Button>
                    </Link>

                    <span className='gc-content-label'>Textura candidata</span>

                    <input ref={fileInputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={handleFileChange} />
                    <div style={{ width: '100%', height: '140px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--borders)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {uploadedImage ? (
                            <img alt='' src={uploadedImage.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <span style={{ color: '#00000040', fontSize: '13px' }}>Sin imagen</span>
                        )}
                    </div>
                    {!uploadedImage && (
                        <Button icon={<UploadIcon size={14} />} loading={uploading} onClick={() => fileInputRef.current?.click()}>
                            Subir imagen
                        </Button>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className='gc-content-label'>Nombre</span>
                        <Input value={textureName} onChange={(e) => setTextureName(e.target.value)} placeholder='Nombre de la textura' />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className='gc-content-label'>Opacidad</span>
                        <InputNumber min={0} max={1} step={0.1} value={opacity} onChange={(v) => setOpacity(v ?? 0)} style={{ width: '100%' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span className='gc-content-label'>Blend</span>
                        <Select value={blend} options={BLEND_OPTIONS} onChange={setBlend} style={{ width: '100%' }} />
                    </div>

                    <Dropdown arrow placement='bottomLeft' trigger={['click']} popupRender={() => coleccionContent}>
                        <Button className='primarybutton' icon={<Palette size={12} />}>Colores</Button>
                    </Dropdown>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <Button
                            type='primary'
                            icon={<Save size={14} />}
                            disabled={!uploadedImage || !textureName.trim()}
                            loading={saving}
                            onClick={handleGuardar}
                            style={{ flex: 1 }}
                        >
                            Guardar textura
                        </Button>
                        <Button
                            danger
                            icon={<Trash2 size={14} />}
                            disabled={!uploadedImage}
                            onClick={handleDescartar}
                        >
                            Descartar
                        </Button>
                    </div>
                </div>

                <BuildContent
                    invitation={invitation}
                    textureOverride={textureOverride}
                    positionY={positionY}
                    setPositionY={setPositionY}
                    currentDevice={device}
                    setDevice={setDevice}
                    onHide={onHide}
                    setOnHide={setOnHide}
                />
            </div>
        </div>
    )
}
