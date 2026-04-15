import debounce from "lodash.debounce";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetStateAction } from "react";

interface UseSettingsControllerOptions<TDraft> {
  isOpen: boolean;
  loadDraft: () => TDraft;
  getDraftSignature: (draft: TDraft) => string;
  commitDraft: (draft: TDraft) => void;
  debounceMs?: number;
  reloadKey?: unknown;
}

export function useSettingsController<TDraft>({
  isOpen,
  loadDraft,
  getDraftSignature,
  commitDraft,
  debounceMs = 350,
  reloadKey,
}: UseSettingsControllerOptions<TDraft>) {
  const [draft, setDraft] = useState<TDraft>(() => loadDraft());
  const draftRef = useRef(draft);
  const lastSavedSignatureRef = useRef<string>(getDraftSignature(draft));
  const flushNowRef = useRef<() => void>(() => {});
  const requestSaveRef = useRef<ReturnType<typeof debounce> | null>(null);
  const loadDraftRef = useRef(loadDraft);
  const getDraftSignatureRef = useRef(getDraftSignature);
  const commitDraftRef = useRef(commitDraft);

  useEffect(() => {
    loadDraftRef.current = loadDraft;
  }, [loadDraft]);

  useEffect(() => {
    getDraftSignatureRef.current = getDraftSignature;
  }, [getDraftSignature]);

  useEffect(() => {
    commitDraftRef.current = commitDraft;
  }, [commitDraft]);

  const flushNow = useCallback(() => {
    const snapshot = draftRef.current;
    const nextSignature = getDraftSignatureRef.current(snapshot);
    if (nextSignature === lastSavedSignatureRef.current) return;
    commitDraftRef.current(snapshot);
    lastSavedSignatureRef.current = nextSignature;
  }, []);

  const requestSave = useMemo(() => debounce(flushNow, debounceMs), [flushNow, debounceMs]);

  useEffect(() => {
    flushNowRef.current = flushNow;
  }, [flushNow]);

  useEffect(() => {
    requestSaveRef.current = requestSave;
    return () => requestSaveRef.current?.cancel();
  }, [requestSave]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    if (!isOpen) return;

    const nextDraft = loadDraftRef.current();
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    lastSavedSignatureRef.current = getDraftSignatureRef.current(nextDraft);

    return () => {
      requestSaveRef.current?.cancel();
      flushNowRef.current();
    };
  }, [isOpen, reloadKey]);

  useEffect(() => {
    if (!isOpen) return;
    requestSaveRef.current?.();
  }, [draft, isOpen]);

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

  return {
    draft,
    setDraft,
    updateField,
    requestSave: () => requestSaveRef.current?.(),
    flushSave,
    cancelSave,
  };
}
