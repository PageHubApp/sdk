import { useAtomValue } from "@zedux/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ComponentsAtom } from "utils/lib";
import { NAV_EXTRA_PRESETS } from "../../components/definitions";
import { useCustomComponents } from "../../define";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { AutoHideScrollbar } from "../shared/layout";
import { buildCustomToolboxEntries, buildExtraPresetEntries } from "./Toolbox/customComponents";
import { SavedComponentsToolbox } from "./Toolbox/savedComponents";

// All built-in components now served via defineComponent() toolbox categories.
// Categories are defined as empty shells here and populated dynamically
// from the CustomComponentsContext merge below.
const baseItems = [
  { title: "Layout", content: [] as any[] },
  { title: "Basic", content: [] as any[] },
  { title: "Navigation", content: [] as any[] },
  { title: "Media", content: [] as any[] },
  { title: "Forms", content: [] as any[] },
  { title: "Interactive", content: [] as any[] },
  { title: "Embeds", content: [] as any[] },
];

export const ComponentSettings = () => {
  const components = useAtomValue(ComponentsAtom);
  const { toolboxCategories } = useCustomComponents();
  const [list, setList] = useState(baseItems);

  const {
    state: params,
    enterSearchMode,
    update: panelUpdate,
  } = usePanelUrl();

  const [search, setSearch] = useState(params.q ?? null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Build toolbox entries from defineComponent() definitions.
  // Flatten all presets into individual content items for the grid.
  const customItems = useMemo(() => {
    if (!toolboxCategories?.length) return [];
    return toolboxCategories.map(cat => ({
      title: cat.title,
      content: cat.content.flatMap((def) =>
        buildCustomToolboxEntries(def)
      ),
    }));
  }, [toolboxCategories]);

  // Nav extra presets (Social Nav, Plain Nav, etc.) — ButtonList-based, not Nav-based.
  // Built once and injected into the Navigation category.
  const navExtras = useMemo(() => buildExtraPresetEntries(NAV_EXTRA_PRESETS), []);

  // Merge defineComponent categories into matching base categories,
  // or append as new categories if no match. Then add saved components.
  const items = useMemo(() => {
    const merged = baseItems.map(item => ({ ...item, content: [...item.content] }));

    for (const custom of customItems) {
      const existing = merged.find(item => item.title === custom.title);
      if (existing) {
        existing.content.push(...custom.content);
      } else {
        merged.push(custom);
      }
    }

    // Inject Nav extra presets (ButtonList-based nav variants) into Navigation
    const navCategory = merged.find(item => item.title === "Navigation");
    if (navCategory) {
      navCategory.content.push(...navExtras);
    }

    if (components?.filter(component => !component.isSection)?.length) {
      merged.push(SavedComponentsToolbox(components));
    }

    return merged;
  }, [components, customItems, navExtras]);

  const focusRef = useRef(null);

  useEffect(() => {
    const time = setTimeout(() => focusRef?.current?.focus(), 50);
    return () => clearTimeout(time);
  }, [focusRef]);

  // Sync search input from URL params (e.g. on popstate/back)
  useEffect(() => {
    setSearch(params.q ?? null);
  }, [params.q]);

  // Debounce search input → URL param
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value || null);

    if (value.trim().length >= 1) {
      enterSearchMode();
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (value.trim().length >= 1) {
        panelUpdate({ q: value });
      } else {
        panelUpdate({ q: null });
      }
    }, 300);
  }, [enterSearchMode, panelUpdate]);

  useEffect(() => {
    if (search) {
      const searchTerm = search.toLowerCase();
      setList(
        items
          .map(item => {
            const title = item.title.toString().toLowerCase() || "";

            const filteredContent = item.content.filter(nestedItem => {
              // Extract searchable text from React element props (circular-ref safe)
              const props = nestedItem?.props ?? {};
              const searchable = [
                props.custom?.displayName,
                props.display?.props?.label,
                nestedItem?.key,
              ].filter(Boolean).join(" ").toLowerCase();
              return searchable.includes(searchTerm);
            });

            // Only return category if it has matching content (always filter items)
            if (filteredContent.length > 0) {
              return { ...item, content: filteredContent };
            }
            // If title matches but no content matches, still show the category but with all items
            if (title.includes(searchTerm)) {
              return item;
            }
            return null;
          })
          .filter(item => item !== null)
      );
      return;
    }

    setList(items);
  }, [search, items]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-sidebar">
      <form
        onSubmit={e => {
          setSearch(e.target[0].value);
          e.preventDefault();
        }}
      >
        <div className="flex gap-1.5 border-b border-border bg-background p-3">
          <input
            type="text"
            placeholder="Search Components"
            className="input-transparent"
            ref={focusRef}
            value={search ?? ""}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>
      </form>
      <AutoHideScrollbar className="flex-1">
        {list?.map((a, k) => (
          <div key={k} className="border-border">
            <div className="mb-1 mt-3 font-bold text-secondary-foreground ml-4 text-xs">
              {a.title}
            </div>

            <div className="grid w-full grid-cols-3 gap-3 p-3 border-t border-border">
              {a.content.map((item, kk) => (
                <div key={kk}>{item}</div>
              ))}
            </div>
          </div>
        ))}
        <div className="shrink-0" style={{ minHeight: "70vh" }} />
      </AutoHideScrollbar>
    </div>
  );
};
