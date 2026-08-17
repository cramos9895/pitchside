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

const LIBRARIES: ("places")[] = ["places"];

export function GameMap({ latitude, longitude, locationName }: GameMapProps) {
    const { isLoaded } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: LIBRARIES,
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
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm pt-1">
                <div className="flex items-center gap-2 text-gray-300">
                    <MapPin className="w-4 h-4 text-pitch-accent shrink-0" />
                    <span className="truncate">{locationName}</span>
                </div>
                {latitude && longitude && (
                    <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold uppercase tracking-wider text-pitch-accent hover:underline shrink-0"
                    >
                        Get Directions →
                    </a>
                )}
            </div>

            {/* Statutory Route Guidance Notice (Apple DPLA 3.3.26) */}
            <p className="text-[10px] text-gray-500 font-mono tracking-tight uppercase leading-tight">
                YOUR USE OF THIS REAL TIME ROUTE GUIDANCE APPLICATION IS AT YOUR SOLE RISK. LOCATION DATA MAY NOT BE ACCURATE.
            </p>
        </div>
    );
}
