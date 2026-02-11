import React, { useEffect, useState } from 'react';
import '../../styles/modules/gallery.css'

export const GalleryItems = ({ colorPalette, content, dev, land }) => {

    const [images, setImages] = useState(null)

    useEffect(() => {
        if (content) {
            setImages(dev && !land ? content.gallery_dev : content.gallery_prod)
        }
    }, [content])


    return (

        <>
            {images && colorPalette && (
                images.map((item, index) => (
                    <div key={index} className="gallery-items-container">
                        <div
                            className="gallery-items-inner-container"
                            style={{ backgroundColor: colorPalette.primary, position: 'relative' }}
                        >
                            <img alt=''
                            loading="lazy" decoding="async"
                                src={item}
                                className="gallery-items-image"
                            />

                        </div>


                    </div>
                ))
            )}
        </>

    );
};
