import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from './api';

/** Load JSON from the API, reload when the screen regains focus, support pull-to-refresh. */
export function useApi<T>(path: string | null, { refetchOnFocus = true } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const [refreshing, setRefreshing] = useState(false);
  const pathRef = useRef(path);
  pathRef.current = path;

  const load = useCallback(async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
    const p = pathRef.current;
    if (!p) return;
    if (mode === 'refresh') setRefreshing(true);
    if (mode === 'initial') setLoading(true);
    try {
      const d = await api<T>(p);
      if (pathRef.current === p) { setData(d); setError(null); }
    } catch (e: any) {
      if (pathRef.current === p) setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load('initial'); }, [path, load]);

  const first = useRef(true);
  useFocusEffect(useCallback(() => {
    if (first.current) { first.current = false; return; }
    if (refetchOnFocus) load('silent');
  }, [load, refetchOnFocus]));

  return {
    data, setData, error, loading, refreshing,
    reload: () => load('silent'),
    refresh: () => load('refresh'),
    retry: () => load('initial'),
  };
}
