import { Button, Modal, Row } from 'antd'
import { iconsItinerary } from '../../helpers/services/menuIcons'

export const IconsModal = ({ isModalOpen, setIsModalOpen, currentIcon, setCurrentIcon, handleImage, id }) => {

    const handleIcon = (index, id) => {
        setCurrentIcon(index)
        handleImage(id, index)
        setIsModalOpen(false)
    }

    return (
        <Modal
            footer={<></>}
            title="Iconos" open={isModalOpen} onOk={() => setIsModalOpen(false)} onCancel={() => setIsModalOpen(false)}>
            <Row className='gc-icons-modal-container'>
                {
                    iconsItinerary.map((icon, index) => (
                        <Button
                            id={`gc-cta-buttons${icon.index === currentIcon ? '--selected' : ''}`}
                            className='gc-icons-modal-icon'
                            type='ghost'
                            onClick={() => handleIcon(icon.index)}
                            key={index}
                            icon={<icon.value size={20} />}

                        />
                    ))
                }
            </Row>
        </Modal>
    )
}


// icon.index === currentIcon ?