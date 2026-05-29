import React, { createContext, useContext, useEffect, useState } from "react";
import type { IconSvgEntry, IconSvgMap } from "./serverResolve";
import { parseIconRef } from "./collectIconRefs";
import { sdkLog } from "../logger";

export type { IconSvgEntry, IconSvgMap };

const IconSvgMapContext = createContext<IconSvgMap>({});

export const IconSvgMapProvider = IconSvgMapContext.Provider;

// Which set sprite sheets have been injected into the current document.
const loadedSprites = new Set<string>();
const loadingSprites = new Map<string, Promise<void>>();

export function loadIconSprite(setId: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  if (loadedSprites.has(setId)) return Promise.resolve();
  const existing = loadingSprites.get(setId);
  if (existing) return existing;

  const promise = fetch(`/icon-sprites/${setId}.svg`)
    .then(r => {
      if (!r.ok) throw new Error(`sprite ${setId} fetch ${r.status}`);
      return r.text();
    })
    .then(text => {
      if (typeof document === "undefined") return;
      if (loadedSprites.has(setId)) return;
      const host = document.createElement("div");
      host.id = `ph-icon-sprite-${setId}`;
      host.setAttribute("aria-hidden", "true");
      host.style.display = "none";
      host.innerHTML = text;
      document.body.appendChild(host);
      loadedSprites.add(setId);
    })
    .catch(err => {
      loadingSprites.delete(setId);
      sdkLog.warn(err);
    })
    .finally(() => {
      loadingSprites.delete(setId);
    });

  loadingSprites.set(setId, promise);
  return promise;
}

export function isIconSpriteLoaded(setId: string): boolean {
  return loadedSprites.has(setId);
}

export function useIconSvg(ref: string | undefined): IconSvgEntry | null {
  const map = useContext(IconSvgMapContext);
  return ref ? (map[ref] ?? null) : null;
}

/**
 * Hook that guarantees the sprite sheet for a ref's set is loaded in the DOM.
 * Returns true once the sprite is available and `<use href="#Name"/>` will
 * resolve; false while fetching.
 */
export function useIconSprite(ref: string | undefined): boolean {
  const [ready, setReady] = useState(() => {
    if (!ref) return false;
    const parsed = parseIconRef(ref);
    return !!parsed && loadedSprites.has(parsed.set);
  });

  useEffect(() => {
    if (!ref) {
      setReady(false);
      return;
    }
    const parsed = parseIconRef(ref);
    if (!parsed) {
      setReady(false);
      return;
    }
    if (loadedSprites.has(parsed.set)) {
      setReady(true);
      return;
    }
    let cancelled = false;
    loadIconSprite(parsed.set).then(() => {
      if (!cancelled) setReady(loadedSprites.has(parsed.set));
    });
    return () => {
      cancelled = true;
    };
  }, [ref]);

  return ready;
}
