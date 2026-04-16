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
  const [draft, setDraft] = useState<TDraft>(undefined as unknown as TDraft);
  const [loading, setLoading] = useState(true);
  const draftRef = useRef<TDraft>(undefined as unknown as TDraft);
  const lastSavedSignatureRef = useRef("");

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

  // Load draft on open / reloadKey change. Always runs in an effect (never in
  // useState initializer) so it's immune to React 18 strict-mode double-firing
  // and always reads the latest tree / config state.
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoading(true);

    const result = loadDraftRef.current();

    if (isThenable(result)) {
      result
        .then(resolved => { if (!cancelled) applyDraft(resolved); })
        .catch(e => {
          console.error("Error loading settings:", e);
          if (!cancelled) setLoading(false);
        });
    } else {
      if (!cancelled) applyDraft(result);
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
