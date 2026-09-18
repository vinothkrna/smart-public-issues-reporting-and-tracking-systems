import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000';

/**
 * useDataSync — Centralized data-fetch hook with auto-refresh.
 * @param {object} opts
 * @param {number}  opts.refreshInterval  Polling interval in ms (default 60_000).
 * @param {boolean} opts.enabled          Whether polling is active (default true).
 * @returns {{ issues, loading, error, lastUpdated, refresh }}
 */
export function useDataSync({ refreshInterval = 60_000, enabled = true } = {}) {
  const [issues, setIssues]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef                   = useRef(null);

  const fetchIssues = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/issues`, {
        signal: AbortSignal.timeout(12_000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // Support both paginated { issues: [] } and plain array
      const list = Array.isArray(data) ? data : (data.issues || []);
      setIssues(list);
      setLastUpdated(new Date());
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load issues');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  // Auto-refresh polling
  useEffect(() => {
    if (!enabled || refreshInterval <= 0) return;
    intervalRef.current = setInterval(() => fetchIssues(true), refreshInterval);
    return () => clearInterval(intervalRef.current);
  }, [enabled, refreshInterval, fetchIssues]);

  const refresh = useCallback(() => fetchIssues(false), [fetchIssues]);

  return { issues, loading, error, lastUpdated, refresh };
}

/**
 * useAnalyticsSummary — Fetches /api/analytics/summary for KPI cards and chart data.
 * @param {number} refreshInterval Polling interval in ms (default 60_000).
 */
export function useAnalyticsSummary({ refreshInterval = 60_000 } = {}) {
  const [summary, setSummary]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef                   = useRef(null);

  const fetchSummary = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/analytics/summary`, {
        signal: AbortSignal.timeout(12_000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSummary(data);
      setLastUpdated(new Date());
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load analytics');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    intervalRef.current = setInterval(() => fetchSummary(true), refreshInterval);
    return () => clearInterval(intervalRef.current);
  }, [refreshInterval, fetchSummary]);

  const refresh = useCallback(() => fetchSummary(false), [fetchSummary]);

  return { summary, loading, error, lastUpdated, refresh };
}

/**
 * useAIInsights — Fetches /api/ai/insights with auto-refresh.
 */
export function useAIInsights({ refreshInterval = 90_000 } = {}) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const intervalRef             = useRef(null);

  const fetchInsights = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/ai/insights`, {
        signal: AbortSignal.timeout(12_000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setInsights(data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to load AI insights');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  useEffect(() => {
    if (refreshInterval <= 0) return;
    intervalRef.current = setInterval(() => fetchInsights(true), refreshInterval);
    return () => clearInterval(intervalRef.current);
  }, [refreshInterval, fetchInsights]);

  const refresh = useCallback(() => fetchInsights(false), [fetchInsights]);

  return { insights, loading, error, refresh };
}
