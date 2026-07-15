"use client";

import { useCallback, useEffect, useState } from "react";

export type LiveHealth = {
  live: boolean;
  ageMs: number;
  lastEventAt: string | null;
};

export function useLiveData<T extends { health?: LiveHealth }>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(url, { cache: "no-store", signal });
      if (!response.ok) throw new Error(`Falha ao carregar (${response.status})`);
      setData(await response.json() as T);
      setError(null);
    } catch (reason) {
      if ((reason as Error).name !== "AbortError") setError((reason as Error).message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => void refresh(controller.signal), 0);
    const events = new EventSource("/api/live");
    events.addEventListener("feed", () => void refresh(controller.signal));
    const fallback = window.setInterval(() => void refresh(controller.signal), 5000);
    return () => {
      controller.abort();
      window.clearTimeout(initial);
      events.close();
      window.clearInterval(fallback);
    };
  }, [refresh]);

  return { data, loading, error, refresh: () => refresh() };
}
