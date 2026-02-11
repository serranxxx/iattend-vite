import React from 'react'
import './destinations.css'
import { Button } from 'antd'
import { Link } from 'react-router-dom'
import { darker } from '../../../helpers'

export const DestinationCard = ({ content, colorPalette }) => {
    const arrayDestinations = [
        {
            image: "https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2c/28/80/d5/exterior1.jpg?w=1200&h=-1&s=1",
            name: "Hotel ONE",
            url: "Hotel ONE"
        },
        {
            image: "https://cdn.mexicodestinos.com/hoteles/hotel-sheraton-chihuahua-soberano-fachada-princ-min.jpg",
            name: "Sheraton",
            url: ""
        },
    ]
    return (
        content.cards.map((dest, index) => (
            <div
                key={index}
                className='destination-card' style={{
                    backgroundColor: content.background ? colorPalette.primary : colorPalette.secondary,
                    backgroundImage: `url(${dest.image}`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}>
                <div className='dest-info-container'>
                    <span style={{ color: content.background && !dest.image ? colorPalette.accent : colorPalette.primary }} className='dest-card-title'>{dest.name}</span>
                    {
                        dest.url &&
                        <Link to={dest.url} target='_blank' style={{ width: '100%' }}>
                            <Button style={{ backgroundColor: content.background && !dest.image ? colorPalette.secondary : colorPalette.primary, color: colorPalette.accent }} className="destbutton">
                                Ver detalles
                            </Button>
                        </Link>
                    }
                </div>

            </div>
        ))
    )
}
