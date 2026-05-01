import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useMemo, useState } from "react";
import { TbLayoutSidebarRightExpand, TbSearch } from "react-icons/tb";
import { ComponentsAtom } from "../../../utils/atoms";
import { useCustomComponents } from "../../../define/context";
import { usePanelUrl } from "../../../utils/usePanelUrl";
import { AutoHideScrollbar } from "../../primitives/layout/AutoHideScrollbar";
import {
  buildToolboxInsertDescriptors,
  type ToolboxInsertDescriptor,
} from "../state/buildToolboxInsertDescriptors";
import { insertToolboxPresetAfterNode } from "../toolbox/toolboxUtils";
import { resolveToolboxIcon } from "../toolbox/resolveToolboxIcon";

const FLYOUT_W = 280;
const FLYOUT_MAX_H = 360;

type Props = {
  targetNodeId: string;
  onInserted: () => void;
  onOpenComponentsTab: () => void;
};

export function ContextMenuInsertComponentFlyout({
  targetNodeId,
  onInserted,
  onOpenComponentsTab,
}: Props) {
  const { actions, query } = useEditor();
  const components = useAtomValue(ComponentsAtom);
  const { toolboxCategories } = useCustomComponents();
  const { open: openPanel } = usePanelUrl();
  const [q, setQ] = useState("");

  const descriptors = useMemo(
    () => buildToolboxInsertDescriptors(toolboxCategories, components),
    [toolboxCategories, components]
  );

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return descriptors;
    return descriptors.filter(
      d => d.label.toLowerCase().includes(t) || d.category.toLowerCase().includes(t)
    );
  }, [descriptors, q]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const d of filtered) {
      if (!map.has(d.category)) map.set(d.category, []);
      map.get(d.category)!.push(d);
    }
    return [...map.entries()];
  }, [filtered]);

  const handlePick = (toolProps: ToolboxInsertDescriptor["toolProps"]) => {
    insertToolboxPresetAfterNode(query, actions, targetNodeId, toolProps);
    onInserted();
  };

  return (
    <div
      className="border-base-300/50 bg-base-100 text-base-content flex flex-col overflow-hidden rounded-xl border shadow-xl"
      style={{ width: FLYOUT_W, maxHeight: FLYOUT_MAX_H }}
      onMouseDown={e => e.stopPropagation()}
      onMouseDownCapture={e => e.stopPropagation()}
    >
      <div className="border-base-200 flex items-center gap-1 border-b px-2 py-1.5">
        <TbSearch className="size-4 shrink-0 opacity-50" aria-hidden />
        <input
          type="search"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search components"
          className="input input-ghost input-xs min-h-0 flex-1 border-0 bg-transparent px-1 text-sm focus:outline-none"
          aria-label="Search components to insert"
        />
      </div>
      <AutoHideScrollbar className="max-h-[280px] flex-1">
        {byCategory.length === 0 ? (
          <div className="text-neutral-content px-3 py-4 text-center text-xs">No matches</div>
        ) : (
          byCategory.map(([category, items]) => (
            <div key={category}>
              <div className="bg-base-200/80 text-neutral-content px-2 py-1 text-[10px] font-semibold tracking-wide uppercase">
                {category}
              </div>
              {items.map(d => {
                const Icon = resolveToolboxIcon(d.icon);
                return (
                  <button
                    key={d.key}
                    type="button"
                    className="border-base-200/80 hover:bg-base-200 flex w-full items-center gap-2 border-b px-2 py-1.5 text-left text-xs"
                    onClick={() => handlePick(d.toolProps)}
                  >
                    <Icon className="text-base-content size-4 shrink-0 opacity-80" aria-hidden />
                    <span className="truncate">{d.label}</span>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </AutoHideScrollbar>
      <button
        type="button"
        className="border-base-200 text-neutral-content hover:bg-base-200 flex w-full items-center gap-2 border-t px-2 py-2 text-left text-xs"
        onClick={() => {
          openPanel("components");
          onOpenComponentsTab();
        }}
      >
        <TbLayoutSidebarRightExpand className="size-4 shrink-0" aria-hidden />
        Open components tab
      </button>
    </div>
  );
}
