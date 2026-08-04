import { message } from 'antd';
import { supabase } from '../../lib/supabase';

const MAX_SIZE_MB = 8;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

export const uploadSongAudio = async ({ file, invitationID }) => {
    if (file.size > MAX_SIZE_BYTES) {
        message.warning(`El audio pesa más de ${MAX_SIZE_MB} MB. Sube un clip más corto.`);
        return null;
    }

    const filePath = `${invitationID}/audio/${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
        .from('user_images')
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
        });

    if (error) throw error;

    const { data } = supabase.storage
        .from('user_images')
        .getPublicUrl(filePath);

    return data.publicUrl;
};
