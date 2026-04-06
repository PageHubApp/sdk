// @ts-nocheck
import { useAtomValue } from "@zedux/react";
import throttle from "lodash.throttle";
import { useEffect, useMemo, useRef, useState } from "react";
import { ComponentsAtom } from "utils/lib";
import { NAV_EXTRA_PRESETS } from "../../components/definitions";
import { useCustomComponents } from "../../define";
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
  const [search, setSearch] = useState(null);

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

  useEffect(() => {
    if (search) {
      const searchTerm = search.toLowerCase();
      setList(
        items
          .map(item => {
            const title = item.title.toString().toLowerCase() || "";

            // Filter content by searching the entire React element as a string
            const filteredContent = item.content.filter(nestedItem => {
              // Convert the entire React element to string and search in it
              const elementString = JSON.stringify(nestedItem) || "";
              return elementString.toLowerCase().includes(searchTerm);
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
            onKeyUp={throttle(e => {
              setSearch(e.target.value);
            }, 100)}
          />
        </div>
      </form>
      <AutoHideScrollbar className="flex-1">
        {list?.map((a, k) => (
          <div key={k} className="border-border">
            <div className="mb-1 font-bold text-secondary-foreground ml-4 text-xs">
              {a.title}
            </div>

            <div className="grid w-full grid-cols-3 gap-3 p-3 border-t border-border">
              {a.content.map((item, kk) => (
                <div key={kk}>{item}</div>
              ))}
            </div>
          </div>
        ))}
      </AutoHideScrollbar>
    </div>
  );
};
