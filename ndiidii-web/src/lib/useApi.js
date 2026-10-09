import { useEffect, useState } from 'react';
import { apiGet } from './api.js';

/** Loads one endpoint. status: 'loading' | 'ready' | 'error'. Re-fetches when path or params change. */
export function useApi(path, params) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const key = JSON.stringify([path, params]);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ status: 'loading', data: s.data }));
    apiGet(path, params)
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch(() => !cancelled && setState({ status: 'error', data: null }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return state;
}
