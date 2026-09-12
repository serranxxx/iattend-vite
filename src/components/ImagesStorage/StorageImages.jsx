import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './storage-images.css'
import { Button, Dropdown, Empty, Tabs } from 'antd'
import { LuImageOff, LuImagePlus, LuUpload } from 'react-icons/lu'
import { deleteImageFromSupabase, deleteVideoFromSupabase, getCoversFromSubapase, getDresscodesFromSupabase, getImagesFromSupabase, getQuotesFromSubapase, getVideosFromSupabase, uploadEventVideo, uploadImagesSupabase } from '../../helpers/services/uploadImage'
import { Sparkles } from 'lucide-react'
import BottomSheet from '../BottomSheet/BottomSheet'


// `mediaType='video'` cambia el picker a videos: sube a `{id}/video/`, lista
// solo esa carpeta y oculta la pestaña de ideas. Los pickers de imagen (el
// default) no se ven afectados.
export const StorageImages = ({ type, isNull, placement, absolute, invitationID, handleImage, id, small, hideUpload, customTrigger, hideMyImages, onRequestSaveForImage, mediaType = 'image' }) => {

    const { t } = useTranslation()
    const [images, setImages] = useState([])
    const isVideoPicker = mediaType === 'video'
    const [selectedKey, setSelectedKey] = useState(hideMyImages ? 1 : 0)
    const [ideas, setIdeas] = useState([])
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const resolvedIdRef = useRef(invitationID)
    const fileInputRef = useRef(null)
    const mobileFileInputRef = useRef(null)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 750)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        if (invitationID) resolvedIdRef.current = invitationID
    }, [invitationID])

    useEffect(() => {
        if (hideMyImages && selectedKey === 0) setSelectedKey(1)
    }, [hideMyImages])

    const handleUploadClick = async (inputRef) => {
        if (!resolvedIdRef.current && onRequestSaveForImage) {
            const id = await onRequestSaveForImage()
            if (!id) return
            resolvedIdRef.current = id
        }
        inputRef.current?.click()
    }

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (!file || !resolvedIdRef.current) return
        e.target.value = ''
        try {
            if (isVideoPicker) {
                await uploadEventVideo({ file, invitationID: resolvedIdRef.current, setVideos: setImages })
            } else {
                await uploadImagesSupabase({ file, invitationID: resolvedIdRef.current, setImages })
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleType = () => {
        switch (type) {
            case 'side-events': return t('storage.type_cover')
            case 'dresscode': return t('storage.type_dresscode')
            case 'quote': return t('storage.type_quote')
            case 'cover': return t('storage.type_cover')
            case 'itinerary': return t('storage.type_places')
            case 'destinations': return t('storage.type_places')
            default: break;
        }
    }

    const handleDresscodeType = (index) => {
        switch (index) {
            case 1: return 'Cocktail'
            case 2: return 'Formal'
            case 0: return 'Black Tie'
            default: break;
        }
    }

    const selectImage = (fn) => {
        if (!fn) return () => {}
        return (...args) => {
            fn(...args)
            if (isMobile) setDrawerOpen(false)
        }
    }

    const allItems = [
        {
            label: isVideoPicker ? t('storage.tab_my_videos') : t('storage.tab_my_images'),
            key: 0,
            children: <>{
                images.length > 0 ?
                    <div className='storage_imgs_cont scroll-invitation'>
                        {isNull &&
                            <div onClick={selectImage(() => handleImage(null, 0, id))} className='storage_img'>
                                <LuImageOff size={24} />
                            </div>
                        }
                        {[...images].reverse()?.map((i, index) => (
                            <div onClick={selectImage(handleImage ? () => handleImage(i.url, index, id) : null)} className='storage_img' key={index}>
                                {isVideoPicker
                                    ? <video src={i.url} muted playsInline preload='metadata' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    : <img src={i.url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                }
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (isVideoPicker) deleteVideoFromSupabase(i.path, resolvedIdRef.current, setImages)
                                        else deleteImageFromSupabase(i.path, resolvedIdRef.current, setImages)
                                    }}
                                    className='storage_delete'
                                >
                                    {t('storage.btn_delete')}
                                </Button>
                            </div>
                        ))}
                    </div>
                    : <div className='empty_cont'><Empty description={t('storage.empty')} /></div>
            }</>,
        },
        {
            label: <span>✨ {t('storage.tab_ideas')} | <b>{handleType(type)}</b></span>,
            key: 1,
            children: <>{
                ideas.length > 0 ? type === 'dresscode' ?
                    <div className='storage_dresscode_images scroll-invitation'>
                        {[...ideas].map((idea, index) => (
                            <>
                                <span>{handleDresscodeType(index)}</span>
                                <div className='storage_imgs_dresscode'>
                                    {idea.map((i) => (
                                        <div onClick={selectImage(handleImage ? () => handleImage(i, index, id) : null)} className='storage_img' key={index}>
                                            <img src={i} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ))}
                    </div>
                    :
                    <div className='storage_imgs_cont scroll-invitation'>
                        {[...ideas].reverse()?.map((i, index) => (
                            <div onClick={selectImage(handleImage ? () => handleImage(i, index, id) : null)} className='storage_img' key={index}>
                                <img src={i} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                        ))}
                    </div>
                    : <div className='empty_cont'><Empty description={t('storage.empty')} /></div>
            }</>,
        },
    ]

    const items = isVideoPicker
        ? allItems.filter(i => i.key === 0)
        : hideMyImages ? allItems.filter(i => i.key !== 0) : allItems

    useEffect(() => {
        if (isVideoPicker) return
        if (type) {
            switch (type) {
                case 'dresscode': getDresscodesFromSupabase(setIdeas); break;
                case 'side-events': getCoversFromSubapase(setIdeas); break;
                case 'cover': getCoversFromSubapase(setIdeas); break;
                case 'quote': getQuotesFromSubapase(setIdeas); break;
                default: break;
            }
        }
    }, [type])

    const uploadButton = (
        <>
            <input ref={fileInputRef} type='file' accept={isVideoPicker ? 'video/*' : 'image/*'} style={{ display: 'none' }} onChange={handleFileChange} />
            <Button
                style={{ marginBottom: '12px' }}
                icon={<LuUpload />}
                className='primarybutton'
                onClick={() => handleUploadClick(fileInputRef)}
            >
                {isVideoPicker ? t('storage.btn_upload_video') : t('storage.btn_upload')}
            </Button>
        </>
    )

    const tabsContent = (
        <Tabs
            onChange={(e) => setSelectedKey(e)}
            type="card"
            style={{ width: '100%' }}
            items={items}
            tabBarExtraContent={!isMobile && !hideUpload && uploadButton}
        />
    )

    const handleOpen = useCallback(() => {
        if (isVideoPicker) getVideosFromSupabase(invitationID, setImages)
        else getImagesFromSupabase(invitationID, setImages)
        if (isMobile) setDrawerOpen(true)
    }, [isMobile, invitationID, isVideoPicker])

    const triggerButton = customTrigger
        ? React.cloneElement(customTrigger, { onClick: handleOpen })
        : (
            <Button
                style={{ position: absolute && 'absolute', top: absolute && 10, right: absolute && 10 }}
                onClick={handleOpen}
                className='full-screen-button'
                id="expandedbutton"
                icon={<LuImagePlus size={small ? 12 : 16} style={{ marginTop: '2px' }} />}
            />
        )

    return (
        <>
            {isMobile ? (
                <>
                    {triggerButton}
                    {/* Hoja propia (no Drawer de antd): sin capa que oscurezca
                        el fondo y se cierra arrastrando o tocando fuera */}
                    <BottomSheet
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        maxHeight='92%'
                        title={
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={16} />
                                {isVideoPicker ? t('storage.title_files') : t('storage.drawer_title')}
                            </span>
                        }
                        extra={!hideUpload &&
                            <>
                                <input ref={mobileFileInputRef} type='file' accept={isVideoPicker ? 'video/*' : 'image/*'} style={{ display: 'none' }} onChange={handleFileChange} />
                                <Button
                                    size='small'
                                    icon={<LuUpload />}
                                    className='primarybutton--active'
                                    style={{ borderRadius: '99px' }}
                                    onClick={() => handleUploadClick(mobileFileInputRef)}
                                >
                                    {isVideoPicker ? t('storage.btn_upload_video') : t('storage.btn_upload')}
                                </Button>
                            </>
                        }
                    >
                        {tabsContent}
                    </BottomSheet>
                </>
            ) : (
                <Dropdown
                    trigger={['click']}
                    placement={placement}
                    arrow
                    popupRender={() => (
                        <div className='images_storage_cont'>
                            <div className='storage_row'>
                                <Sparkles size={16} />
                                <span style={{ fontSize: '16px' }}>{isVideoPicker ? t('storage.title_files') : t('storage.dropdown_title')}</span>
                            </div>
                            {tabsContent}
                        </div>
                    )}
                >
                    {triggerButton}
                </Dropdown>
            )}
        </>
    )
}
