'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issue
const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
};

interface Location {
  name: string;
  coordinates: [number, number];
  products?: number;
  revenue?: number;
  utilization?: number;
}

interface WarehouseMapProps {
  locations: Location[];
}

export default function WarehouseMap({ locations }: WarehouseMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fixLeafletIcon();

    // Wait for the container to be in the DOM
    if (!mapContainerRef.current) return;

    // Initialize map if not already initialized
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current).setView([51.505, -0.09], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);
    }

    // Clear existing markers
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        layer.remove();
      }
    });

    // Add markers for each location
    locations.forEach(location => {
      if (location.coordinates && Array.isArray(location.coordinates)) {
        const marker = L.marker(location.coordinates).addTo(mapRef.current!);
        
        // Create popup content
        const popupContent = `
          <div class="p-2">
            <h3 class="font-bold">${location.name}</h3>
            ${location.products !== undefined ? `<p>Products: ${location.products}</p>` : ''}
            ${location.revenue !== undefined ? `<p>Revenue: £${location.revenue.toLocaleString()}</p>` : ''}
            ${location.utilization !== undefined ? `<p>Utilization: ${location.utilization}%</p>` : ''}
          </div>
        `;
        
        marker.bindPopup(popupContent);
      }
    });

    // Fit bounds to show all markers
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map(loc => loc.coordinates));
      mapRef.current.fitBounds(bounds);
    }

    // Handle window resize
    const handleResize = () => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [locations]);

  return (
    <div 
      ref={mapContainerRef} 
      className="h-full w-full min-h-[400px]" 
      style={{ position: 'relative', zIndex: 0 }}
    />
  );
} 