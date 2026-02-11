
function SpotifyWidget({ url }) {


    function extractSpotifyPath(url) {

        try {
            const parsedUrl = new URL(url);
            // Obtenemos la ruta (pathname) y la búsqueda (search) de la URL
            const path = parsedUrl.pathname;
            const search = parsedUrl.search;
            // Concatenamos la ruta y la búsqueda para obtener el resultado deseado
            return path.substring(1) + search;
        } catch {
            return ''
        }



    }

    // Ejemplo de uso




    // https://open.spotify.com/album/1xJHno7SmdVtZAtXbdbDZp?si=e5ztPl0VQLaduNB5zuBJTA

    // <iframe style="border-radius:12px" src="https://open.spotify.com/embed/album/1xJHno7SmdVtZAtXbdbDZp?utm_source=generator" width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>

    // Example usage in a React component

    // function obtenerIdPlaylist(url) {
    //     // Expresión regular para encontrar el ID de la playlist en la URL
    //     const regex = /playlist\/([a-zA-Z0-9]+)/;
    //     // Buscar el ID de la playlist en la URL usando la expresión regular
    //     const match = url.match(regex);
    //     // Si se encuentra coincidencia, devolver el ID de la playlist; de lo contrario, devolver null
    //     return match ? match[1] : null;
    // }


    return (

        <>
            {
                url[0] ?
                    <iframe
                        style={{ borderRadius: '12px', zIndex: '2' }}
                        src={`https://open.spotify.com/embed/${extractSpotifyPath(url[0])}&theme=2`}
                        width="97%" height="152" frameBorder="0"
                        allowfullscreen=""
                        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                        loading="lazy">
                    </iframe>
                    : <></>

            }

        </>
    );
}



export default SpotifyWidget;