/**
 * GoogleMapPicker.jsx
 * ─────────────────────────────────────────────────────────────
 * Universal Google Maps component supporting three modes:
 *
 *  mode="picker"   → Draggable marker for issue reporting.
 *                    Emits onLocationPicked(lat, lng, address).
 *
 *  mode="display"  → Multi-marker map for Admin Command Center.
 *                    Shows all issues with category-colored pins
 *                    and status-filter chip toolbar.
 *
 *  mode="tracking" → Read-only centered map for TrackTimeline.
 *                    Shows a single issue's pinned location.
 *
 * Falls back to Leaflet OSM when no Google Maps API key is set.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MapPin, Crosshair, Navigation, Layers, AlertCircle,
  Loader2, ExternalLink, Key
} from 'lucide-react';
import { useGoogleMaps } from '../hooks/useGoogleMaps';
import {
  DEFAULT_CENTER, DEFAULT_ZOOM, TRACKING_ZOOM,
  CATEGORY_COLORS, STATUS_COLORS, CUSTOM_MAP_STYLES
} from '../utils/mapsConfig';
import LeafletMap from './LeafletMap';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Creates a colored SVG pin icon for Google Maps markers. */
function buildMarkerIcon(color, scale = 1.0) {
  const size = Math.round(32 * scale);
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size + 8}" viewBox="0 0 32 40">
        <circle cx="16" cy="14" r="13" fill="${color}" stroke="white" stroke-width="2.5"
          filter="drop-shadow(0 3px 6px rgba(0,0,0,0.3))"/>
        <circle cx="16" cy="14" r="5" fill="white" opacity="0.9"/>
        <polygon points="11,24 21,24 16,36" fill="${color}"/>
      </svg>`)}`,
    scaledSize: { width: size, height: size + 8 },
    anchor: { x: Math.round(size / 2), y: size + 8 },
  };
}

/** Build a pulsing picker pin (indigo) */
function buildPickerIcon() { return buildMarkerIcon('#4f46e5', 1.1); }

/** Build a resolved/colored status icon */
function buildStatusIcon(status) {
  return buildMarkerIcon(STATUS_COLORS[status] || '#64748b', 1.0);
}

/** Build a category-colored display icon */
function buildCategoryIcon(category) {
  return buildMarkerIcon(CATEGORY_COLORS[category] || '#64748b', 0.95);
}

// ─── Fallback when API key is missing ───────────────────────────────────────

function NoKeyFallback({ mode, issues, onSelectIssue, onLocationPicked, initialCoords, height }) {
  return (
    <div className="gmap-no-key-wrapper" style={{ height }}>
      {/* Show Leaflet as visual fallback */}
      <div style={{ height: '100%', filter: 'grayscale(0.3)', opacity: 0.85 }}>
        <LeafletMap
          issues={mode === 'display' ? issues : []}
          isPicker={mode === 'picker'}
          initialCoords={initialCoords || [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]}
          onLocationPicked={onLocationPicked
            ? (lat, lng) => onLocationPicked(lat, lng, '')
            : undefined}
          onSelectIssue={onSelectIssue}
          height="100%"
        />
      </div>

      {/* Overlay banner */}
      <div className="gmap-key-banner">
        <Key className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-xs">Google Maps API Key Required</p>
          <p className="text-slate-500 text-[11px] leading-tight">
            Add <code className="bg-slate-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in{' '}
            <code className="bg-slate-100 px-1 rounded">.env.local</code> to enable full Google Maps features.
          </p>
        </div>
        <a
          href="https://console.cloud.google.com/apis/credentials"
          target="_blank"
          rel="noreferrer"
          className="gmap-key-link"
        >
          Get Key <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

// ─── Loading Spinner ─────────────────────────────────────────────────────────

function MapLoadingOverlay({ height }) {
  return (
    <div className="gmap-loading-overlay" style={{ height }}>
      <Loader2 className="w-7 h-7 text-indigo-500 animate-spin mb-2" />
      <span className="text-sm font-semibold text-slate-600">Loading Google Maps…</span>
    </div>
  );
}

// ─── Load Error ──────────────────────────────────────────────────────────────

function MapErrorOverlay({ height }) {
  return (
    <div className="gmap-loading-overlay" style={{ height }}>
      <AlertCircle className="w-7 h-7 text-red-400 mb-2" />
      <span className="text-sm font-semibold text-slate-600">
        Failed to load Google Maps. Check your API key and network.
      </span>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GoogleMapPicker({
  mode = 'picker',        // 'picker' | 'display' | 'tracking'
  issues = [],            // for display mode
  onSelectIssue,          // (issueId) => void — display/tracking
  onLocationPicked,       // (lat, lng, address) => void — picker
  initialCoords = null,   // [lat, lng] starting position
  issue = null,           // Issue object — tracking mode
  height = '400px',
  filterStatus = 'All',   // display mode status filter
}) {
  const { isLoaded, loadError, hasKey } = useGoogleMaps();

  const mapDivRef = useRef(null);
  const mapRef    = useRef(null);
  const geocoderRef   = useRef(null);
  const pickerMarker  = useRef(null);
  const infoWindow    = useRef(null);
  const displayMarkers = useRef([]);

  const [pinCoords, setPinCoords] = useState(() => {
    if (initialCoords) return { lat: initialCoords[0], lng: initialCoords[1] };
    if (mode === 'tracking' && issue?.latitude) return { lat: issue.latitude, lng: issue.longitude };
    return DEFAULT_CENTER;
  });
  const [pinAddress, setPinAddress] = useState('');
  const [isGettingGPS, setIsGettingGPS] = useState(false);
  const [mapFilterStatus, setMapFilterStatus] = useState(filterStatus);

  // ── Reverse Geocode ────────────────────────────────────────────────────
  const reverseGeocode = useCallback((lat, lng) => {
    if (!geocoderRef.current) return;
    geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
      const addr = (status === 'OK' && results?.[0])
        ? results[0].formatted_address
        : `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      setPinAddress(addr);
      if (onLocationPicked) onLocationPicked(lat, lng, addr);
    });
  }, [onLocationPicked]);

  // ── Move Picker Marker ─────────────────────────────────────────────────
  const movePickerMarker = useCallback((lat, lng) => {
    if (!pickerMarker.current) return;
    const pos = new window.google.maps.LatLng(lat, lng);
    pickerMarker.current.setPosition(pos);
    pickerMarker.current.setAnimation(window.google.maps.Animation.DROP);
    setPinCoords({ lat, lng });
    reverseGeocode(lat, lng);
  }, [reverseGeocode]);

  // ── GPS Location ───────────────────────────────────────────────────────
  const handleGPS = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsGettingGPS(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current?.panTo({ lat, lng });
        mapRef.current?.setZoom(TRACKING_ZOOM);
        movePickerMarker(lat, lng);
        setIsGettingGPS(false);
      },
      () => {
        alert('Could not access your location. Please allow location access or click on the map.');
        setIsGettingGPS(false);
      },
      { timeout: 10000 }
    );
  }, [movePickerMarker]);

  // ── Render Display Markers ─────────────────────────────────────────────
  const renderDisplayMarkers = useCallback((map, issueList, statusFilt) => {
    // Clear existing
    displayMarkers.current.forEach(m => m.setMap(null));
    displayMarkers.current = [];

    const filtered = statusFilt === 'All'
      ? issueList
      : issueList.filter(i => i.status === statusFilt);

    const bounds = new window.google.maps.LatLngBounds();
    let hasBounds = false;

    filtered.forEach(issue => {
      if (!issue.latitude || !issue.longitude) return;

      const pos = { lat: issue.latitude, lng: issue.longitude };
      bounds.extend(pos);
      hasBounds = true;

      const marker = new window.google.maps.Marker({
        position: pos,
        map,
        title: issue.title,
        icon: buildCategoryIcon(issue.category),
        animation: window.google.maps.Animation.DROP,
      });

      const statusColor  = STATUS_COLORS[issue.status]  || '#64748b';
      const catColor     = CATEGORY_COLORS[issue.category] || '#4f46e5';
      const priorityClass = (issue.priority || 'medium').toLowerCase();

      const infoContent = `
        <div style="
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
          min-width: 220px; max-width: 280px;
          padding: 4px 2px;
        ">
          <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;">
            <span style="background:${catColor}18; color:${catColor}; padding:2px 8px;
              border-radius:20px; font-size:0.7rem; font-weight:700;">
              ${issue.category}
            </span>
            <span style="background:${statusColor}18; color:${statusColor}; padding:2px 8px;
              border-radius:20px; font-size:0.7rem; font-weight:700;">
              ${issue.status}
            </span>
          </div>
          <h4 style="margin:0 0 4px; font-size:0.9rem; font-weight:800; color:#0f172a; line-height:1.3;">
            #${issue.issue_id} — ${issue.title}
          </h4>
          <p style="margin:0 0 6px; font-size:0.75rem; color:#64748b;">
            📍 ${issue.location || 'Location recorded'}
          </p>
          ${issue.address ? `<p style="margin:0 0 8px; font-size:0.7rem; color:#94a3b8; line-height:1.3;">
            ${issue.address}
          </p>` : ''}
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="font-size:0.7rem; color:#94a3b8;">
              👤 ${issue.reporter_name || 'Citizen'}
            </span>
            <span style="font-size:0.7rem; font-weight:700; color:#64748b;">
              👍 ${issue.upvotes || 1} votes
            </span>
          </div>
          <button id="gmap-track-btn-${issue.issue_id}" style="
            width:100%; background:linear-gradient(135deg,#4f46e5,#0ea5e9);
            color:white; border:none; padding:7px 12px; border-radius:8px;
            font-size:0.78rem; font-weight:700; cursor:pointer;
            letter-spacing:0.3px;
          ">
            Track Timeline →
          </button>
        </div>`;

      marker.addListener('click', () => {
        infoWindow.current?.close();
        infoWindow.current = new window.google.maps.InfoWindow({ content: infoContent });
        infoWindow.current.open(map, marker);

        // Wire up the Track button after InfoWindow renders
        setTimeout(() => {
          const btn = document.getElementById(`gmap-track-btn-${issue.issue_id}`);
          if (btn && onSelectIssue) btn.onclick = () => onSelectIssue(issue.issue_id);
        }, 120);
      });

      displayMarkers.current.push(marker);
    });

    if (hasBounds && displayMarkers.current.length > 1) {
      map.fitBounds(bounds, { top: 50, right: 40, bottom: 40, left: 40 });
    } else if (hasBounds) {
      map.setCenter(bounds.getCenter());
      map.setZoom(TRACKING_ZOOM);
    }
  }, [onSelectIssue]);

  // ── Initialize Map ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isLoaded || !mapDivRef.current || mapRef.current) return;

    const center = (() => {
      if (initialCoords) return { lat: initialCoords[0], lng: initialCoords[1] };
      if (mode === 'tracking' && issue?.latitude)
        return { lat: issue.latitude, lng: issue.longitude };
      return DEFAULT_CENTER;
    })();

    const map = new window.google.maps.Map(mapDivRef.current, {
      center,
      zoom: mode === 'tracking' ? TRACKING_ZOOM : DEFAULT_ZOOM,
      styles: CUSTOM_MAP_STYLES,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: mode !== 'picker',
      zoomControl: true,
      gestureHandling: 'cooperative',
    });
    mapRef.current = map;
    geocoderRef.current = new window.google.maps.Geocoder();

    // ── PICKER MODE ──────────────────────────────────────────────
    if (mode === 'picker') {
      const marker = new window.google.maps.Marker({
        position: center,
        map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        icon: buildPickerIcon(),
        title: 'Drag or click map to pin issue location',
        cursor: 'grab',
      });
      pickerMarker.current = marker;

      // Initial reverse geocode
      reverseGeocode(center.lat, center.lng);

      // Click anywhere to move pin
      map.addListener('click', (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        marker.setPosition(e.latLng);
        marker.setAnimation(window.google.maps.Animation.DROP);
        setPinCoords({ lat, lng });
        reverseGeocode(lat, lng);
      });

      // Drag to reposition
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        const lat = pos.lat();
        const lng = pos.lng();
        setPinCoords({ lat, lng });
        reverseGeocode(lat, lng);
      });
    }

    // ── DISPLAY MODE ─────────────────────────────────────────────
    if (mode === 'display') {
      renderDisplayMarkers(map, issues, mapFilterStatus);
    }

    // ── TRACKING MODE ────────────────────────────────────────────
    if (mode === 'tracking' && issue?.latitude && issue?.longitude) {
      new window.google.maps.Marker({
        position: center,
        map,
        animation: window.google.maps.Animation.DROP,
        icon: buildStatusIcon(issue.status),
        title: issue.title,
      });

      // Accuracy circle
      new window.google.maps.Circle({
        map,
        center,
        radius: 40,
        strokeColor: STATUS_COLORS[issue.status] || '#4f46e5',
        strokeOpacity: 0.4,
        strokeWeight: 2,
        fillColor: STATUS_COLORS[issue.status] || '#4f46e5',
        fillOpacity: 0.1,
      });
    }

    // Cleanup on unmount
    return () => {
      displayMarkers.current.forEach(m => m.setMap(null));
      displayMarkers.current = [];
      mapRef.current = null;
      geocoderRef.current = null;
      pickerMarker.current = null;
    };
  }, [isLoaded]); // intentionally only run when isLoaded changes

  // ── Re-render markers when display filter changes ──────────────
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mode !== 'display') return;
    renderDisplayMarkers(mapRef.current, issues, mapFilterStatus);
  }, [isLoaded, issues, mapFilterStatus, mode, renderDisplayMarkers]);

  // ─── Early returns ──────────────────────────────────────────────────────
  if (!hasKey) {
    return (
      <NoKeyFallback
        mode={mode}
        issues={issues}
        onSelectIssue={onSelectIssue}
        onLocationPicked={onLocationPicked}
        initialCoords={initialCoords}
        height={height}
      />
    );
  }
  if (loadError === 'load_failed') return <MapErrorOverlay height={height} />;
  if (!isLoaded) return <MapLoadingOverlay height={height} />;

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="gmap-root" style={{ height }}>

      {/* ── Display Mode: Status Filter Chips ── */}
      {mode === 'display' && (
        <div className="gmap-filter-bar">
          {['All', 'Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved'].map(s => (
            <button
              key={s}
              className={`gmap-filter-chip ${mapFilterStatus === s ? 'active' : ''}`}
              style={mapFilterStatus === s && s !== 'All'
                ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s], background: `${STATUS_COLORS[s]}15` }
                : {}}
              onClick={() => setMapFilterStatus(s)}
            >
              {s === 'All' ? '🗺 All Issues' : s}
            </button>
          ))}
          <span className="gmap-issue-count">
            {mapFilterStatus === 'All'
              ? `${issues.filter(i => i.latitude).length} pinned`
              : `${issues.filter(i => i.status === mapFilterStatus && i.latitude).length} shown`}
          </span>
        </div>
      )}

      {/* ── Map Container ── */}
      <div
        ref={mapDivRef}
        className="gmap-canvas"
        style={{ borderRadius: mode === 'display' ? '0 0 16px 16px' : '14px' }}
      />

      {/* ── Picker Mode: GPS + Coords HUD ── */}
      {mode === 'picker' && (
        <>
          {/* GPS Button overlay */}
          <button
            type="button"
            className={`gmap-gps-btn ${isGettingGPS ? 'loading' : ''}`}
            onClick={handleGPS}
            title="Use my current location"
          >
            {isGettingGPS
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Navigation className="w-4 h-4" />}
            {isGettingGPS ? 'Locating…' : 'Use GPS'}
          </button>

          {/* Coordinates + Address Badge */}
          <div className="gmap-coords-badge">
            <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <div className="min-w-0">
              <div className="gmap-coords-latlng">
                {pinCoords.lat.toFixed(6)}°N, {pinCoords.lng.toFixed(6)}°E
              </div>
              {pinAddress && (
                <div className="gmap-coords-addr">{pinAddress}</div>
              )}
            </div>
          </div>

          {/* Crosshair hint */}
          <div className="gmap-picker-hint">
            <Crosshair className="w-3.5 h-3.5" />
            Click map or drag pin to set exact issue location
          </div>
        </>
      )}

      {/* ── Tracking Mode: Location Info Bar ── */}
      {mode === 'tracking' && issue?.latitude && (
        <div className="gmap-tracking-bar">
          <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-800">
              {issue.address || issue.location || 'Location pinned'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              {issue.latitude?.toFixed(6)}°N, {issue.longitude?.toFixed(6)}°E
            </div>
          </div>
          <a
            href={`https://maps.google.com/?q=${issue.latitude},${issue.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="gmap-open-link"
            title="Open in Google Maps"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
