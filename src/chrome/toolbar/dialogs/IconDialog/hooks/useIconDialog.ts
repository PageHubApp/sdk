import { useEditor } from "@craftjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtomState } from "@zedux/react";
import { IconPickerDialogAtom } from "../../dialogAtoms";
import { getMediaContent } from "@/utils/lib";

export interface IconSetMeta {
  id: string;
  name: string;
  projectUrl: string;
  license: string;
  licenseUrl: string;
  count: number;
}

// Grid config
export const COLUMN_COUNT = 5;
export const COLUMN_WIDTH = 68;
export const ROW_HEIGHT = 70;
export const CONTAINER_WIDTH = 359;
export const VISIBLE_ROWS = 6;

// In-memory caches — shared across dialog opens.
const setIndexCache: { data: IconSetMeta[] | null } = { data: null };
const setNamesCache = new Map<string, string[]>();

async function loadSetIndex(): Promise<IconSetMeta[]> {
  if (setIndexCache.data) return setIndexCache.data;
  const res = await fetch("/api/icon-manifest");
  if (!res.ok) throw new Error("Failed to load icon set index");
  const data = (await res.json()) as IconSetMeta[];
  setIndexCache.data = data;
  return data;
}

async function loadSetNames(setId: string): Promise<string[]> {
  const cached = setNamesCache.get(setId);
  if (cached) return cached;
  const res = await fetch(`/api/icon-manifest?set=${encodeURIComponent(setId)}`);
  if (!res.ok) throw new Error(`Failed to load manifest for set "${setId}"`);
  const data = (await res.json()) as string[];
  setNamesCache.set(setId, data);
  return data;
}

export function useIconDialog() {
  const [dialog, setDialog] = useAtomState(IconPickerDialogAtom);
  const { query } = useEditor();

  const getInitialTab = (): "media" | "icons" => {
    if (dialog.value?.startsWith("ref-image:")) return "media";
    return "icons";
  };

  const [activeTab, setActiveTab] = useState<"media" | "icons">(getInitialTab());
  const [selectedIcon, setSelectedIcon] = useState(dialog.value);

  const [set, setSet] = useState<string>(() => {
    if (dialog.value?.startsWith("ref-icon:")) {
      const body = dialog.value.replace("ref-icon:", "");
      const slash = body.indexOf("/");
      if (slash > 0) return body.slice(0, slash);
    }
    return "tb";
  });
  const [search, setSearch] = useState("");
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);

  const [setIndex, setSetIndex] = useState<IconSetMeta[] | null>(setIndexCache.data);
  const [setNames, setSetNames] = useState<string[] | null>(setNamesCache.get(set) || null);
  const [loadingNames, setLoadingNames] = useState(false);

  const [focusedIndex, setFocusedIndex] = useState(0);
  const gridRef = useRef<any>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!dialog.enabled) return;
    if (setIndex) return;
    loadSetIndex().then(setSetIndex).catch(console.error);
  }, [dialog.enabled, setIndex]);

  useEffect(() => {
    if (!dialog.enabled) return;
    const cached = setNamesCache.get(set);
    if (cached) {
      setSetNames(cached);
      return;
    }
    setLoadingNames(true);
    loadSetNames(set)
      .then(names => {
        setSetNames(names);
        setLoadingNames(false);
      })
      .catch(err => {
        console.error(err);
        setSetNames([]);
        setLoadingNames(false);
      });
  }, [set, dialog.enabled]);

  const filteredIcons = useMemo(() => {
    const names = setNames || [];
    if (!search) return names;
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return names.filter(n => re.test(n));
  }, [setNames, search]);

  const rowCount = Math.ceil(filteredIcons.length / COLUMN_COUNT);

  useEffect(() => {
    if (dialog.enabled) setActiveTab(getInitialTab());
  }, [dialog.value, dialog.enabled]);

  useEffect(() => {
    if (dialog.enabled) {
      setSelectedIcon(dialog.value);
    } else {
      setActiveTab("icons");
      setSearch("");
      setShowMediaBrowser(false);
    }
  }, [dialog.enabled, dialog.value]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [activeTab, set, search]);

  const closeDialog = () => setDialog({ ...dialog, enabled: false });

  const emitChange = (iconRef: string) => {
    if (!dialog.changed) return;
    setDialog({ ...dialog, value: iconRef, enabled: false });
    dialog.changed(iconRef);
  };

  const handleIconClick = (name: string) => {
    const iconRef = `ref-icon:${set}/${name}`;
    setSelectedIcon(iconRef);
    dialog.changed?.(iconRef);
  };

  const handleIconDoubleClick = (name: string) => {
    emitChange(`ref-icon:${set}/${name}`);
  };

  const handleMediaSelect = (mediaId: string) => {
    if (!mediaId) return;
    emitChange(`ref-image:${mediaId}`);
    setShowMediaBrowser(false);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    gridRef.current?.scrollTo({ scrollLeft: 0, scrollTop: 0 });
  };

  const handleSetChange = (nextSet: string) => {
    setSet(nextSet);
    setSearch("");
    gridRef.current?.scrollTo({ scrollLeft: 0, scrollTop: 0 });
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!dialog.enabled || activeTab !== "icons") return;
      const icons = filteredIcons;
      if (icons.length === 0) return;

      const scrollTo = (idx: number) => {
        gridRef.current?.scrollToItem({
          rowIndex: Math.floor(idx / COLUMN_COUNT),
          columnIndex: idx % COLUMN_COUNT,
        });
      };

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          if (focusedIndex < icons.length - 1) {
            setFocusedIndex(focusedIndex + 1);
            scrollTo(focusedIndex + 1);
          }
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (focusedIndex > 0) {
            setFocusedIndex(focusedIndex - 1);
            scrollTo(focusedIndex - 1);
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          {
            const n = focusedIndex + COLUMN_COUNT;
            if (n < icons.length) {
              setFocusedIndex(n);
              scrollTo(n);
            }
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          {
            const n = focusedIndex - COLUMN_COUNT;
            if (n >= 0) {
              setFocusedIndex(n);
              scrollTo(n);
            }
          }
          break;
        case "Enter":
          e.preventDefault();
          if (icons[focusedIndex]) {
            handleIconDoubleClick(icons[focusedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDialog();
          break;
      }
    },
    [dialog.enabled, activeTab, filteredIcons, focusedIndex, set],
  );

  useEffect(() => {
    if (!dialog.enabled) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [dialog.enabled, handleKeyDown]);

  return {
    dialog,
    closeDialog,
    isClient,
    activeTab,
    setActiveTab,
    // Set selector
    set,
    setIndex,
    handleSetChange,
    // Icons grid
    search,
    setSearch,
    filteredIcons,
    rowCount,
    selectedIcon,
    focusedIndex,
    gridRef,
    loadingNames,
    handleSearch,
    handleIconClick,
    handleIconDoubleClick,
    // Media
    showMediaBrowser,
    setShowMediaBrowser,
    handleMediaSelect,
    // Helpers
    query,
    getMediaContent,
  };
}

export type UseIconDialogReturn = ReturnType<typeof useIconDialog>;
