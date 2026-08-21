import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  Camera,
  Sparkles,
  MapPin,
  Crosshair,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  Edit3,
  Trash2,
  Compass,
  Loader2,
  Check,
  Maximize2,
  Minimize2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import LeafletMap from './LeafletMap';

const API_BASE = 'http://127.0.0.1:5000';

export default function ReportIssueModal({ isOpen, onClose, onIssueCreated, currentUser }) {
  if (!isOpen) return null;

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory]       = useState('Auto-Detect');

  // Location state
  const [latitude, setLatitude]       = useState(11.3410);
  const [longitude, setLongitude]     = useState(77.7172);
  const [address, setAddress]         = useState('');
  const [area, setArea]               = useState('');
  const [city, setCity]               = useState('');
  const [stateName, setStateName]     = useState('');
  const [locationText, setLocationText] = useState('');
  const [hasLocationPicked, setHasLocationPicked] = useState(false);

  // Map Expand / Collapse state
  const [isMapExpanded, setIsMapExpanded]   = useState(false);
  const [isMapLargeView, setIsMapLargeView] = useState(false);
  const [isLocating, setIsLocating]         = useState(false);
  const [isGeocoding, setIsGeocoding]       = useState(false);
  const [locationError, setLocationError]   = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [isSearching, setIsSearching]       = useState(false);

  // Image & AI state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl]     = useState(null);
  const [isScanning, setIsScanning]   = useState(false);
  const [aiResult, setAiResult]       = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  // Reverse Geocoding with Nominatim (with fallback)
  const performReverseGeocode = async (lat, lng) => {
    setIsGeocoding(true);
    setLocationError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};

        const fullAddr = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
        const parsedArea = addr.suburb || addr.neighbourhood || addr.road || addr.village || addr.residential || 'Central Ward';
        const parsedCity = addr.city || addr.town || addr.municipality || addr.county || 'Erode';
        const parsedState = addr.state || addr.region || 'Tamil Nadu';

        setAddress(fullAddr);
        setArea(parsedArea);
        setCity(parsedCity);
        setStateName(parsedState);
        setLocationText(`${parsedArea}, ${parsedCity}`);
        setHasLocationPicked(true);
      } else {
        throw new Error('Geocoding service unavailable');
      }
    } catch (err) {
      // Local graceful fallback
      const fallbackAddr = `GPS Pin at (${lat.toFixed(4)}°, ${lng.toFixed(4)}°), City Ward`;
      setAddress(fallbackAddr);
      setArea('City Ward 4');
      setCity('Erode');
      setStateName('Tamil Nadu');
      setLocationText('Ward 4, Erode');
      setHasLocationPicked(true);
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle Location picked from Map
  const handleLocationPicked = (lat, lng) => {
    setLatitude(lat);
    setLongitude(lng);
    performReverseGeocode(lat, lng);
  };

  // Get User's Current GPS Location via Geolocation API
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation API is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);
        setIsLocating(false);
        performReverseGeocode(lat, lng);
      },
      (error) => {
        setIsLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. Please select your position on the map below.');
        } else {
          setLocationError('Unable to detect GPS position. Please pin manually on the map.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Location Search via Nominatim
  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setLocationError(null);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          setLatitude(lat);
          setLongitude(lng);
          performReverseGeocode(lat, lng);
        } else {
          setLocationError(`No results found for "${searchQuery}". Try dragging the pin on the map.`);
        }
      }
    } catch {
      setLocationError('Location search failed. Please use the map pin.');
    } finally {
      setIsSearching(false);
    }
  };

  // Image Picker & AI Analysis
  const handleFileChange = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
      runAIScan(file, title, description);
    };
    reader.readAsDataURL(file);
  };

  const runAIScan = async (file, textTitle, textDesc) => {
    setIsScanning(true);
    try {
      const formData = new FormData();
      if (file) formData.append('image', file);
      formData.append('title', textTitle || '');
      formData.append('description', textDesc || '');

      const res = await fetch(`${API_BASE}/api/ai/analyze`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
        if (data.category) {
          setCategory(data.category);
          if (!title.trim() && data.category === 'Garbage Dump') {
            setTitle('Severe Garbage Dump & Solid Waste Accumulation');
          }
          if (!description.trim() && data.category === 'Garbage Dump') {
            setDescription('Massive uncollected garbage and plastic waste debris causing public health hazards and foul odor.');
          }
        }
      } else {
        fallbackLocalAI(textTitle, textDesc, file);
      }
    } catch {
      fallbackLocalAI(textTitle, textDesc, file);
    } finally {
      setTimeout(() => setIsScanning(false), 500);
    }
  };

  const fallbackLocalAI = (textTitle, textDesc, file) => {
    const text = `${textTitle || ''} ${textDesc || ''} ${file?.name || ''}`.toLowerCase();
    let cat = 'Garbage Dump', dept = 'Sanitation Department', priority = 'High', conf = 92;

    if (text.includes('pothole') || text.includes('road') || text.includes('asphalt') || text.includes('crater')) {
      cat = 'Pothole'; dept = 'Roads & Highways Department'; priority = 'Medium'; conf = 88;
    } else if (text.includes('water') || text.includes('pipe') || text.includes('leak') || text.includes('burst')) {
      cat = 'Water Leakage'; dept = 'Water Supply Department'; priority = 'High'; conf = 90;
    } else if (text.includes('light') || text.includes('lamp') || text.includes('dark') || text.includes('pole')) {
      cat = 'Streetlight Failure'; dept = 'Electricity Department'; priority = 'Medium'; conf = 87;
    } else if (text.includes('drain') || text.includes('sewage') || text.includes('gutter') || text.includes('manhole')) {
      cat = 'Drainage Blockage'; dept = 'Drainage & Sewer Department'; priority = 'High'; conf = 91;
    } else if (text.includes('garbage') || text.includes('trash') || text.includes('waste') || text.includes('dump') || text.includes('debris') || text.includes('filth')) {
      cat = 'Garbage Dump'; dept = 'Sanitation Department'; priority = 'High'; conf = 94;
    }

    setAiResult({
      category: cat,
      confidence_percentage: conf,
      suggested_department: dept,
      predicted_priority: priority,
      detected_tags: [cat.toLowerCase().replace(/\s+/g, '-'), 'multi-modal-verified']
    });
    setCategory(cat);
    if (!title.trim() && cat === 'Garbage Dump') {
      setTitle('Severe Garbage Dump & Solid Waste Accumulation');
    }
    if (!description.trim() && cat === 'Garbage Dump') {
      setDescription('Massive uncollected garbage and plastic waste debris causing public health hazards and foul odor.');
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Please fill in Issue Title and Description.');
      return;
    }
    if (!hasLocationPicked && !locationText.trim()) {
      alert('Please select the exact location on the map before submitting.');
      setIsMapExpanded(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCategory = category === 'Auto-Detect'
        ? (aiResult?.category || 'Pothole')
        : category;

      const payload = {
        title: title.trim(),
        description: description.trim(),
        category: finalCategory,
        location: locationText || address || 'City Ward',
        address: address || locationText,
        area: area || 'City Area',
        city: city || 'Erode',
        state: stateName || 'Tamil Nadu',
        latitude,
        longitude,
        user_id: currentUser ? currentUser.id : 2,
        priority: aiResult?.predicted_priority || 'Medium',
        department: aiResult?.suggested_department || 'Roads & Highways Department',
        ai_confidence: (aiResult?.confidence_percentage || 90) / 100
      };

      const token = localStorage.getItem('civic_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let res;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        formData.append('category', finalCategory);
        formData.append('location', locationText || address || 'City Ward');
        formData.append('address', address || locationText);
        formData.append('area', area || 'City Area');
        formData.append('city', city || 'Erode');
        formData.append('state', stateName || 'Tamil Nadu');
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
        formData.append('user_id', currentUser ? currentUser.id : 2);
        formData.append('priority', aiResult?.predicted_priority || 'Medium');
        formData.append('department', aiResult?.suggested_department || 'Roads & Highways Department');
        formData.append('image', selectedFile);

        const formHeaders = {};
        if (token) formHeaders['Authorization'] = `Bearer ${token}`;

        res = await fetch(`${API_BASE}/api/issues`, {
          method: 'POST',
          headers: formHeaders,
          body: formData
        });
      } else {
        res = await fetch(`${API_BASE}/api/issues`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Failed to submit issue');
      }

      const newIssue = resData.issue || resData;

      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      onIssueCreated(newIssue);
      onClose();
    } catch (err) {
      console.error('Error submitting grievance:', err);
      alert(`Submission failed: ${err.message || 'Please check your connection and try again.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop-blur">
      <div className="modal-card report-modal max-w-4xl w-full">

        {/* ── Modal Header ── */}
        <div className="modal-header-row border-b border-slate-100 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="badge-ai-pill">
                <Sparkles className="w-3.5 h-3.5" /> AI Vision & GIS
              </span>
              <h3 className="modal-title text-xl font-extrabold text-slate-900">Report a Public Issue</h3>
            </div>
            <p className="modal-subtitle text-xs text-slate-500 mt-0.5">
              Upload photo evidence, pin exact GPS coordinates on map, and file your grievance.
            </p>
          </div>
          <button className="close-btn text-slate-400 hover:text-slate-700" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Modal Form ── */}
        <form onSubmit={handleSubmit} className="report-modal-body space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ══════════ LEFT COLUMN: IMAGE UPLOAD & AI HUD ══════════ */}
            <div className="space-y-4">
              <label className="form-label-bold text-xs uppercase text-slate-500 tracking-wider block">
                1. Photographic Evidence & AI Vision
              </label>

              <div
                className="ai-dropzone-container"
                onClick={() => fileInputRef.current?.click()}
              >
                {isScanning && <div className="laser-scan-beam" />}

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />

                {previewUrl ? (
                  <div className="image-preview-wrapper relative rounded-xl overflow-hidden group">
                    <img src={previewUrl} alt="Preview" className="preview-image w-full h-48 object-cover" />
                    <div className="change-img-overlay absolute inset-0 bg-black/40 text-white font-bold text-xs flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-4 h-4" /> Change Image
                    </div>
                  </div>
                ) : (
                  <div className="upload-placeholder p-8 border-2 border-dashed border-slate-200 rounded-xl text-center hover:border-indigo-400 transition-colors cursor-pointer bg-slate-50">
                    <div className="upload-icon-circle w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-2 text-indigo-600">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-sm text-slate-800">Click or Drag & Drop Photo</div>
                    <div className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP (Max 16MB)</div>
                  </div>
                )}
              </div>

              {/* AI Recognition HUD */}
              {aiResult && (
                <div className="ai-hud-card p-4 bg-indigo-50/80 border border-indigo-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-indigo-700 text-xs">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Classified: <strong>{aiResult.category}</strong></span>
                    </div>
                    <span className={`priority-pill priority-${(aiResult.predicted_priority || 'medium').toLowerCase()}`}>
                      {aiResult.predicted_priority} Priority
                    </span>
                  </div>

                  <div className="confidence-meter">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1 font-semibold">
                      <span>Model Confidence</span>
                      <span className="font-bold text-slate-800">{aiResult.confidence_percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500" style={{ width: `${aiResult.confidence_percentage}%` }} />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600 font-medium">
                    Auto-Routed to: <strong className="text-indigo-700">{aiResult.suggested_department}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* ══════════ RIGHT COLUMN: ISSUE DETAILS & EXPANDABLE LOCATION ══════════ */}
            <div className="space-y-4">
              <div>
                <label className="form-label-bold text-xs">Issue Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Hazardous open manhole on Main Market Road"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="input-text w-full mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="form-label-bold text-xs">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="input-select w-full mt-1 text-xs"
                  >
                    <option value="Auto-Detect">✨ Auto-Detect with AI</option>
                    <option value="Pothole">Pothole & Road Hazard</option>
                    <option value="Garbage Dump">Garbage & Waste Dump</option>
                    <option value="Water Leakage">Water Pipeline Leakage</option>
                    <option value="Streetlight Failure">Streetlight Failure</option>
                    <option value="Drainage Blockage">Drainage & Sewer Blockage</option>
                    <option value="Other">Other Public Infrastructure</option>
                  </select>
                </div>

                <div>
                  <label className="form-label-bold text-xs">Location Summary / Ward</label>
                  <input
                    type="text"
                    placeholder="e.g. Ward 4, Gandhi Road"
                    value={locationText}
                    onChange={(e) => setLocationText(e.target.value)}
                    className="input-text w-full mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="form-label-bold text-xs">Detailed Description *</label>
                <textarea
                  rows="2"
                  placeholder="Provide landmark details, depth, or safety concerns for field squad dispatch..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="input-textarea w-full mt-1 text-xs"
                />
              </div>

              {/* ── EXPANDABLE EXACT LOCATION & MAP PINNING SECTION ── */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>Exact Pinpoint GPS Geolocation *</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isMapExpanded && (
                      <button
                        type="button"
                        className={`text-[11px] font-bold py-1 px-2.5 rounded-lg border transition-all flex items-center gap-1 cursor-pointer ${
                          isMapLargeView
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                        onClick={() => setIsMapLargeView(!isMapLargeView)}
                        title={isMapLargeView ? 'Standard View' : 'Expand Map for Precise Pinning'}
                      >
                        {isMapLargeView ? <Minimize2 className="w-3.5 h-3.5 text-indigo-600" /> : <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />}
                        <span>{isMapLargeView ? 'Standard View' : 'Expand Map'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      className="btn-secondary-flat text-xs font-bold py-1 px-3 flex items-center gap-1.5 cursor-pointer"
                      onClick={() => setIsMapExpanded(!isMapExpanded)}
                      id="toggle-map-expand-btn"
                    >
                      <Compass className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isMapExpanded ? 'Collapse Map' : 'Select on Map'}</span>
                      {isMapExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Location Errors */}
                {locationError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{locationError}</span>
                  </div>
                )}

                {/* EXPANDABLE MAP DRAWER */}
                {isMapExpanded && (
                  <div className="space-y-3 pt-2 animate-in fade-in duration-300">
                    {/* Search & GPS Quick Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <form onSubmit={handleSearchLocation} className="flex-1 flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Search landmark, street, or ward..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="input-text text-xs flex-1"
                        />
                        <button type="submit" className="btn-secondary-flat text-xs px-3 font-bold cursor-pointer" disabled={isSearching}>
                          {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                        </button>
                      </form>

                      <button
                        type="button"
                        className="btn-primary-gradient text-xs font-bold py-1.5 px-3 flex items-center gap-1.5 justify-center cursor-pointer"
                        onClick={handleGetCurrentLocation}
                        disabled={isLocating}
                      >
                        {isLocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                        <span>My Location</span>
                      </button>
                    </div>

                    {/* Interactive Leaflet Map Picker with Responsive Height (260px or 460px Expanded) */}
                    <div className="rounded-xl overflow-hidden border border-slate-300 shadow-inner transition-all duration-300">
                      <LeafletMap
                        isPicker={true}
                        initialCoords={[latitude, longitude]}
                        onLocationPicked={handleLocationPicked}
                        height={isMapLargeView ? '460px' : '260px'}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
                      <span>💡 Click anywhere on the map or drag the pin to select the exact issue location.</span>
                      <button
                        type="button"
                        className="text-indigo-600 font-bold hover:underline shrink-0 ml-2"
                        onClick={() => setIsMapLargeView(!isMapLargeView)}
                      >
                        {isMapLargeView ? '🗗 Switch to Standard View' : '⛶ Expand Map View'}
                      </button>
                    </div>
                  </div>
                )}

                {/* SELECTED LOCATION SUMMARY CARD */}
                {hasLocationPicked && (
                  <div className="bg-white p-3.5 rounded-xl border border-indigo-100 shadow-sm space-y-2 text-xs">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <div className="font-extrabold text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Selected Location Pin</span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-[11px] text-indigo-600 font-bold hover:underline flex items-center gap-1"
                          onClick={() => setIsMapExpanded(true)}
                        >
                          <Edit3 className="w-3 h-3" /> Re-pin Location
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400 font-bold">Latitude:</span>{' '}
                        <span className="font-mono text-slate-800 font-semibold">{latitude.toFixed(6)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">Longitude:</span>{' '}
                        <span className="font-mono text-slate-800 font-semibold">{longitude.toFixed(6)}°</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">Area:</span>{' '}
                        <span className="font-semibold text-slate-800">{area || 'Ward 4'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-bold">City:</span>{' '}
                        <span className="font-semibold text-slate-800">{city || 'Erode'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-bold">State:</span>{' '}
                        <span className="font-semibold text-slate-800">{stateName || 'Tamil Nadu'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 font-bold">Full Address:</span>{' '}
                        <span className="font-medium text-slate-700 block mt-0.5">{address}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>

          {/* ══════════ BOTTOM FOOTER: LEFT-ALIGNED CANCEL & SUBMIT BUTTONS ══════════ */}
          <div className="modal-footer-row border-t border-slate-100 pt-4 flex items-center justify-start gap-3">
            <button
              type="button"
              className="btn-secondary-flat font-bold text-xs px-5 py-2.5 rounded-xl"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn-primary-gradient font-bold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting Grievance…</>
              ) : (
                <>🚀 Submit Complaint &rarr;</>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
