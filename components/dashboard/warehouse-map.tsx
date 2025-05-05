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
  products: number;
  revenue: number;
  utilization: number;
}

interface WarehouseMapProps {
  locations: Location[];
}

export default function WarehouseMap({ locations }: WarehouseMapProps) {
  // Center the map on the UK
  const ukCenter: [number, number] = [54.5, -2];

  // Generate a unique key for the map container
  const mapKey = JSON.stringify(locations.map(l => l.coordinates));

  return (
    <div key={mapKey} className="h-full w-full">
      <MapContainer
        center={ukCenter}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg shadow-md"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map(location => (
          <Marker
            key={location.name}
            position={location.coordinates}
            icon={icon}
          >
            <Popup>
              <div className="p-2">
                <h3 className="font-semibold">{location.name}</h3>
                <p className="text-sm">Products in stock: {location.products.toLocaleString()}</p>
                <p className="text-sm">Revenue: £{location.revenue.toLocaleString()}</p>
                <p className="text-sm">Utilization: {location.utilization}%</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}