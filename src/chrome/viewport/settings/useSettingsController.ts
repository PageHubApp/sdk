import debounce from "lodash.debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";

interface UseSettingsControllerOptions<TDraft> {
  isOpen: boolean;
  /** May return a Promise for async loading (e.g. fetching remote page settings). */
  loadDraft: () => TDraft | Promise<TDraft>;
  getDraftSignature: (draft: TDraft) => string;
  /** May return a Promise for async saving (e.g. remote page settings PATCH). */
  commitDraft: (draft: TDraft) => void | Promise<void>;
  debounceMs?: number;
  reloadKey?: unknown;
}

function isThenable<T>(value: T | Promise<T>): value is Promise<T> {
  return !!value && typeof (value as any).then === "function";
}

export function useSettingsController<TDraft>({
  isOpen,
  loadDraft,
  getDraftSignature,
  commitDraft,
  debounceMs = 350,
  reloadKey,
}: UseSettingsControllerOptions<TDraft>) {
  // Probe once on mount: sync → use value immediately, async → start loading.
  const [initResult] = useState(() => {
    const r = loadDraft();
    return isThenable(r)
      ? { draft: undefined as unknown as TDraft, loading: true, pending: r }
      : { draft: r, loading: false, pending: null };
  });

  const [draft, setDraft] = useState<TDraft>(initResult.draft);
  const [loading, setLoading] = useState(initResult.loading);
  const draftRef = useRef<TDraft>(initResult.draft);
  const lastSavedSignatureRef = useRef(
    initResult.loading ? "" : getDraftSignature(initResult.draft),
  );
  const isFirstRunRef = useRef(true);

  const flushNowRef = useRef<() => void>(() => {});
  const requestSaveRef = useRef<ReturnType<typeof debounce> | null>(null);
  const loadDraftRef = useRef(loadDraft);
  const getDraftSignatureRef = useRef(getDraftSignature);
  const commitDraftRef = useRef(commitDraft);

  useEffect(() => { loadDraftRef.current = loadDraft; }, [loadDraft]);
  useEffect(() => { getDraftSignatureRef.current = getDraftSignature; }, [getDraftSignature]);
  useEffect(() => { commitDraftRef.current = commitDraft; }, [commitDraft]);

  const flushNow = useCallback(() => {
    const snapshot = draftRef.current;
    if (snapshot === undefined) return;
    const nextSignature = getDraftSignatureRef.current(snapshot);
    if (nextSignature === lastSavedSignatureRef.current) return;
    const result = commitDraftRef.current(snapshot);
    lastSavedSignatureRef.current = nextSignature;
    if (isThenable(result)) {
      result.catch(e => console.error("Error saving settings:", e));
    }
  }, []);

  const requestSave = useMemo(() => debounce(flushNow, debounceMs), [flushNow, debounceMs]);

  useEffect(() => { flushNowRef.current = flushNow; }, [flushNow]);
  useEffect(() => {
    requestSaveRef.current = requestSave;
    return () => requestSaveRef.current?.cancel();
  }, [requestSave]);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const applyDraft = useCallback((nextDraft: TDraft) => {
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    lastSavedSignatureRef.current = getDraftSignatureRef.current(nextDraft);
    setLoading(false);
  }, []);

  // Resolve async init (mount-only).
  useEffect(() => {
    if (!initResult.pending) return;
    let cancelled = false;
    initResult.pending
      .then(resolved => { if (!cancelled) applyDraft(resolved); })
      .catch(e => {
        console.error("Error loading settings:", e);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload draft on reopen or reloadKey change (skip first run — init handled above).
  useEffect(() => {
    if (!isOpen) return;
    if (isFirstRunRef.current) {
      isFirstRunRef.current = false;
      return;
    }

    let cancelled = false;
    const result = loadDraftRef.current();

    if (isThenable(result)) {
      setLoading(true);
      result
        .then(resolved => { if (!cancelled) applyDraft(resolved); })
        .catch(e => {
          console.error("Error loading settings:", e);
          if (!cancelled) setLoading(false);
        });
    } else {
      applyDraft(result);
    }

    return () => {
      cancelled = true;
      requestSaveRef.current?.cancel();
      flushNowRef.current();
    };
  }, [isOpen, reloadKey, applyDraft]);

  // Auto-save on draft changes.
  useEffect(() => {
    if (!isOpen || loading) return;
    requestSaveRef.current?.();
  }, [draft, isOpen, loading]);

  const flushSave = useCallback(() => {
    requestSaveRef.current?.cancel();
    flushNowRef.current();
  }, []);

  const cancelSave = useCallback(() => {
    requestSaveRef.current?.cancel();
  }, []);

  const updateField = useCallback(
    <K extends keyof TDraft>(key: K, value: SetStateAction<TDraft[K]>) => {
      setDraft(prev => {
        const resolvedValue =
          typeof value === "function"
            ? (value as (prevState: TDraft[K]) => TDraft[K])(prev[key])
            : value;
        const next = { ...prev, [key]: resolvedValue };
        draftRef.current = next;
        return next;
      });
    },
    []
  );

  return { draft, setDraft, updateField, loading, requestSave: () => requestSaveRef.current?.(), flushSave, cancelSave };
}
