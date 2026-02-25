import React, { useEffect, useState } from 'react'
import { CreditsComponent } from '../Credits/Credits'
import './credit-controller.css'
import { supabase } from '../../../lib/supabase'

export const CreditController = ({id}) => {

    const [credits, setCredits] = useState(null)

    const getCredits = async () => {

        const { data, error } = await supabase
            .from("invitations")
            .select("credits")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            setCredits(data.credits)
        }
    }

    useEffect(() => {
      getCredits()
    }, [])
    

    return (
        <div className="coins_cont">
            <div className="coins_rel">
                <img src="/images/c_100.png" alt="" className="coins_img" />

                <span className='credits_label'>{credits}</span>

                <CreditsComponent invitationID={id} isSingle={true} />

                {/* <Button type="primary" className="coins_btn" icon={<Plus style={{ marginTop: '2px' }} />}></Button> */}
            </div>


        </div>
    )
}
