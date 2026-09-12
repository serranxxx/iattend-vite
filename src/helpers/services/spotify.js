// Búsqueda de canciones con la API oficial de Spotify (client credentials).
// Extraído de BuildGenerals para poder reusarlo desde el editor del Save the
// Date sin duplicar el manejo del token.

const _spotifyTokenCache = { token: null, expiry: 0 };

async function getSpotifyToken() {
    if (_spotifyTokenCache.token && Date.now() < _spotifyTokenCache.expiry) {
        return _spotifyTokenCache.token;
    }
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;
    const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        },
        body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    _spotifyTokenCache.token = data.access_token;
    _spotifyTokenCache.expiry = Date.now() + (data.expires_in - 60) * 1000;
    return data.access_token;
}

export async function searchSpotifyTracks(query) {
    const token = await getSpotifyToken();
    const res = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=5`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    return data.tracks?.items ?? [];
}
