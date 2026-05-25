import React, { useEffect, useState } from 'react'
import { CreditsComponent } from '../Credits/Credits'
import './credit-controller.css'
import { supabase } from '../../../lib/supabase'
import { Button, Dropdown } from 'antd'
import { Plus } from 'lucide-react'
import { FaPaperPlane } from 'react-icons/fa'
import { useLia } from '../../../context/LiaContext'
import { useTranslation } from 'react-i18next'

export const CreditController = ({ id }) => {
    const [credits, setCredits] = useState(null)
    const { creditState } = useLia()
    const { t } = useTranslation()

    const getCredits = async () => {
        const { data, error } = await supabase
            .from("invitations")
            .select("credits")
            .eq("id", id)
            .maybeSingle();
        if (error) console.error("Error al obtener invitaciones:", error)
        else setCredits(data.credits)
    }

    useEffect(() => { getCredits() }, [])

    useEffect(() => {
        if (creditState === 'bubble') getCredits()
    }, [creditState])

    const isSending = creditState === 'sending'
    const isBubble  = creditState === 'bubble'

    return (
        <div className={`coins_cont${isSending ? ' coins_cont--sending' : ''}`}>
            {isBubble && <div className="credit_minus_bubble">-1 crédito</div>}

            <div className="coins_rel">
                {!isSending && (
                    <img src="/images/c_100.png" alt="" className="coins_img" />
                )}

                {isSending ? (
                    <div className="coins_sending_content">
                        <FaPaperPlane className="paper_flight" />
                        <span>{t('guests.invitation_sent')}</span>
                    </div>
                ) : (
                    <span className='credits_label'>{credits}</span>
                )}

                {!isSending && (
                    <Dropdown
                        trigger={['click']}
                        placement='bottomRight'
                        arrow
                        popupRender={() => (
                            <CreditsComponent invitationID={id} isSingle={true} credits={credits} getType={getCredits} />
                        )}>
                        <Button className="coins_btn" icon={<Plus size={14} style={{ marginTop: '2px' }} />}></Button>
                    </Dropdown>
                )}
            </div>
        </div>
    )
}
