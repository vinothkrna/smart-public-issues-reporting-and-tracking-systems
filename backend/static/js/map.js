/**
 * Leaflet GIS Map Integration for Smart Public Issue Reporting
 */

const CATEGORY_COLORS = {
    'Pothole': '#ef4444',             // Red
    'Garbage Dump': '#f59e0b',        // Amber
    'Water Leakage': '#0ea5e9',       // Cyan/Blue
    'Streetlight Failure': '#8b5cf6', // Violet
    'Drainage Blockage': '#10b981',   // Emerald
    'Other': '#64748b'
};

function createCategoryIcon(category) {
    const color = CATEGORY_COLORS[category] || '#4f46e5';
    return L.divIcon({
        className: 'custom-map-pin',
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
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        "><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28]
    });
}

// 1. Initialize Public Issues Map (Home Page)
function initPublicMap(issuesData) {
    const mapElement = document.getElementById('issuesMap');
    if (!mapElement) return;

    // Default center (City hub)
    const defaultCenter = [11.3410, 77.7172];
    const map = L.map('issuesMap').setView(defaultCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    if (issuesData && issuesData.length > 0) {
        const bounds = [];
        issuesData.forEach(issue => {
            if (issue.latitude && issue.longitude) {
                const latLng = [issue.latitude, issue.longitude];
                bounds.push(latLng);

                const marker = L.marker(latLng, { icon: createCategoryIcon(issue.category) }).addTo(map);
                
                const popupContent = `
                    <div style="font-family: inherit; min-width: 200px; padding: 4px;">
                        <span class="badge bg-primary" style="font-size: 0.7rem;">${issue.category}</span>
                        <span class="badge bg-secondary" style="font-size: 0.7rem;">${issue.status}</span>
                        <h6 style="margin: 8px 0 4px 0; font-weight: 700; font-size: 0.95rem;">${issue.title}</h6>
                        <p style="font-size: 0.8rem; color: #64748b; margin-bottom: 6px;">📍 ${issue.location}</p>
                        <a href="/track/${issue.issue_id}" class="btn btn-sm btn-outline-primary w-100" style="font-size: 0.75rem;">View Tracking Timeline &rarr;</a>
                    </div>
                `;
                marker.bindPopup(popupContent);
            }
        });

        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [40, 40] });
        }
    }
}

// 2. Initialize Location Picker Map (Report Issue Page)
function initLocationPicker() {
    const pickerEl = document.getElementById('pickerMap');
    if (!pickerEl) return;

    const defaultLat = 11.3410;
    const defaultLon = 77.7172;
    const map = L.map('pickerMap').setView([defaultLat, defaultLon], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let currentMarker = L.marker([defaultLat, defaultLon], { draggable: true }).addTo(map);

    function updateCoordinates(lat, lon) {
        document.getElementById('latitudeInput').value = lat.toFixed(6);
        document.getElementById('longitudeInput').value = lon.toFixed(6);

        // Fetch reverse geocode address if location input is empty
        const locationInput = document.getElementById('locationInput');
        if (locationInput && !locationInput.value) {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.display_name) {
                        locationInput.value = data.display_name.split(',').slice(0, 3).join(',');
                    }
                })
                .catch(() => {});
        }
    }

    // Set initial
    updateCoordinates(defaultLat, defaultLon);

    // On map click
    map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        currentMarker.setLatLng([lat, lng]);
        updateCoordinates(lat, lng);
    });

    // On marker drag
    currentMarker.on('dragend', () => {
        const { lat, lng } = currentMarker.getLatLng();
        updateCoordinates(lat, lng);
    });

    // "Use My GPS Location" Button
    const gpsBtn = document.getElementById('btnUseGPS');
    if (gpsBtn) {
        gpsBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                gpsBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Locating...';
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const { latitude, longitude } = pos.coords;
                        map.setView([latitude, longitude], 16);
                        currentMarker.setLatLng([latitude, longitude]);
                        updateCoordinates(latitude, longitude);
                        gpsBtn.innerHTML = '<i class="bi bi-geo-alt-fill text-success"></i> GPS Locked';
                    },
                    (err) => {
                        alert('Could not access current location. Please click on the map to set location.');
                        gpsBtn.innerHTML = '<i class="bi bi-crosshair"></i> Use My GPS Location';
                    }
                );
            }
        });
    }
}
