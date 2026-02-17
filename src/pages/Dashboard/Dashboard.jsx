import { useEffect, useState } from "react";
import { DashboardPage } from "./DashboardPage";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { SideEvents } from "../../modules/SideEvents/SideEvents";
import { BuildPage } from "../../modules/Invitation/Build/PageSections/BuildPage";
import GuestsPage from "../../modules/GuestManagement/GuestsPage";
import { message } from "antd";

export const Dashboard = () => {
    const [mode, setMode] = useState("on-dashboard");
    const [saved, setSaved] = useState(true);
    const [supaInv, setSupaInv] = useState(null);
    const [invitationID, setInvitationID] = useState(null);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const id = searchParams.get("id");
    const sessionId = searchParams.get("session_id");
    const canceled = searchParams.get("canceled");

    const [messageApi, contextHolder] = message.useMessage();


    /* =========================
       GET INVITATION
    ========================== */

    const getNewInvitations = async () => {
        const { data, error } = await supabase
            .from("invitations")
            .select("data")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Error al obtener invitaciones:", error);
            return;
        }

        if (data) {
            setSupaInv(data.data);
            setInvitationID(id);
        }
    };

    /* =========================
       STRIPE SUCCESS / CANCEL
    ========================== */

    useEffect(() => {
        if (sessionId) {
            messageApi.success("Tu compra se realizó con éxito 🎉");
            console.log("Tu compra se realizó con éxito 🎉")

            searchParams.delete("session_id");
            setSearchParams(searchParams, { replace: true });
        }

        if (canceled === "true") {
            messageApi.warning("El pago fue cancelado");
            console.log("El pago fue cancelado");

            searchParams.delete("canceled");
            setSearchParams(searchParams, { replace: true });
        }
    }, [sessionId, canceled]);


    /* =========================
       LOAD INVITATION
    ========================== */

    useEffect(() => {
        if (id) {
            getNewInvitations();
        } else {
            navigate("/invitations");
        }
    }, [id]);

    /* =========================
       MODE HANDLER
    ========================== */

    useEffect(() => {
        if (mode === "my-invitations" || mode === "on-guests") {
            setSaved(true);
        }
    }, [mode]);

    const handleModule = (type) => {
        if (!id) return null;

        switch (type) {
            case "on-dashboard":
                return (
                    <DashboardPage
                        supaInv={supaInv}
                        mode={mode}
                        setMode={setMode}
                        invitationID={invitationID}
                    />
                );

            case "side-events":
                return (
                    <SideEvents
                        invitationID={invitationID}
                        invitation={supaInv}
                        mode={mode}
                        setMode={setMode}
                    />
                );

            case "on-edit":
                return (
                    <BuildPage
                        invitationID={invitationID}
                        mode={mode}
                        setMode={setMode}
                        saved={saved}
                        setSaved={setSaved}
                    />
                );

            case "on-dashboard-guests":
                return (
                    <GuestsPage
                        invitationID={invitationID}
                        invitation={supaInv}
                        mode={mode}
                        setMode={setMode}
                    />
                );

            default:
                return (
                    <DashboardPage
                        supaInv={supaInv}
                        mode={mode}
                        setMode={setMode}
                        invitationID={invitationID}
                    />
                );
        }
    };

    return <>
        {contextHolder}
        <div>{handleModule(mode)}</div>;
    </>
};
