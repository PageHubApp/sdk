import React, { createContext, useContext, useEffect, useState } from "react";
import type { IconSvgEntry, IconSvgMap } from "./serverResolve";

export type { IconSvgEntry, IconSvgMap };

const IconSvgMapContext = createContext<IconSvgMap>({});

export const IconSvgMapProvider = IconSvgMapContext.Provider;

const clientCache = new Map<string, IconSvgEntry | null>();
const inFlight = new Map<string, Promise<IconSvgEntry | null>>();

async function fetchClient(ref: string): Promise<IconSvgEntry | null> {
  if (clientCache.has(ref)) return clientCache.get(ref) ?? null;
  const existing = inFlight.get(ref);
  if (existing) return existing;
  const promise = (async () => {
    try {
      const res = await fetch(`/api/icon?ref=${encodeURIComponent(ref)}`);
      if (!res.ok) {
        clientCache.set(ref, null);
        return null;
      }
      const json = (await res.json()) as IconSvgEntry;
      clientCache.set(ref, json);
      return json;
    } catch {
      clientCache.set(ref, null);
      return null;
    } finally {
      inFlight.delete(ref);
    }
  })();
  inFlight.set(ref, promise);
  return promise;
}

export function useIconSvg(ref: string | undefined): IconSvgEntry | null {
  const map = useContext(IconSvgMapContext);
  const fromMap = ref ? map[ref] : undefined;
  const initial = fromMap ?? (ref ? clientCache.get(ref) ?? null : null);
  const [entry, setEntry] = useState<IconSvgEntry | null>(initial ?? null);

  useEffect(() => {
    if (!ref) {
      setEntry(null);
      return;
    }
    if (fromMap) {
      setEntry(fromMap);
      return;
    }
    const cached = clientCache.get(ref);
    if (cached !== undefined) {
      setEntry(cached);
      return;
    }
    let cancelled = false;
    fetchClient(ref).then((e) => {
      if (!cancelled) setEntry(e);
    });
    return () => {
      cancelled = true;
    };
  }, [ref, fromMap]);

  return entry;
}

export function seedIconSvgCache(map: IconSvgMap | undefined): void {
  if (!map) return;
  for (const [ref, entry] of Object.entries(map)) {
    clientCache.set(ref, entry);
  }
}
