import React, { useState } from 'react'
import './storage-images.css'
import { Button, Dropdown, Empty, Tabs, Upload } from 'antd'
import { LuArchive, LuImageOff, LuImagePlus, LuUpload } from 'react-icons/lu'
import { deleteImageFromSupabase, getImagesFromSupabase, uploadImagesSupabase } from '../../helpers/services/uploadImage'


export const StorageImages = ({ isNull, placement, absolute, invitationID, handleImage, id }) => {

    const [images, setImages] = useState([])
    const [selectedKey, setSelectedKey] = useState(0)

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
            label: `Inspiración`,
            key: 1,
            children: <div className='empty_cont' >
                <Empty description="No hay imágenes" />
            </div>,
        },
        {
            label: `Fondos`,
            key: 2,
            children: <div className='empty_cont'>
                <Empty description="No hay imágenes" />
            </div>,
        }
    ]



    return (
        <Dropdown
            trigger={['click']}
            placement={placement}
            arrow
            popupRender={() => (
                <div className='images_storage_cont'>
                    <div className='storage_row'>
                        <LuArchive size={16}/>
                        <span style={{ fontSize: '16px' }}><b>Almacenamiento de imágenes</b></span>


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
                                <Button style={{marginBottom:'12px'}} icon={<LuUpload />} className='primarybutton'>Subir imagen</Button>
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
                id="expandedbutton" icon={<LuImagePlus size={16} style={{ marginTop: '2px' }} />} />

        </Dropdown>
    )
}
