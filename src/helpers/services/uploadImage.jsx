import imageCompression from 'browser-image-compression';
import { message, Modal } from 'antd';
import { supabase } from '../../lib/supabase';
import { ensureQuota, storageChanged } from './storageQuota';

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

    // Límite de "Subidos" (10 MB / 30 MB) con el peso ya comprimido.
    if (!(await ensureQuota(invitationID, compressedFile.size))) return;

    const filePath = `${invitationID}/${Date.now()}-${compressedFile.name}`;

    const { error } = await supabase.storage
        .from('user_images')
        .upload(filePath, compressedFile, {
            upsert: true,
            contentType: compressedFile.type,
        });

    if (error) throw error;
    storageChanged();

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

/* ─────────────── ¿Dónde se usa un archivo? ─────────────── */
// Antes de borrar una foto o un video de "Subidos" se busca su URL en lo que
// lo puede usar: la invitación (todas sus secciones, también las ocultas), sus
// side events, su Save the Date y, en un Pop, el Pop. Si se usa, se dice
// dónde y se deja borrar de todos modos (esos lugares se quedan sin él).
const BASE_PUBLICA = 'https://jblcqcxckefmydvtrxbi.supabase.co/storage/v1/object/public/user_images/';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rutas ("cover.image.prod", "gallery.prod[0]"…) donde está `objetivo`.
const rutasCon = (obj, objetivo) => {
    const out = [];
    const r = (o, p) => {
        if (typeof o === 'string') { if (o === objetivo) out.push(p); return; }
        if (Array.isArray(o)) o.forEach((x, i) => r(x, `${p}[${i}]`));
        else if (o && typeof o === 'object') Object.entries(o).forEach(([k, v]) => r(v, p ? `${p}.${k}` : k));
    };
    r(obj, '');
    return out;
};

const SECCIONES = {
    cover: 'la portada', gallery: 'la galería', quote: 'la frase', itinerary: 'el itinerario',
    destinations: 'destinos', wallet: 'el pase digital', dresscode: 'el código de vestimenta',
    gifts: 'la mesa de regalos', greeting: 'el saludo', people: 'las personas', decorations: 'los elementos',
    notices: 'los avisos', song: 'la canción', generals: 'el diseño general',
};
const lugarEnInvitacion = (ruta) => {
    const k = ruta.split(/[.[]/)[0];
    return `${SECCIONES[k] ?? `la sección «${k}»`} de la invitación`;
};
const lugarEnSide = (ruta, nombre, esPop) => {
    const de = esPop ? '' : ` del side event «${nombre || 'sin nombre'}»`;
    if (ruta === 'url_image' || ruta.startsWith('body.linkImage')) return `la imagen del link${de}`;
    if (ruta.startsWith('body.wallet')) return `el pase digital${de}`;
    if (ruta.startsWith('body.stickers')) return `los elementos${de}`;
    if (/^body\.(image|images|video|poster)\b/.test(ruta)) return `la portada${de}`;
    return esPop ? 'el Pop' : `el side event «${nombre || 'sin nombre'}»`;
};

export const usosDeArchivo = async (carpeta, url) => {
    const c = String(carpeta ?? '');
    if (c.startsWith('flash-')) {
        const { data: pop, error } = await supabase.from('side_events').select('*').eq('id', c.slice('flash-'.length)).maybeSingle();
        if (error) throw error;
        return [...new Set(rutasCon(pop ?? {}, url).map((r) => lugarEnSide(r, pop?.name, true)))];
    }
    const id = c.startsWith('inv-') ? c.slice(4) : c;
    if (!UUID.test(id)) return [];
    const [inv, sides, std] = await Promise.all([
        supabase.from('invitations').select('data').eq('id', id).maybeSingle(),
        supabase.from('side_events').select('id, name, body, url_image').eq('invitation_id', id),
        supabase.from('save_the_dates').select('cover').eq('invitation_id', id).maybeSingle(),
    ]);
    if (inv.error) throw inv.error;
    if (sides.error) throw sides.error;
    return [...new Set([
        ...rutasCon(inv.data?.data ?? {}, url).map(lugarEnInvitacion),
        ...(sides.data ?? []).flatMap((s) => rutasCon({ body: s.body, url_image: s.url_image }, url).map((r) => lugarEnSide(r, s.name, false))),
        // Sin Save the Date (o sin permiso para leerlo) no cuenta.
        ...(!std.error && std.data?.cover && rutasCon(std.data.cover, url).length ? ['tu Save the Date'] : []),
    ])];
};

const enLista = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`);

// Borra una foto o un video de la carpeta: si se usa en algún lado, primero
// dice dónde y pide confirmar.
const borrarArchivo = async ({ path, carpeta, tipo, alTerminar }) => {
    const esVideo = tipo === 'video';
    const eliminar = async () => {
        const { error } = await supabase.storage.from('user_images').remove([path]);
        if (error) {
            console.error('Error eliminando archivo:', error);
            message.error(esVideo ? 'Ocurrió un error al eliminar el video.' : 'Ocurrió un error al eliminar la imagen.');
            return;
        }
        storageChanged();
        alTerminar?.();
        message.success(esVideo ? 'Video eliminado.' : 'Imagen eliminada.');
    };
    let usos;
    try {
        usos = await usosDeArchivo(carpeta, `${BASE_PUBLICA}${path}`);
    } catch (err) {
        console.error('No se pudo revisar dónde se usa:', err?.message ?? err);
        message.error(esVideo ? 'No se pudo revisar si el video está en uso.' : 'No se pudo revisar si la imagen está en uso.');
        return;
    }
    if (!usos.length) { await eliminar(); return; }
    Modal.confirm({
        title: esVideo ? 'Este video está en uso' : 'Esta imagen está en uso',
        content: `Se usa en ${enLista(usos)}. Si la borras, ${usos.length === 1 ? 'ese lugar se queda' : 'esos lugares se quedan'} sin ${esVideo ? 'video' : 'imagen'}.`,
        okText: 'Borrar de todos modos',
        okButtonProps: { danger: true },
        cancelText: 'Cancelar',
        onOk: eliminar,
    });
};

export const deleteImageFromSupabase = async (path, invitationID, setImages) => {
    // Carpeta temporal del Save the Date gratis: todavía no hay evento
    // contra el que validar el uso, así que se borra directo.
    if (String(invitationID).startsWith('temp/')) {
        const { error } = await supabase.storage.from('user_images').remove([path]);
        if (error) {
            message.error('No se pudo borrar la imagen.');
            return;
        }
        message.success('Imagen eliminada correctamente.');
        storageChanged();
        getImagesFromSupabase(invitationID, setImages);
        return;
    }
    await borrarArchivo({ path, carpeta: invitationID, tipo: 'imagen', alTerminar: () => getImagesFromSupabase(invitationID, setImages) });
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

    if (!(await ensureQuota(invitationID, file.size))) return null;

    const filePath = `${invitationID}/video/${Date.now()}-${file.name}`;

    // Un año de caché: el nombre lleva la hora de subida, así que nunca cambia
    // de contenido. Sin esto Storage lo sirve con no-cache y el invitado lo
    // vuelve a bajar completo en cada visita.
    const { error } = await supabase.storage
        .from('user_images')
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: '31536000',
        });

    if (error) throw error;
    storageChanged();

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
    await borrarArchivo({ path, carpeta: invitationID, tipo: 'video', alTerminar: () => getVideosFromSupabase(invitationID, setVideos) });
};

// Logo de una marca de la mesa de regalos (catálogo gift_brands).
// Mismo bucket que las texturas; los PNG originales vivían en
// iattend-events/public/assets/banks antes de mover el catálogo a Supabase.
export const uploadGiftBrandLogo = async (file) => {
    const isPng = file.type === 'image/png';
    const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 600,
        initialQuality: 0.9,
        fileType: isPng ? 'image/png' : 'image/jpeg',
        useWebWorker: true,
    });

    const filePath = `GiftBrands/${Date.now()}-${compressedFile.name}`;

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

// Fotos del Photo Wall del onboarding (Admin → Onboarding). Van al bucket
// público `assets`, junto a las texturas y los logos de marcas.
export const uploadOnboardingPhoto = async (file) => {
    const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.6,
        maxWidthOrHeight: 1400,
        initialQuality: 0.85,
        fileType: 'image/jpeg',
        useWebWorker: true,
    });

    const nombre = compressedFile.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40)
    const filePath = `Onboarding/${Date.now()}-${nombre || 'foto'}.jpg`;

    const { error } = await supabase.storage
        .from('assets')
        .upload(filePath, compressedFile, {
            upsert: true,
            contentType: 'image/jpeg',
        });

    if (error) throw error;

    const { data } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

    return data.publicUrl;
};


/* ─────────────── Stickers (PNG de un Pop) ─────────────── */
// Un PNG pegado pesaba ~1 MB y en el teléfono nunca se ve a más de ~1200 px:
// se guarda como WebP con transparencia de 1200 px como máximo (~100 KB).
// Si el navegador no sabe codificar WebP (Safari viejo), queda PNG achicado.
const STICKER_MAX_PX = 1200;

export const aligerarSticker = async (file) => {
    const ligero = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: STICKER_MAX_PX,
        initialQuality: 0.85,
        fileType: 'image/webp',
        useWebWorker: true,
    });
    const ext = ligero.type === 'image/webp' ? 'webp' : 'png';
    return new File([ligero], `sticker.${ext}`, { type: ligero.type });
};

// Sube un sticker ya aligerado a la carpeta del evento y regresa su URL pública.
export const subirSticker = async (file, carpeta) => {
    const ligero = await aligerarSticker(file);
    // Stickers de una invitación (`inv-{id}`) cuentan para su límite.
    if (!(await ensureQuota(carpeta, ligero.size))) return null;
    const filePath = `${carpeta}/${Date.now()}-${ligero.name}`;
    const { error } = await supabase.storage
        .from('user_images')
        .upload(filePath, ligero, { upsert: true, contentType: ligero.type });
    if (error) throw error;
    storageChanged();
    return supabase.storage.from('user_images').getPublicUrl(filePath).data.publicUrl;
};

// Vector (SVG) del panel Subidos: se sube tal cual (sin aligerar a WebP, que
// lo convertiría en imagen y ya no se podría pintar de otro color). En la
// pieza va como ícono pintado con `mask-image` del color del elemento.
export const subirVector = async (file, carpeta) => {
    if (!(await ensureQuota(carpeta, file.size))) return null;
    const nombre = file.name.replace(/[^a-z0-9._-]+/gi, '-');
    const filePath = `${carpeta}/${Date.now()}-${nombre.endsWith('.svg') ? nombre : `${nombre}.svg`}`;
    const { error } = await supabase.storage
        .from('user_images')
        .upload(filePath, file, { upsert: true, contentType: 'image/svg+xml' });
    if (error) throw error;
    storageChanged();
    return supabase.storage.from('user_images').getPublicUrl(filePath).data.publicUrl;
};

// Desde "Mis imágenes" llega una URL (a veces un PNG pesado): si no es WebP,
// se baja, se aligera y se sube como sticker nuevo. Si algo falla, se usa tal cual.
export const stickerLigeroDesdeUrl = async (url, carpeta) => {
    if (/\.webp($|\?)/i.test(url)) return url;
    try {
        const r = await fetch(url);
        const blob = await r.blob();
        return await subirSticker(new File([blob], 'sticker', { type: blob.type || 'image/png' }), carpeta);
    } catch (err) {
        console.error(err);
        return url;
    }
};

/* ─────────────── Logos de patrocinadores (Pop) ─────────────── */
// Van a la carpeta del Pop (`flash-<id>/sponsors/…`), así cuentan para su
// espacio de Subidos. Un SVG se rasteriza aquí (canvas, 800 px del lado
// mayor): nunca se sube el archivo tal cual. Todo se aligera como un sticker
// (WebP con transparencia). Regresa { url, w, h } con el tamaño natural.
const LOGO_SVG_PX = 800;

const medidasSvg = (texto) => {
    try {
        const svg = new DOMParser().parseFromString(texto, 'image/svg+xml').documentElement;
        const num = (v) => (v && !String(v).includes('%') ? parseFloat(v) : NaN);
        const w = num(svg.getAttribute('width'));
        const h = num(svg.getAttribute('height'));
        if (w > 0 && h > 0) return { w, h };
        const vb = (svg.getAttribute('viewBox') ?? '').split(/[\s,]+/).map(Number);
        if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) return { w: vb[2], h: vb[3] };
    } catch { /* sin medidas: cuadrado */ }
    return { w: 1, h: 1 };
};

const rasterizarSvg = async (file) => {
    const texto = await file.text();
    const { w, h } = medidasSvg(texto);
    const escala = LOGO_SVG_PX / Math.max(w, h);
    const ancho = Math.max(1, Math.round(w * escala));
    const alto = Math.max(1, Math.round(h * escala));
    const url = URL.createObjectURL(new Blob([texto], { type: 'image/svg+xml' }));
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = ancho;
        canvas.height = alto;
        canvas.getContext('2d').drawImage(img, 0, 0, ancho, alto);
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
        return new File([blob], 'logo.png', { type: 'image/png' });
    } finally {
        URL.revokeObjectURL(url);
    }
};

const tamanoNatural = async (file) => {
    try {
        const bmp = await createImageBitmap(file);
        const t = { w: bmp.width, h: bmp.height };
        bmp.close?.();
        return t;
    } catch {
        return { w: 0, h: 0 };
    }
};

export const subirLogoPatrocinador = async (file, carpeta) => {
    const esSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    const imagen = esSvg ? await rasterizarSvg(file) : file;
    const ligero = await aligerarSticker(imagen);
    if (!(await ensureQuota(carpeta, ligero.size))) return null;
    const { w, h } = await tamanoNatural(ligero);
    const base = (file.name.replace(/\.[^.]+$/, '') || 'logo').replace(/[^a-z0-9_-]+/gi, '-').slice(0, 40);
    const filePath = `${carpeta}/sponsors/${Date.now()}-${base}.${ligero.name.split('.').pop()}`;
    const { error } = await supabase.storage
        .from('user_images')
        .upload(filePath, ligero, { upsert: true, contentType: ligero.type });
    if (error) throw error;
    storageChanged();
    return { url: supabase.storage.from('user_images').getPublicUrl(filePath).data.publicUrl, w, h };
};
