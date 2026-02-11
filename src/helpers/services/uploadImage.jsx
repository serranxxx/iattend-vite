import imageCompression from 'browser-image-compression';
import { message } from 'antd';
import { supabase } from '../../lib/supabase';

export const uploadImagesSupabase = async ({
    file,
    invitationID,
    setImages
}) => {
    const MAX_SIZE_MB = 5;
    const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

    if (file.size > MAX_SIZE_BYTES) {
        message.warning({
            content: (
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', flexDirection: 'column' }}>
                    <span>La imagen pesa más de <b>5 MB</b></span>
                    <span>Reduce su tamaño en <a
                        href="https://squoosh.app"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        squoosh.app
                    </a></span>

                </div>
            ),
            duration: 6
        });

        return;
    }

    const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1600,
        initialQuality: 0.6,
        fileType: 'image/jpeg',
        useWebWorker: true,
    });

    const filePath = `${invitationID}/${Date.now()}-${compressedFile.name}`;

    const { error } = await supabase.storage
        .from('user_images')
        .upload(filePath, compressedFile, {
            upsert: true,
            contentType: compressedFile.type,
        });

    if (error) throw error;

    getImagesFromSupabase(invitationID, setImages);

    const { data } = supabase.storage
        .from('user_images')
        .getPublicUrl(filePath);

    return data.publicUrl;
};


export const getImagesFromSupabase = async (invitationID, setImages) => {
    const { data, error } = await supabase.storage
        .from('user_images')
        .list(invitationID, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' },
        });

    if (error) {
        console.error(error);
        return;
    }

    if (!data) {
        return;
    }

    const images = data.map((file) => {
        const path = `${invitationID}/${file.name}`;

        const { data: urlData } = supabase.storage
            .from('user_images')
            .getPublicUrl(path);

        return {
            path,
            url: urlData.publicUrl,
        };
    });

    setImages(images)
    console.log('alo')
};

const containsString = (obj, target) => {
    if (typeof obj === "string") {
        return obj === target;
    }

    if (Array.isArray(obj)) {
        return obj.some(item => containsString(item, target));
    }

    if (typeof obj === "object" && obj !== null) {
        return Object.values(obj).some(value => containsString(value, target));
    }

    return false;
}

export const deleteImageFromSupabase = async (path, invitationID, setImages) => {
    try {
        const longpath = `https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/user_images/${path}`;

        /* ─────────────── Invitación ─────────────── */
        const { data: invitation, error: invitationError } = await supabase
            .from("invitations")
            .select("data")
            .eq("id", invitationID)
            .maybeSingle();

        if (invitationError) {
            console.error("Error al obtener invitación:", invitationError.message);
            return;
        }

        const usedInInvitation = invitation?.data
            ? containsString(invitation.data, longpath)
            : false;

        /* ─────────────── Side events ─────────────── */
        const { data: sideEvents, error: sideEventsError } = await supabase
            .from("side_events")
            .select("*")
            .eq("invitation_id", invitationID);

        if (sideEventsError) {
            console.error("Error al obtener side_events:", sideEventsError.message);
            return;
        }

        const usedInSideEvents = sideEvents?.some(event =>
            containsString(event, longpath)
        );

        /* ─────────────── Validación final ─────────────── */
        if (usedInInvitation) {
            message.error("La imagen está siendo usada en la invitación.");
            return;
        }

        if (usedInSideEvents) {
            message.error("La imagen está siendo usada en side events.");
            return;
        }

        /* ─────────────── Eliminar imagen ─────────────── */
        const { error: removeError } = await supabase.storage
            .from("user_images")
            .remove([path]);

        if (removeError) {
            console.error("Error eliminando imagen:", removeError);
            message.error("Ocurrió un error al eliminar la imagen.");
            return;
        }

        getImagesFromSupabase(invitationID, setImages);
        message.success("Imagen eliminada correctamente.");

    } catch (err) {
        console.error("Error inesperado:", err);
        message.error("Error inesperado al eliminar la imagen.");
    }
};



