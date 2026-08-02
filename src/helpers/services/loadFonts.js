import { supabase } from "../../lib/supabase";

const CACHE_KEY = "iattend_fonts_cache";
const CACHE_TTL_MS = 60 * 60 * 1000;
const LINK_ID = "google-fonts-dynamic";

// Fallback duro: si Supabase falla o la cache está vacía, se usan estas 26
// fonts (las mismas que hoy están hardcodeadas en index.html) para que un
// fallo de red no deje a la plataforma sin fuentes.
const FALLBACK_FONTS = [
  { family: "Anton SC", google_axis: null },
  { family: "Kaisei Opti", google_axis: null },
  { family: "Lilita One", google_axis: null },
  { family: "Outfit", google_axis: "wght@100..900" },
  { family: "Poppins", google_axis: "ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900" },
  { family: "Libre Franklin", google_axis: "ital,wght@0,100..900;1,100..900" },
  { family: "Signika", google_axis: "wght@300..700" },
  { family: "Comfortaa", google_axis: "wght@300..700" },
  { family: "DM Serif Display", google_axis: "ital@0;1" },
  { family: "Dancing Script", google_axis: "wght@400..700" },
  { family: "Libre Baskerville", google_axis: "ital,wght@0,400;0,700;1,400" },
  { family: "Mulish", google_axis: "ital,wght@0,200..1000;1,200..1000" },
  { family: "Noto Sans", google_axis: "ital,wght@0,100..900;1,100..900" },
  { family: "Open Sans", google_axis: "ital,wght@0,300..800;1,300..800" },
  { family: "Platypi", google_axis: "ital,wght@0,300..800;1,300..800" },
  { family: "Playfair Display", google_axis: "ital,wght@0,400..900;1,400..900" },
  { family: "Quicksand", google_axis: "wght@300..700" },
  { family: "Roboto", google_axis: "ital,wght@0,100;0,300;0,400;0,500;0,700;0,900;1,100;1,300;1,400;1,500;1,700;1,900" },
  { family: "Sedan", google_axis: "ital@0;1" },
  { family: "Work Sans", google_axis: "ital,wght@0,100..900;1,100..900" },
  { family: "Cedarville Cursive", google_axis: null },
  { family: "Edu NSW ACT Cursive", google_axis: "wght@400..700" },
  { family: "Fredoka", google_axis: "wght@300..700" },
  { family: "Tangerine", google_axis: "wght@400;700" },
  { family: "WindSong", google_axis: "wght@400;500" },
  { family: "Monsieur La Doulaise", google_axis: null },
];

function buildHref(fonts) {
  const query = fonts
    .map(
      (f) =>
        `family=${encodeURIComponent(f.family)}${f.google_axis ? ":" + f.google_axis : ""}`
    )
    .join("&");
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}

function injectLink(fonts) {
  const href = buildHref(fonts);
  let link = document.getElementById(LINK_ID);
  if (link && link.getAttribute("href") === href) return;
  if (!link) {
    link = document.createElement("link");
    link.id = LINK_ID;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = href;
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(fonts, ts) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fonts, ts }));
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) — no es crítico.
  }
}

async function fetchActiveFonts() {
  const { data, error } = await supabase
    .from("fonts")
    .select("family, google_axis, source")
    .eq("active", true);
  if (error || !data) return null;
  // Fonts self-hosted (@font-face propio) o del sistema operativo no se
  // piden a Google — ya se cargan por su cuenta o no requieren carga.
  const googleFonts = data.filter((f) => !f.source || f.source === "google_fonts");
  if (googleFonts.length === 0) return null;
  return googleFonts;
}

export function initGoogleFonts() {
  const cache = readCache();
  const ts = Date.now();

  injectLink(cache?.fonts?.length ? cache.fonts : FALLBACK_FONTS);

  const isStale = !cache || ts - cache.ts > CACHE_TTL_MS;
  if (!isStale) return;

  fetchActiveFonts()
    .then((fonts) => {
      if (!fonts) return;
      injectLink(fonts);
      writeCache(fonts, ts);
    })
    .catch(() => {
      // Fetch falló: se queda lo ya inyectado (cache o fallback).
    });
}
