import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import './storage-images.css'
import { Button, Drawer, Dropdown, Empty, Tabs } from 'antd'
import { LuImageOff, LuImagePlus, LuUpload, LuX } from 'react-icons/lu'
import { deleteImageFromSupabase, getCoversFromSubapase, getDresscodesFromSupabase, getImagesFromSupabase, getQuotesFromSubapase, uploadImagesSupabase } from '../../helpers/services/uploadImage'
import { Sparkles } from 'lucide-react'


export const StorageImages = ({ type, isNull, placement, absolute, invitationID, handleImage, id, small, hideUpload, customTrigger, hideMyImages, onRequestSaveForImage }) => {

    const { t } = useTranslation()
    const [images, setImages] = useState([])
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
            await uploadImagesSupabase({ file, invitationID: resolvedIdRef.current, setImages })
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
            label: t('storage.tab_my_images'),
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
                                <img src={i.url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <Button onClick={(e) => { e.stopPropagation(); deleteImageFromSupabase(i.path, resolvedIdRef.current, setImages) }} className='storage_delete'>{t('storage.btn_delete')}</Button>
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

    const items = hideMyImages ? allItems.filter(i => i.key !== 0) : allItems

    useEffect(() => {
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
            <input ref={fileInputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={handleFileChange} />
            <Button
                style={{ marginBottom: '12px' }}
                icon={<LuUpload />}
                className='primarybutton'
                onClick={() => handleUploadClick(fileInputRef)}
            >
                {t('storage.btn_upload')}
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
        getImagesFromSupabase(invitationID, setImages)
        if (isMobile) setDrawerOpen(true)
    }, [isMobile, invitationID])

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
                    <Drawer
                        open={drawerOpen}
                        onClose={() => setDrawerOpen(false)}
                        placement="bottom"
                        height="95%"
                        closeIcon={false}
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Sparkles size={16} />
                                    <span style={{ fontWeight: 600, fontSize: '16px' }}>{t('storage.drawer_title')}</span>
                                </div>
                            </div>
                        }
                        styles={{
                            header: { borderBottom: '1px solid #F0F0F0', padding: '12px 16px' },
                            body: { padding: '0 16px 16px', overflow: 'auto' },
                        }}
                        style={{ borderRadius: '24px 24px 0 0' }}
                        extra={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom:'6px' }}>
                                {isMobile && (
                                    <>
                                        <input ref={mobileFileInputRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={handleFileChange} />
                                        <Button
                                            icon={<LuUpload />}
                                            className='primarybutton--active'
                                            onClick={() => handleUploadClick(mobileFileInputRef)}
                                        >
                                            {t('storage.btn_upload')}
                                        </Button>
                                    </>
                                )}
                                <Button
                                    className='primarybutton'
                                    icon={<LuX size={16} style={{marginTop:'2px'}}/>}
                                    onClick={() => setDrawerOpen(false)}
                                    style={{ borderRadius: '99px' }} />
                            </div>
                        }
                    >
                        {tabsContent}
                    </Drawer>
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
                                <span style={{ fontSize: '16px' }}>{t('storage.dropdown_title')}</span>
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
