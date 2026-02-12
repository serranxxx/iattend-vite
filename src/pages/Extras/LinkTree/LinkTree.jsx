import React, { useEffect, useState } from 'react'
import './link-tree.css'
import ios_settings from '../../../assets/images/iphone-settings.svg'
import { Link } from 'react-router-dom'
import { Button } from 'antd'
import { SiWhatsapp } from "react-icons/si";
import { HiOutlineCursorArrowRays } from "react-icons/hi2";
import { FaInstagram } from "react-icons/fa";
import { supabase } from '../../../lib/supabase'
import ReactHost from '../../../components/Host/ReactHost'
import { FooterApp } from '../../../modules/Footer/FooterApp'
const baseProd = "https://www.iattend.events"

export const LinkTree = () => {
  const [invitations, setInvitations] = useState([])

  const my_invitations = [
    // "663284d7ba8db777462ca9fd",
    "680ddfc9d6985973ff0d36e6",
    "669c62fe1b7399bf75267774",
    // "680ddfb5d6985973ff0d36dd",
    "66a31dc63d724e3f40549b95",
  ]

  const getInvitationsbyID = async () => {
    const { data, error } = await supabase
      .from("invitations")
      .select("data")
      .in("mongo_id", my_invitations)

    if (error) {
      console.error("Error al obtener invitaciones:", error);
    } else {
      console.log("invitation from dashboard: ", data)
      setInvitations(data)
      // setSupaInv(data.data)
    }
  }

  useEffect(() => {
    getInvitationsbyID()
  }, [])


  return (
    <div style={{
      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
    }}>
      <div className='link-tree-container'>
        <div className='link-tree-header'>
          <span className='lt-label lt-title'>iattend.mx</span>
          <span className='lt-label'>Diseña, comparte, celebra.</span>
        </div>

        <div className='lt-invitations-container'>
          <div className='lt-invs-cont'>
            {
              invitations.slice().reverse().map((inv, idx) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', alignItems: 'center', justifyContent: 'center', paddingBottom: '10px', boxSizing: 'border-box' }}>
                  <div
                    key={idx}
                    style={{ transform: 'scale(0.7)', margin: '-100px -100px', cursor: 'pointer' }}
                    className={`inv-device-main-container-ios`}>
                    <div className={`device-buttons-container-ios`}>
                      <div className={`device-button-ios`} />
                      <div className={`device-button-ios`} />
                      <div className={`device-button-ios`} />
                    </div>
                    <div className={`device-power-button-ios`} />
                    <div className={`inv-device-container-ios`}>

                      <div style={{
                        width: '100%'
                      }} className={`inv-black-space-ios`}>
                        <span>5:15</span>
                        <div className={`camera-ios`} />
                        <div >
                          <img alt='' src={ios_settings} style={{
                            height: '100%', objectFit: 'cover',
                            marginRight: '50px'
                          }} />
                        </div>
                      </div>

                      <div
                        className={`ios-invitation inv-set-position grid-guides cover-sample-img scroll-invitation`}
                      >
                        <ReactHost config={inv.data} />

                      </div>
                      <div className={`inv-light-space-ios`} />
                    </div>
                  </div>
                  <Link to={`${baseProd}/${inv.data.generals.event.label}/${inv.data.generals.event.name}`} target='_blank'>
                    <Button className='primarybutton--black--active' style={{ padding: '8px 16px', height: '40px', width: '150px' }}>Ver ejemplo</Button>
                  </Link>
                </div>

              ))
            }
          </div>
        </div>

        <div className='lt-buttons-container'>
          <Link to={`https://wa.me/6145338500?text=${encodeURIComponent("Hola, quiero cotizar una invitación digital :)")}`} target='_blank' style={{ width: '100%' }}>
            <Button icon={<SiWhatsapp size={18} />} className='primarybutton--active lt-cta-button'>Platica con nosotros</Button>
          </Link>

          <Link to="https://www.instagram.com/iattend_" target='_blank' style={{ width: '100%' }}>
            <Button icon={<FaInstagram size={24} />} className='primarybutton--active lt-cta-button'>Síguenos</Button>
          </Link>

          <Link to={baseProd} target='_blank' style={{ width: '100%' }}>
            <Button icon={<HiOutlineCursorArrowRays size={24} />} className='primarybutton--active lt-cta-button'>Descubre más</Button>
          </Link>

        </div>


      </div>
      <FooterApp></FooterApp>
    </div>
  )
}
