import React, { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const MapComponent = ({ direccion, numero, colonia, codigoPostal, ciudad, estado, pais }) => {
    const [coords, setCoords] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const geocodeAddress = async (address) => {
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                const data = await response.json();
                if (data.length > 0) {
                    return { lat: data[0].lat, lon: data[0].lon };
                } else {
                    throw new Error('No se encontraron resultados para la dirección proporcionada.');
                }
            } catch (error) {
                throw new Error('Error al comunicarse con el servicio de geocodificación.');
            }
        };

        const direccionCompleta = `${direccion} ${numero}, ${colonia}, ${codigoPostal}, ${ciudad}, ${estado}, ${pais}`;
        geocodeAddress(direccionCompleta)
            .then(coords => setCoords(coords))
            .catch(error => {
                console.error('Error geocoding address:', error);
                setError(error.message);
            });
    }, [direccion, numero, colonia, codigoPostal, ciudad, estado, pais]);

    useEffect(() => {
        if (coords) {
            const map = L.map('map').setView([coords.lat, coords.lon], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            L.marker([coords.lat, coords.lon]).addTo(map)
                .bindPopup('Ubicación geocodificada')
                .openPopup();
        }
    }, [coords]);

    return (
        <div>
            <h1>Mapa con Leaflet y Geocodificación</h1>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
            <div id="map" style={{ height: '500px', width: '100%' }}></div>
        </div>
    );
};

