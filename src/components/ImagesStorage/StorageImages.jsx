import React, { useEffect, useState } from 'react'
import './storage-images.css'
import { Button, Dropdown, Empty, Tabs, Upload } from 'antd'
import { LuArchive, LuImageOff, LuImagePlus, LuUpload } from 'react-icons/lu'
import { deleteImageFromSupabase, getCoversFromSubapase, getDresscodesFromSupabase, getImagesFromSupabase, getQuotesFromSubapase, uploadImagesSupabase } from '../../helpers/services/uploadImage'
import { Sparkles } from 'lucide-react'


export const StorageImages = ({ type, isNull, placement, absolute, invitationID, handleImage, id, small }) => {

    const [images, setImages] = useState([])
    const [selectedKey, setSelectedKey] = useState(0)
    const [ideas, setIdeas] = useState([])

    const customUpload = async ({ file, onSuccess, onError }) => {
        try {

            await uploadImagesSupabase({
                file: file,
                invitationID,
                setImages
            });

            onSuccess();
            console.log('Imagen subida correctamente');
        } catch (err) {
            console.error(err);
            console.log('Error al subir imagen');
            onError(err);
        }
    };

    const handleType = () => {
        switch (type) {
            case 'side-events': return 'Portada'
            case 'dresscode': return 'Dresscode'
            case 'quote': return 'Cita'
            case 'cover': return 'Portada'
            case 'itinerary': return 'Lugares'
            case 'destinations': return 'Lugares'
            default:
                break;
        }
    }

    const handleDresscodeType = (index) => {
        switch (index) {
            case 1: return 'Cocktail'
            case 2: return 'Formal'
            case 0: return 'Black Tie'


            default:
                break;
        }
    }

    const items = [
        {
            label: `Mis imagenes`,
            key: 0,
            children: <> {
                images.length > 0 ?
                    <div className='storage_imgs_cont scroll-invitation'>
                        {
                            isNull &&
                            <div onClick={() => handleImage(null, 0, id)} className='storage_img' >
                                <LuImageOff size={24} />
                            </div>
                        }
                        {
                            [...images].reverse()?.map((i, index) => (
                                <div onClick={handleImage ? () => handleImage(i.url, index, id) : () => { }} className='storage_img' key={index}>
                                    <img src={i.url} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <Button onClick={() => deleteImageFromSupabase(i.path, invitationID, setImages)} className='storage_delete'>Eliminar</Button>
                                </div>
                            ))
                        }
                    </div>
                    : <div className='empty_cont'>
                        <Empty description="No tienes imágenes" />
                    </div>
            }</>,
        },
        {
            label: <span>✨ Ideas | <b>{handleType(type)}</b></span>,
            key: 1,
            children: <> {
                ideas.length > 0 ? type === 'dresscode' ?
                    <div className='storage_dresscode_images scroll-invitation'>
                        {
                            [...ideas].map((idea, index) => (
                                <>
                                    <span>{handleDresscodeType(index)}</span>
                                    <div className='storage_imgs_dresscode'>
                                        {
                                            idea.map((i) => (
                                                <div onClick={handleImage ? () => handleImage(i, index, id) : () => { }} className='storage_img' key={index}>
                                                    <img src={i} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            ))
                                        }
                                    </div>

                                </>
                            ))
                        }
                    </div>
                    :
                    <div className='storage_imgs_cont scroll-invitation'>
                        {
                            [...ideas].reverse()?.map((i, index) => (
                                <div onClick={handleImage ? () => handleImage(i, index, id) : () => { }} className='storage_img' key={index}>
                                    <img src={i} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))
                        }
                    </div>

                    : <div className='empty_cont'>
                        <Empty description="No tienes imágenes" />
                    </div>
            }</>,
        },
    ]

    useEffect(() => {
        if (type) {
            switch (type) {
                case 'dresscode':
                    getDresscodesFromSupabase(setIdeas)
                    break;

                case 'side-events':
                    getCoversFromSubapase(setIdeas)
                    break;

                case 'cover':
                    getCoversFromSubapase(setIdeas)
                    break;

                case 'quote':
                    getQuotesFromSubapase(setIdeas)
                    break;

                default:
                    break;
            }
        }
        // 

    }, [type])





    return (
        <Dropdown
            trigger={['click']}
            placement={placement}
            arrow
            popupRender={() => (
                <div className='images_storage_cont'>
                    <div className='storage_row'>
                        <Sparkles size={16} />
                        {/* <LuArchive size={16} /> */}
                        <span style={{ fontSize: '16px' }}>Almacenamiento de imágenes</span>


                    </div>
                    <Tabs
                        onChange={(e) => setSelectedKey(e)}
                        type="card"
                        style={{ width: '100%' }}
                        items={items}
                        tabBarExtraContent={
                            selectedKey === 0 &&
                            <Upload
                                accept="image/*"
                                showUploadList={false}
                                customRequest={customUpload}
                            >
                                <Button style={{ marginBottom: '12px' }} icon={<LuUpload />} className='primarybutton'>Subir imagen</Button>
                            </Upload>
                        }
                    />

                </div>
            )}
        >
            <Button
                style={{ position: absolute && 'absolute', top: absolute && 10, right: absolute && 10 }}
                onClick={() => getImagesFromSupabase(invitationID, setImages)}
                className='full-screen-button'
                id="expandedbutton" icon={<LuImagePlus size={small ? 12 : 16} style={{ marginTop: '2px' }} />} />

        </Dropdown>
    )
}
