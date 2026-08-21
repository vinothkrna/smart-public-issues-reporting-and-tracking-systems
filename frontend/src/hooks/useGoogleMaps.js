/**
 * useGoogleMaps.js
 * Custom React hook that lazily loads the Google Maps JavaScript SDK.
 * Exposes { isLoaded, loadError, hasKey } so components know the SDK state.
 */

import { useState, useEffect } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../utils/mapsConfig';

const SCRIPT_ID = 'google-maps-js-api';

export function useGoogleMaps() {
  const hasKey = Boolean(GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE');

  const [isLoaded, setIsLoaded] = useState(
    // Already loaded from a previous component mount
    () => hasKey && typeof window !== 'undefined' && Boolean(window.google?.maps)
  );
  const [loadError, setLoadError] = useState(hasKey ? null : 'no_key');

  useEffect(() => {
    // No key supplied → stay in error state
    if (!hasKey) {
      setLoadError('no_key');
      return;
    }

    // Already available in window → mark as loaded
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    // Script already injected by another component → wait for it
    const existingScript = document.getElementById(SCRIPT_ID);
    if (existingScript) {
      const onLoad = () => setIsLoaded(true);
      const onError = () => setLoadError('load_failed');
      existingScript.addEventListener('load', onLoad);
      existingScript.addEventListener('error', onError);
      return () => {
        existingScript.removeEventListener('load', onLoad);
        existingScript.removeEventListener('error', onError);
      };
    }

    // Inject Google Maps script tag
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    const onLoad = () => setIsLoaded(true);
    const onError = () => setLoadError('load_failed');

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };
  }, [hasKey]);

  return { isLoaded, loadError, hasKey };
}
