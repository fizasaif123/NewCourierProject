'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Leaflet with Next.js
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface Location {
  name: string;
  coordinates: [number, number];
  status: string;
  destination: [number, number] | null;
}

interface CourierMapProps {
  locations: Location[];
}

export default function CourierMap({ locations }: CourierMapProps) {
  // Center the map on the UK
  const ukCenter: [number, number] = [54.5, -2];

  return (
    <MapContainer
      center={ukCenter}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {locations.map((location, index) => (
        <div key={index}>
          {/* Current location marker */}
          <Marker 
            position={location.coordinates}
            icon={icon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-bold text-lg">{location.name}</h3>
                <p className="text-sm text-gray-600">Status: {location.status}</p>
                {location.destination && (
                  <p className="text-sm text-gray-600">Has active delivery</p>
                )}
              </div>
            </Popup>
          </Marker>

          {/* Destination marker if exists */}
          {location.destination && (
            <Marker 
              position={location.destination}
              icon={icon}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-lg">Destination</h3>
                  <p className="text-sm text-gray-600">For: {location.name}</p>
                </div>
              </Popup>
            </Marker>
          )}
        </div>
      ))}
    </MapContainer>
  );
}