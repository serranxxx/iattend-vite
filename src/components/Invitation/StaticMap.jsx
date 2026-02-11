import React, { useEffect } from 'react';

function MapaInteractivo({ direccion, numero, colonia, codigoPostal, ciudad, estado }) {
    useEffect(() => {
        const obtenerCoordenadas = () => {
            // Construir la URL para la geocodificación
            const direccionCompleta = `${direccion}, ${numero}, ${colonia}, ${codigoPostal}, ${ciudad}, ${estado}`;
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(direccionCompleta)}&key=AIzaSyBZ8NLpvAl4DiTeE2gYekBqhmSZFx43R0M`;

            // Realizar la solicitud HTTP para obtener las coordenadas
            fetch(url)
                .then(response => response.json())
                .then(data => {
                    // Verificar si se encontraron resultados de geocodificación
                    if (data.status === 'OK' && data.results.length > 0) {
                        const location = data.results[0].geometry.location;
                        const lat = location.lat;
                        const lng = location.lng;

                        // Inicializar el mapa con las coordenadas obtenidas
                        const map = new window.google.maps.Map(document.getElementById('map'), {
                            center: { lat: lat, lng: lng },
                            zoom: 12
                        });
                    } else {
                        console.error('No se encontraron resultados de geocodificación.');
                    }
                })
                .catch(error => console.error('Error al obtener las coordenadas:', error));
        };

        // Verificar si la API de Google Maps ya está cargada
        if (!window.google) {
            // Si no está cargada, cargar la API de Google Maps
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBZ8NLpvAl4DiTeE2gYekBqhmSZFx43R0M&libraries=places`;
            script.async = true;
            script.onload = obtenerCoordenadas;
            document.body.appendChild(script);
        } else {
            // Si ya está cargada, obtener las coordenadas directamente
            obtenerCoordenadas();
        }
    }, [direccion, numero, colonia, codigoPostal, ciudad, estado]);

    return (
        <div>
            <div id="map" style={{ height: '110%', width: '110%' }}></div>
        </div>
    );
}

export default MapaInteractivo;
