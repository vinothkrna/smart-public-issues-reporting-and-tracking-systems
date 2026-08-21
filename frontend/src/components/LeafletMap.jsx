import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

const CATEGORY_COLORS = {
  'Pothole': '#ef4444',             // Red
  'Garbage Dump': '#f59e0b',        // Amber
  'Water Leakage': '#0ea5e9',       // Cyan
  'Streetlight Failure': '#8b5cf6', // Violet
  'Drainage Blockage': '#10b981',   // Emerald
  'Other': '#64748b'
};

function createPinIcon(category) {
  const color = CATEGORY_COLORS[category] || '#4f46e5';
  return L.divIcon({
    className: 'react-leaflet-pin',
    html: `<div style="
      background-color: ${color};
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    "><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28]
  });
}

export default function LeafletMap({ 
  issues = [], 
  onSelectIssue, 
  isPicker = false, 
  initialCoords = [11.3410, 77.7172],
  onLocationPicked,
  height = '420px'
}) {
  const navigate = useNavigate();
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current).setView(initialCoords, 13);
    mapInstanceRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // If Location Picker Mode
    if (isPicker) {
      const marker = L.marker(initialCoords, { draggable: true }).addTo(map);
      markerRef.current = marker;

      const updatePos = (lat, lng) => {
        if (onLocationPicked) {
          onLocationPicked(lat, lng);
        }
      };

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updatePos(lat, lng);
      });

      marker.on('dragend', () => {
        const { lat, lng } = marker.getLatLng();
        updatePos(lat, lng);
      });
    } 
    // If Display Mode
    else if (issues.length > 0) {
      const bounds = [];
      issues.forEach(issue => {
        if (issue.latitude && issue.longitude) {
          const latLng = [issue.latitude, issue.longitude];
          bounds.push(latLng);

          const marker = L.marker(latLng, { icon: createPinIcon(issue.category) }).addTo(map);

          const popupEl = document.createElement('div');
          popupEl.className = 'map-popup-card';
          popupEl.innerHTML = `
            <div style="font-family: inherit; min-width: 210px; padding: 4px;">
              <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <span class="badge-cat" style="background: #eef2ff; color: #4f46e5; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">${issue.category}</span>
                <span class="badge-stat" style="background: #f1f5f9; color: #475569; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">${issue.status}</span>
              </div>
              <h4 style="margin: 0 0 4px 0; font-size: 0.92rem; font-weight: 700; color: #0f172a;">${issue.title}</h4>
              <p style="margin: 0 0 8px 0; font-size: 0.78rem; color: #64748b;">📍 ${issue.location}</p>
              <button id="popup-btn-${issue.issue_id}" style="width: 100%; background: #4f46e5; color: white; border: none; padding: 7px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                <span>View Full Details &rarr;</span>
              </button>
            </div>
          `;

          marker.bindPopup(popupEl);
          
          marker.on('popupopen', () => {
            const btn = document.getElementById(`popup-btn-${issue.issue_id}`);
            if (btn) {
              btn.onclick = () => {
                if (onSelectIssue) onSelectIssue(issue.issue_id);
                navigate(`/issue/${issue.issue_id}`);
              };
            }
          });
        }
      });

      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [issues, isPicker, navigate]);

  // Update map view & marker when initialCoords changes dynamically in picker mode
  useEffect(() => {
    if (isPicker && mapInstanceRef.current && initialCoords && initialCoords.length === 2) {
      mapInstanceRef.current.setView(initialCoords, 15);
      if (markerRef.current) {
        markerRef.current.setLatLng(initialCoords);
      }
    }
  }, [isPicker, initialCoords]);

  // Invalidate map size when container height changes or expands
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [height]);

  return (
    <div className="leaflet-map-wrapper" style={{ height, width: '100%', position: 'relative' }}>
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%', borderRadius: '16px' }} />
    </div>
  );
}
