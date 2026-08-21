/**
 * mapsConfig.js
 * Central configuration for Google Maps API integration.
 * All map-related constants are defined here for consistency.
 */

// ── API Key ────────────────────────────────────────────────────────────────
// Set VITE_GOOGLE_MAPS_API_KEY in your .env.local file.
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

// ── Flask API Base ─────────────────────────────────────────────────────────
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

// ── Map Defaults (Erode, Tamil Nadu — city in demo data) ──────────────────
export const DEFAULT_CENTER = { lat: 11.3410, lng: 77.7172 };
export const DEFAULT_ZOOM = 14;
export const TRACKING_ZOOM = 16;

// ── Category → Marker Color Map ───────────────────────────────────────────
export const CATEGORY_COLORS = {
  'Pothole':            '#ef4444',  // Red
  'Garbage Dump':       '#f59e0b',  // Amber
  'Water Leakage':      '#0ea5e9',  // Cyan
  'Streetlight Failure':'#8b5cf6',  // Violet
  'Drainage Blockage':  '#10b981',  // Emerald
  'Other':              '#64748b',  // Slate
};

// ── Status → Color Map ────────────────────────────────────────────────────
export const STATUS_COLORS = {
  'Submitted':    '#64748b',
  'Under Review': '#f59e0b',
  'Assigned':     '#0ea5e9',
  'In Progress':  '#4f46e5',
  'Resolved':     '#10b981',
  'Rejected':     '#ef4444',
};

// ── Custom Map Style (Clean Silver Theme) ─────────────────────────────────
export const CUSTOM_MAP_STYLES = [
  { elementType: 'geometry',                   stylers: [{ color: '#f5f7fa' }] },
  { elementType: 'labels.icon',                stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill',           stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke',         stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative.locality',    elementType: 'labels.text.fill', stylers: [{ color: '#374151' }] },
  { featureType: 'poi',                        elementType: 'geometry',          stylers: [{ color: '#ececec' }] },
  { featureType: 'poi.park',                   elementType: 'geometry',          stylers: [{ color: '#d1f5e0' }] },
  { featureType: 'poi.park',                   elementType: 'labels.text.fill',  stylers: [{ color: '#6b7280' }] },
  { featureType: 'road',                       elementType: 'geometry',          stylers: [{ color: '#ffffff' }] },
  { featureType: 'road',                       elementType: 'geometry.stroke',   stylers: [{ color: '#e5e7eb' }] },
  { featureType: 'road.arterial',              elementType: 'labels.text.fill',  stylers: [{ color: '#6b7280' }] },
  { featureType: 'road.highway',               elementType: 'geometry',          stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'road.highway',               elementType: 'geometry.stroke',   stylers: [{ color: '#cbd5e1' }] },
  { featureType: 'road.highway',               elementType: 'labels.text.fill',  stylers: [{ color: '#4b5563' }] },
  { featureType: 'road.local',                 elementType: 'labels.text.fill',  stylers: [{ color: '#9ca3af' }] },
  { featureType: 'transit.line',               elementType: 'geometry',          stylers: [{ color: '#e2e8f0' }] },
  { featureType: 'transit.station',            elementType: 'geometry',          stylers: [{ color: '#eff6ff' }] },
  { featureType: 'water',                      elementType: 'geometry',          stylers: [{ color: '#bfdbfe' }] },
  { featureType: 'water',                      elementType: 'labels.text.fill',  stylers: [{ color: '#6b7280' }] },
];
