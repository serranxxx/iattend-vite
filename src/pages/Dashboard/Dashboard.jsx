import { useEffect, useState } from "react"
import { DashboardPage } from "./DashboardPage"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useSearchParams } from "react-router-dom";
import { SideEvents } from "../../modules/SideEvents/SideEvents"
import {  BuildPage } from "../../modules/Invitation/Build/PageSections/BuildPage";
import GuestsPage from "../../modules/GuestManagement/GuestsPage";



export const Dashboard = () => {

    const [mode, setMode] = useState('on-dashboard')
    const [saved, setSaved] = useState(true)
    const [supaInv, setSupaInv] = useState(null)
    const [invitationID, setInvitationID] = useState(null)
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const id = searchParams.get("id");

    const getNewInvitations = async () => {

        const { data, error } = await supabase
            .from("invitations")
            .select("data")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
        } else {
            // console.log("invitation from dashboard: ", data.data)
            setSupaInv(data.data)
            setInvitationID(id)
        }

    };


    useEffect(() => {

        if (id) getNewInvitations()
        else navigate('/invitations')

    }, [id])


    useEffect(() => {
        if (mode === 'my-invitations' || mode === 'on-guests') {
            setSaved(true)
        }
    }, [mode])


    const handleModule = (type) => {

        if (id) {
            switch (type) {

                case 'on-dashboard':
                    return <DashboardPage supaInv={supaInv} mode={mode} setMode={setMode}  invitationID={invitationID} />

                case 'side-events':
                    return <SideEvents invitationID={invitationID} invitation={supaInv} mode={mode} setMode={setMode}  />

                case 'on-edit':
                    return <BuildPage invitationID={invitationID}  mode={mode} setMode={setMode} saved={saved} setSaved={setSaved} />

                case 'on-dashboard-guests':
                    return <GuestsPage invitationID={invitationID} invitation={supaInv} mode={mode} setMode={setMode}  />

                default:
                    return <DashboardPage supaInv={supaInv} mode={mode} setMode={setMode}  invitationID={invitationID} />
            }
        }

    }

    return (
        <div>

            {
                handleModule(mode)
            }

        </div>
    )
}
