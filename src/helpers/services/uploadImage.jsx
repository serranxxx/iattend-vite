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

    const isPng = file.type === 'image/png';
    const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 2000,
        initialQuality: 0.85,
        fileType: isPng ? 'image/png' : 'image/jpeg',
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


export const uploadTextureImage = async (file) => {
    const isPng = file.type === 'image/png';
    const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 2000,
        initialQuality: 0.85,
        fileType: isPng ? 'image/png' : 'image/jpeg',
        useWebWorker: true,
    });

    const filePath = `Textures/${Date.now()}-${compressedFile.name}`;

    const { error } = await supabase.storage
        .from('assets')
        .upload(filePath, compressedFile, {
            upsert: true,
            contentType: compressedFile.type,
        });

    if (error) throw error;

    const { data } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

    return { url: data.publicUrl, path: filePath };
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

    // Las subcarpetas (`audio`, `video`) también vienen en el listado y sin
    // filtrarlas se dibujan como tiles roros; los medios que no son imagen
    // no deben aparecer en un picker de imágenes.
    const onlyImages = data.filter((file) => (
        file.id !== null && !/\.(mp4|webm|mov|m4v|mp3|wav|m4a|aac|ogg)$/i.test(file.name)
    ));

    const images = onlyImages.map((file) => {
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
        // Carpeta temporal del Save the Date gratis: todavía no hay evento
        // contra el que validar el uso, así que se borra directo.
        if (String(invitationID).startsWith('temp/')) {
            const { error } = await supabase.storage.from('user_images').remove([path]);
            if (error) {
                message.error('No se pudo borrar la imagen.');
                return;
            }
            message.success('Imagen eliminada correctamente.');
            getImagesFromSupabase(invitationID, setImages);
            return;
        }

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

export const getCoversFromSubapase = async (setImages) => {
    const { data, error } = await supabase.storage
        .from('assets')
        .list('Covers');

    if (error) return console.error(error);

    const images = data.map(file => {
        const { data } = supabase.storage
            .from('assets')
            .getPublicUrl(`Covers/${file.name}`);

        return data.publicUrl;
    });

    setImages(images)
}

export const getQuotesFromSubapase = async (setImages) => {
    const { data, error } = await supabase.storage
        .from('assets')
        .list('Quote');

    if (error) return console.error(error);

    const images = data.map(file => {
        const { data } = supabase.storage
            .from('assets')
            .getPublicUrl(`Quote/${file.name}`);

        return data.publicUrl;
    });

    setImages(images)
}

export const getDresscodesFromSupabase = async (setImages) => {
    const { data, error } = await supabase.storage
        .from('assets')
        .list('Dresscode');

    if (error) {
        console.error(error);
        return;
    }

    const blackTie = [];
    const cocktail = [];
    const formal = [];

    data.forEach(file => {
        const { data: urlData } = supabase.storage
            .from('assets')
            .getPublicUrl(`Dresscode/${file.name}`);

        const url = urlData.publicUrl;

        if (file.name.startsWith('black_tie')) {
            blackTie.push(url);
        } else if (file.name.startsWith('cocktail')) {
            cocktail.push(url);
        } else if (file.name.startsWith('formal')) {
            formal.push(url);
        }
    });

    setImages([blackTie, cocktail, formal]);
};

/* ── Video del Save the Date ──────────────────────────────────────────────
   Vive en `{invitationID}/video/` por la misma razón que el audio: el listado
   de imágenes lee solo la raíz de la carpeta, así que los pickers de solo
   imagen no lo muestran. Sin compresión: browser-image-compression es solo
   para imágenes. */

const MAX_VIDEO_MB = 25;
const MAX_VIDEO_SECONDS = 5;

// Duración real del archivo, leída del metadata antes de subir nada. Si el
// navegador no puede decodificarlo devuelve null y se deja pasar: mejor que
// bloquear una subida válida por un formato que no sabe previsualizar.
const readVideoDuration = (file) => new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    const done = (value) => { URL.revokeObjectURL(url); resolve(value); };
    probe.onloadedmetadata = () => done(Number.isFinite(probe.duration) ? probe.duration : null);
    probe.onerror = () => done(null);
    probe.src = url;
});

export const uploadEventVideo = async ({ file, invitationID, setVideos }) => {
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
        message.warning(`El video pesa más de ${MAX_VIDEO_MB} MB. Sube un clip más corto o comprímelo.`);
        return null;
    }

    // Medio segundo de tolerancia: un clip "de 5s" suele venir en 5.02 y
    // rechazarlo por eso sería incomprensible para quien lo recortó.
    const duration = await readVideoDuration(file);
    if (duration !== null && duration > MAX_VIDEO_SECONDS + 0.5) {
        message.warning(`El video dura ${duration.toFixed(1)}s. El máximo son ${MAX_VIDEO_SECONDS} segundos.`);
        return null;
    }

    const filePath = `${invitationID}/video/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
        .from('user_images')
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
        });

    if (error) throw error;

    if (setVideos) getVideosFromSupabase(invitationID, setVideos);

    const { data } = supabase.storage
        .from('user_images')
        .getPublicUrl(filePath);

    return data.publicUrl;
};

export const getVideosFromSupabase = async (invitationID, setVideos) => {
    if (!invitationID) return;

    const { data, error } = await supabase.storage
        .from('user_images')
        .list(`${invitationID}/video`, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' },
        });

    if (error) {
        console.error(error);
        return;
    }

    // Como en el listado de imágenes: Storage devuelve también el marcador de
    // carpeta vacía (`id: null`) y cualquier archivo suelto; solo van los videos.
    const onlyVideos = (data ?? []).filter((file) => (
        file.id !== null && /\.(mp4|webm|mov|m4v)$/i.test(file.name)
    ));

    const videos = onlyVideos.map((file) => {
        const path = `${invitationID}/video/${file.name}`;
        const { data: urlData } = supabase.storage
            .from('user_images')
            .getPublicUrl(path);
        return { path, url: urlData.publicUrl };
    });

    setVideos(videos);
};

export const deleteVideoFromSupabase = async (path, invitationID, setVideos) => {
    try {
        const longpath = `https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/user_images/${path}`;

        /* ─── ¿lo está usando el Save the Date? ─── */
        const { data: std, error: stdError } = await supabase
            .from("save_the_dates")
            .select("cover")
            .eq("invitation_id", invitationID)
            .maybeSingle();

        if (stdError) {
            console.error("Error al obtener save the date:", stdError.message);
            return;
        }

        if (std?.cover && containsString(std.cover, longpath)) {
            message.error("El video está siendo usado en tu Save the Date.");
            return;
        }

        /* ─── Eliminar ─── */
        const { error: removeError } = await supabase.storage
            .from("user_images")
            .remove([path]);

        if (removeError) {
            console.error("Error eliminando video:", removeError);
            message.error("Ocurrió un error al eliminar el video.");
            return;
        }

        getVideosFromSupabase(invitationID, setVideos);
        message.success("Video eliminado correctamente.");

    } catch (err) {
        console.error("Error inesperado:", err);
        message.error("Error inesperado al eliminar el video.");
    }
};

