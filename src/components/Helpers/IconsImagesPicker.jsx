import { Button, Row, Tabs } from 'antd'
import { useTranslation } from 'react-i18next'
import { iconsItinerary } from '../../helpers/services/menuIcons'
import { imagesItinerary } from '../../helpers/services/menuImages'

export const IconsImagesPicker = ({ currentIcon, onSelectIcon, onSelectImage }) => {

    const { t } = useTranslation()

    const items = [
        {
            key: 'icons',
            label: t('build_itinerary.tab_icons'),
            children: (
                <Row className='gc-icons-modal-container' style={{ backgroundColor: 'transparent', boxShadow: 'none' }}>
                    {iconsItinerary.map((icon, idx) => (
                        <Button
                            id={`gc-cta-buttons${icon.index === currentIcon ? '--selected' : ''}`}
                            className='gc-icons-modal-icon'
                            type='text'
                            onClick={() => onSelectIcon(icon.index)}
                            key={idx}
                            icon={<icon.value size={20} />}
                        />
                    ))}
                </Row>
            ),
        },
        {
            key: 'images',
            label: t('build_itinerary.tab_images'),
            children: (
                <Row className='gc-images-modal-container'>
                    {imagesItinerary.map((image, idx) => (
                        <Button
                            id={`gc-cta-buttons${image.path === currentIcon ? '--selected' : ''}`}
                            className='gc-images-modal-icon'
                            type='text'
                            onClick={() => onSelectImage(image.path)}
                            key={idx}
                        >
                            <img src={image.path} alt={image.name} style={{ width: 100, height: 100, objectFit: 'contain' }} />
                        </Button>
                    ))}
                </Row>
            ),
        },
    ]

    return (
        <div className='gc-icons-modal-tabs-container'>
            <Tabs size='small' items={items} />
        </div>
    )
}
