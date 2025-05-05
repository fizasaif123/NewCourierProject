import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface LiveMapProps {
  pods: Array<{
    id: string;
    location: {
      coordinates: [number, number];
      address: string;
    };
    orderReference: string;
    status: string;
    driver: {
      name: string;
    };
  }>;
  onPODSelect: (pod: any) => void;
}

export function LiveMap({ pods, onPODSelect }: LiveMapProps) {
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) {
      // Center map on London
      mapRef.current = L.map('pod-map').setView([51.505, -0.09], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(mapRef.current);

      // Add markers for each POD
      pods.forEach(pod => {
        // Convert coordinates array to LatLng
        const latLng = L.latLng(pod.location.coordinates[0], pod.location.coordinates[1]);
        
        // Create marker with correct coordinates
        const marker = L.marker(latLng).addTo(mapRef.current!);
        
        const popupContent = `
          <div class="p-2">
            <h3 class="font-bold">${pod.orderReference}</h3>
            <p class="text-sm">Driver: ${pod.driver.name}</p>
            <p class="text-sm">Location: ${pod.location.address}</p>
            <p class="text-sm">Status: ${pod.status}</p>
            ${pod.status === 'delivered' ? `
              <button class="mt-2 text-sm text-blue-600 hover:text-blue-800 underline">
                View POD
              </button>
            ` : ''}
          </div>
        `;

        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const button = document.querySelector('.leaflet-popup-content button');
          if (button && pod.status === 'delivered') {
            button.addEventListener('click', () => onPODSelect(pod));
          }
        });
      });
    }

    // Cleanup function
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [pods, onPODSelect]);

  return <div id="pod-map" className="w-full h-full rounded-lg" />;
} 