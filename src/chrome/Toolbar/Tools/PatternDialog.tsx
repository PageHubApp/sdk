// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { useAtomState } from "@zedux/react";
import { PatternDialogAtom } from "./dialogAtoms";
import { generatePattern } from "utils/lib";
import { Dialog } from "./Dialog";
import { getPageHubApiBaseUrl } from "../../../runtimeApi";

export { PatternDialogAtom } from "./dialogAtoms";

export const PatternDialog = () => {
  const [dialog, setDialog] = useAtomState(PatternDialogAtom);
  const [patterns, setPatterns] = useState([]);
  const [category, setCategory] = useState("all");
  const [searchValue, setSearchValue] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const apiUrl = getPageHubApiBaseUrl();
    fetch(`${apiUrl}/api/patterns`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })
      .then(res => res.json())
      .then(re => setPatterns(Array.isArray(re) ? re : []))
      .catch(() => {
        // Pattern fetch failed (CORS or network) — patterns panel will be empty.
        // Set apiBaseUrl in your SDK config to point to your own backend.
      });
  }, []);

  const changed = value => {
    if (dialog.changed) {
      setDialog({ ...dialog, value, enabled: false });
      dialog.changed(value);
    }
  };

  // Get unique categories from tags
  const categories = useMemo(() => {
    const allTags = new Set<string>();
    patterns.forEach(p => {
      if (p.tags && p.tags.length > 0) {
        p.tags.forEach(tag => allTags.add(tag));
      }
    });
    return ["all", "stroke", "fill", ...Array.from(allTags).sort()].slice(0, 10); // Limit to 10 categories
  }, [patterns]);

  const filteredPatterns = useMemo(() => {
    let filtered = patterns;

    // Filter by category
    if (category !== "all") {
      if (category === "stroke" || category === "fill") {
        filtered = filtered.filter(p => p.mode === category);
      } else {
        filtered = filtered.filter(p => p.tags && p.tags.includes(category));
      }
    }

    // Filter by search
    if (searchValue) {
      filtered = filtered.filter(
        p =>
          p.title.search(new RegExp(searchValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")) > -1
      );
    }

    return filtered;
  }, [patterns, category, searchValue]);

  const handleSearch = value => {
    setSearchValue(value);
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  };

  const handleCategoryChange = newCategory => {
    setCategory(newCategory);
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }
  };

  // List configuration
  const containerWidth = 400;
  const containerHeight = 400;
  const itemHeight = 50;

  const Row = ({ index, style }) => {
    const pattern = filteredPatterns[index];
    const patt = generatePattern({
      root: {
        pattern,
        patternVerticalPosition: 0,
        patternHorizontalPosition: 0,
        patternStroke: 1,
        patternZoom: 0,
        patternAngle: 0,
        patternSpacingX: 0,
        patternSpacingY: 0,
        patternColor1: "rgba(59, 130, 246, 0.8)", // Blue
        patternColor2: "rgba(16, 185, 129, 0.8)", // Green
        patternColor3: "rgba(245, 101, 101, 0.8)", // Red
        patternColor4: "rgba(168, 85, 247, 0.8)", // Purple
      },
    });

    return (
      <div style={style}>
        <button
          id={`pattern-${pattern.slug}`}
          className={`flex w-full cursor-pointer flex-row rounded-lg p-1 text-xs text-muted-foreground transition-colors hover:bg-muted ${
            dialog.value?.slug === pattern.slug ? "bg-primary text-primary-foreground" : ""
          }`}
          onClick={e => changed(pattern)}
        >
          <div className="pointer-events-none flex h-6 w-full items-center justify-between gap-3">
            <div className="w-1/2 truncate whitespace-nowrap">{pattern.title}</div>
            <div
              className="h-full w-1/2 rounded-lg border border-border bg-muted"
              style={{
                backgroundImage: patt ? `url(${patt})` : null,
              }}
            ></div>
          </div>
        </button>
      </div>
    );
  };

  return (
    <Dialog
      dialogAtom={PatternDialogAtom}
      dialogName="pattern"
      value={dialog?.value?.slug}
      items={filteredPatterns}
      height={containerHeight + 120}
      customOnSearch={handleSearch}
      customRenderer={
        <div className="flex h-full flex-col overflow-hidden">
          {/* Category Tabs - Scrollable with max height */}
          <div className="scrollbar mb-2 max-h-20 shrink-0 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    category === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  onClick={() => handleCategoryChange(cat)}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Pattern Count */}
          <div className="mb-2 shrink-0 text-xs text-muted-foreground">
            {filteredPatterns.length} pattern
            {filteredPatterns.length !== 1 ? "s" : ""}
          </div>

          {/* Virtualized List - Takes remaining space, scrolls independently */}
          <div className="-mx-3 min-h-0 flex-1 overflow-hidden px-3">
            <List
              ref={listRef}
              height={containerHeight}
              itemCount={filteredPatterns.length}
              itemSize={itemHeight}
              width={containerWidth - 24}
              className="scrollbar"
            >
              {Row}
            </List>
          </div>
        </div>
      }
    />
  );
};
