// SHA1 sobre JSON.stringify(value), mismo algoritmo que usa iattend-events
// (src/lib/translation/cache.ts y copy-cache.ts) para poder comparar hashes
// calculados en cada lado sin depender de una llamada de red.
export async function sha1(value) {
  const data = new TextEncoder().encode(JSON.stringify(value ?? null));
  const digest = await window.crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
