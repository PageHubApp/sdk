import { useEffect, useState } from "react";
import { phStorage } from "@/utils/phStorage";
import type { MediaKind, SortDirection, SortField } from "../utils/media-helpers";
import type { FolderFilter } from "./types";

export function useMediaViewState() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = phStorage.get("media-view");
      return saved === "list" || saved === "cards" ? saved : "cards";
    }
    return "cards";
  });
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [kindFilter, setKindFilter] = useState<MediaKind | "all">("all");
  const [folderFilter, setFolderFilter] = useState<FolderFilter>("all");

  useEffect(() => {
    if (typeof window !== "undefined") {
      phStorage.set("media-view", viewMode);
    }
  }, [viewMode]);

  const handleSearch = (q: string) => setSearchQuery(q);
  const handleKindFilterChange = (next: MediaKind | "all") => setKindFilter(next);

  return {
    searchQuery,
    setSearchQuery,
    viewMode,
    setViewMode,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    kindFilter,
    setKindFilter,
    folderFilter,
    setFolderFilter,
    handleSearch,
    handleKindFilterChange,
  };
}
