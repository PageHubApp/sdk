import { useEditor } from "@craftjs/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getMediaContent } from "@/utils/lib";
import { phStorage } from "../../../../../utils/phStorage";
import { loadIconSprite } from "../../../../../utils/icons/IconSvgMapContext";
import { deriveCategories, type IconCategory } from "../utils/deriveCategories";

export interface IconSetMeta {
  id: string;
  name: string;
  projectUrl: string;
  license: string;
  licenseUrl: string;
  count: number;
}

export const COLUMN_COUNT = 7;
export const COLUMN_WIDTH = 44;
export const ROW_HEIGHT = 44;
export const CONTAINER_WIDTH = 7 * COLUMN_WIDTH;
export const VISIBLE_ROWS = 8;

const RECENTS_KEY = "icon-recents";
const FAVORITES_KEY = "icon-favorites";
const RECENTS_CAP = 30;
const FAVORITES_CAP = 100;

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

function setIdFromRef(ref: string): string | null {
  const slash = ref.indexOf("/");
  return slash > 0 ? ref.slice(0, slash) : null;
}

export interface UseIconDialogProps {
  value: string;
  prefix?: string;
  isOpen: boolean;
  onChange: (value: string) => void;
  onClose: () => void;
  onUseMedia?: () => void;
}

export function useIconDialog({
  value,
  prefix,
  isOpen,
  onChange,
  onClose,
  onUseMedia,
}: UseIconDialogProps) {
  const { query } = useEditor();

  // Synthesize the legacy `dialog` shape so IconsTab/MediaTab keep working.
  const dialog = useMemo(
    () => ({ value, prefix, enabled: isOpen, changed: onChange, onUseMedia }),
    [value, prefix, isOpen, onChange, onUseMedia]
  );

  const getInitialTab = (): "media" | "icons" => {
    if (value?.startsWith("ref-image:")) return "media";
    return "icons";
  };

  const [activeTab, setActiveTab] = useState<"media" | "icons">(getInitialTab());
  const [selectedIcon, setSelectedIcon] = useState(value);

  const [set, setSet] = useState<string>(() => {
    if (value?.startsWith("ref-icon:")) {
      const body = value.replace("ref-icon:", "");
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

  const [recents, setRecents] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [focusedIndex, setFocusedIndex] = useState(0);
  const gridRef = useRef<any>(null);

  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    if (setIndex) return;
    loadSetIndex().then(setSetIndex).catch(console.error);
  }, [isOpen, setIndex]);

  useEffect(() => {
    if (!isOpen) return;
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
  }, [set, isOpen]);

  // Load recents/favorites from storage on dialog open
  useEffect(() => {
    if (!isOpen) return;
    const storedRecents = phStorage.getJSON<string[]>(RECENTS_KEY, []);
    const storedFavorites = phStorage.getJSON<string[]>(FAVORITES_KEY, []);
    if (Array.isArray(storedRecents)) setRecents(storedRecents);
    if (Array.isArray(storedFavorites)) setFavorites(storedFavorites);
  }, [isOpen]);

  // Prefetch the default set + any sets referenced by recents/favorites so
  // cross-set cells render without a sprite fetch flicker.
  useEffect(() => {
    if (!isOpen) return;
    const sets = new Set<string>(["tb"]);
    for (const r of recents) {
      const s = setIdFromRef(r);
      if (s) sets.add(s);
    }
    for (const f of favorites) {
      const s = setIdFromRef(f);
      if (s) sets.add(s);
    }
    for (const s of sets) {
      loadIconSprite(s);
      loadSetNames(s).catch(() => {});
    }
  }, [isOpen, recents, favorites]);

  const filteredIcons = useMemo(() => {
    const names = setNames || [];
    if (!search) return names;
    const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    return names.filter(n => re.test(n));
  }, [setNames, search]);

  const categories: IconCategory[] = useMemo(
    () => deriveCategories(set, setNames || []),
    [set, setNames]
  );

  const rowCount = Math.ceil(filteredIcons.length / COLUMN_COUNT);

  useEffect(() => {
    if (isOpen) setActiveTab(getInitialTab());
  }, [value, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIcon(value);
    } else {
      setActiveTab("icons");
      setSearch("");
      setShowMediaBrowser(false);
    }
  }, [isOpen, value]);

  useEffect(() => {
    setFocusedIndex(0);
  }, [activeTab, set, search]);

  const closeDialog = onClose;

  const recordUse = useCallback((iconRef: string) => {
    setRecents(prev => {
      const updated = [iconRef, ...prev.filter(r => r !== iconRef)].slice(0, RECENTS_CAP);
      phStorage.set(RECENTS_KEY, updated);
      return updated;
    });
  }, []);

  const toggleFavorite = useCallback((iconRef: string) => {
    setFavorites(prev => {
      const has = prev.includes(iconRef);
      const updated = has
        ? prev.filter(r => r !== iconRef)
        : [iconRef, ...prev].slice(0, FAVORITES_CAP);
      phStorage.set(FAVORITES_KEY, updated);
      return updated;
    });
  }, []);

  const emitChange = useCallback(
    (iconRef: string) => {
      const fullRef = `ref-icon:${iconRef}`;
      recordUse(iconRef);
      onChange(fullRef);
      onClose();
    },
    [recordUse, onChange, onClose]
  );

  const handleIconClick = useCallback(
    (iconRef: string) => {
      const fullRef = `ref-icon:${iconRef}`;
      setSelectedIcon(fullRef);
      onChange(fullRef);
    },
    [onChange]
  );

  const handleIconDoubleClick = useCallback(
    (iconRef: string) => {
      emitChange(iconRef);
    },
    [emitChange]
  );

  const handleMediaSelect = (mediaId: string) => {
    if (!mediaId) return;
    const fullRef = `ref-image:${mediaId}`;
    onChange(fullRef);
    onClose();
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
      if (!isOpen || activeTab !== "icons") return;
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
            emitChange(`${set}/${icons[focusedIndex]}`);
          }
          break;
        case "Escape":
          e.preventDefault();
          closeDialog();
          break;
      }
    },
    [isOpen, activeTab, filteredIcons, focusedIndex, set, emitChange, closeDialog]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return {
    dialog,
    closeDialog,
    isClient,
    activeTab,
    setActiveTab,
    set,
    setIndex,
    setNames,
    handleSetChange,
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
    recents,
    favorites,
    toggleFavorite,
    categories,
    showMediaBrowser,
    setShowMediaBrowser,
    handleMediaSelect,
    query,
    getMediaContent,
  };
}

export type UseIconDialogReturn = ReturnType<typeof useIconDialog>;
