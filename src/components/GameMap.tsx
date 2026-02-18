'use client';

import { GoogleMap, Marker, useLoadScript } from '@react-google-maps/api';
import { MapPin, Navigation } from 'lucide-react';
import { useMemo } from 'react';

interface GameMapProps {
    latitude: number;
    longitude: number;
    locationName: string;
}

const containerStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '0.25rem', // rounded-sm
};

const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
        {
            "elementType": "geometry",
            "stylers": [{ "color": "#212121" }]
        },
        {
            "elementType": "labels.icon",
            "stylers": [{ "visibility": "off" }]
        },
        {
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#757575" }]
        },
        {
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#212121" }]
        },
        {
            "featureType": "administrative",
            "elementType": "geometry",
            "stylers": [{ "color": "#757575" }]
        },
        {
            "featureType": "administrative.country",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#9e9e9e" }]
        },
        {
            "featureType": "administrative.land_parcel",
            "stylers": [{ "visibility": "off" }]
        },
        {
            "featureType": "administrative.locality",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#bdbdbd" }]
        },
        {
            "featureType": "poi",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#757575" }]
        },
        {
            "featureType": "poi.park",
            "elementType": "geometry",
            "stylers": [{ "color": "#181818" }]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#616161" }]
        },
        {
            "featureType": "poi.park",
            "elementType": "labels.text.stroke",
            "stylers": [{ "color": "#1b1b1b" }]
        },
        {
            "featureType": "road",
            "elementType": "geometry.fill",
            "stylers": [{ "color": "#2c2c2c" }]
        },
        {
            "featureType": "road",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#8a8a8a" }]
        },
        {
            "featureType": "road.arterial",
            "elementType": "geometry",
            "stylers": [{ "color": "#373737" }]
        },
        {
            "featureType": "road.highway",
            "elementType": "geometry",
            "stylers": [{ "color": "#3c3c3c" }]
        },
        {
            "featureType": "road.highway.controlled_access",
            "elementType": "geometry",
            "stylers": [{ "color": "#4e4e4e" }]
        },
        {
            "featureType": "road.local",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#616161" }]
        },
        {
            "featureType": "transit",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#757575" }]
        },
        {
            "featureType": "water",
            "elementType": "geometry",
            "stylers": [{ "color": "#000000" }]
        },
        {
            "featureType": "water",
            "elementType": "labels.text.fill",
            "stylers": [{ "color": "#3d3d3d" }]
        }
    ]
};

export function GameMap({ latitude, longitude, locationName }: GameMapProps) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    });

    const center = useMemo(() => ({ lat: latitude, lng: longitude }), [latitude, longitude]);

    if (!isLoaded) return <div className="h-64 bg-white/5 animate-pulse rounded-sm flex items-center justify-center text-gray-500 text-sm">Loading Map...</div>;

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    // Fallback if coords are 0,0 or undefined, maybe use name? But for now assume valid if component rendered.

    return (
        <div className="space-y-4">
            <div className="h-64 rounded-sm overflow-hidden border border-white/10 relative group">
                <GoogleMap
                    mapContainerStyle={containerStyle}
                    center={center}
                    zoom={15}
                    options={mapOptions}
                >
                    <Marker position={center} />
                </GoogleMap>

                {/* Overlay Button */}
                <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-4 right-4 bg-white text-black px-4 py-2 rounded-sm font-bold uppercase text-xs flex items-center gap-2 shadow-xl hover:bg-pitch-accent transition-colors z-10"
                >
                    <Navigation className="w-4 h-4" /> Get Directions
                </a>
            </div>

            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-pitch-accent" />
                    {locationName}
                </div>
            </div>
        </div>
    );
}
