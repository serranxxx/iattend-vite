import { useEffect, useRef } from 'react'

const GOOGLE_API_KEY = 'AIzaSyBZ8NLpvAl4DiTeE2gYekBqhmSZFx43R0M'

const loadGoogleMaps = (callback) => {
    if (window.google?.maps?.places) {
        callback()
        return
    }
    const existing = document.getElementById('google-maps-places-script')
    if (existing) {
        existing.addEventListener('load', callback)
        return
    }
    const script = document.createElement('script')
    script.id = 'google-maps-places-script'
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`
    script.async = true
    script.onload = callback
    document.body.appendChild(script)
}

export const AddressAutocomplete = ({ onSelect, className = 'sidee_autocomplete_input', placeholder = 'Buscar dirección...' }) => {
    const inputRef = useRef(null)

    useEffect(() => {
        const init = () => {
            if (!inputRef.current) return
            const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
                fields: ['address_components', 'url', 'name'],
            })
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace()
                if (!place.address_components) return

                const get = (type) =>
                    place.address_components.find(c => c.types.includes(type))?.long_name ?? ''

                // Google no siempre trae número, colonia o código postal (una
                // carretera, un rancho, un salón). La tarjeta de ubicación pide la
                // dirección completa (direccionCompleta en tarjetasSide.js), así
                // que lo que falte se rellena con algo razonable que el
                // organizador puede corregir en "Agregar manual".
                const ciudad = get('locality') || get('administrative_area_level_2')
                const estado = get('administrative_area_level_1')
                onSelect({
                    street: get('route') || place.name || 'Domicilio conocido',
                    number: get('street_number') || 'S/N',
                    neighborhood:
                        get('sublocality_level_1') || get('neighborhood') || get('sublocality') || 'Centro',
                    city: ciudad || estado || 'Ciudad',
                    state: estado || ciudad || 'Estado',
                    country: get('country') || 'México',
                    zipcode: get('postal_code') || '00000',
                    url: place.url ?? '',
                })

                inputRef.current.value = ''
            })
        }

        loadGoogleMaps(init)
    }, [])

    return (
        <input
            ref={inputRef}
            placeholder={placeholder}
            className={className}
            style={{height:'30px', padding:'0px 12px', maxWidth:'100%', boxSizing:'border-box'}}
        />
    )
}
