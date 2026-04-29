/**
 * AutoChildListGroups — auto-detect contiguous runs of same-name children and
 * render one CraftListEditor per run.
 *
 * Why: lets a plain Container with N Buttons / Images / Icons expose
 * add/remove/reorder UI without needing a dedicated wrapper component
 * (the role ButtonList / ImageList used to play, now retired).
 * ABA-pattern siblings (Btn, Img, Btn)
 * are intentional layout — those don't get a list editor.
 *
 * Threshold: contiguous run length > 2 (so 3+).
 *
 * Skipped on nodes whose own MainTab already renders a list editor — see
 * LIST_WRAPPER_NAMES.
 */
import React from "react";
import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { atom, useAtomState } from "@zedux/react";
import { CraftListEditor } from "../inputs/preset/CraftListEditor";
import { ToolbarSection } from "../ToolbarSection";
import { getBuiltinComponentDef } from "../../../core/componentRegistry";
import { applyPeerClassInherit } from "../../shell/peerInherit/applyPeerClassInherit";
import { ActionsInput } from "../inputs/action/ActionsInput";
import { IconInput } from "../inputs/media/IconInput";
import { MediaInput } from "../inputs/media/MediaInput";

const MIN_RUN = 3;

// Only auto-group leaf content components — plain Containers / Sections /
// Groups are layout, not list items, so we don't tempt users to "add another
// Container" from the toolbar.
const GROUPABLE_NAMES = new Set([
  "Button",
  "Image",
  "Icon",
  "Link",
  "FormElement",
  "MapPoint",
  "TableRow",
]);

// Skip when the wrapper's own MainTab renders a list editor — avoids double UI.
// Map / Table* genuinely need bespoke editors.
const LIST_WRAPPER_NAMES = new Set(["Map", "Table", "TableSection", "TableRow"]);

interface DetectedGroup {
  name: string;
  ids: string[];
  startIdx: number;
}

function detectGroups(query: any, parentId: string): DetectedGroup[] {
  let parent: any;
  try {
    parent = query.node(parentId).get();
  } catch {
    return [];
  }
  const childIds: string[] = parent?.data?.nodes ?? [];
  const groups: DetectedGroup[] = [];
  let i = 0;
  while (i < childIds.length) {
    let name: string | undefined;
    try {
      name = query.node(childIds[i]).get()?.data?.name;
    } catch {
      i++;
      continue;
    }
    if (!name || !GROUPABLE_NAMES.has(name)) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < childIds.length) {
      let nextName: string | undefined;
      try {
        nextName = query.node(childIds[j]).get()?.data?.name;
      } catch {
        break;
      }
      if (nextName !== name) break;
      j++;
    }
    if (j - i > MIN_RUN - 1) {
      groups.push({ name, ids: childIds.slice(i, j), startIdx: i });
    }
    i = j;
  }
  return groups;
}

const SelectedAutoListAtom = atom<Record<string, number | null>>(
  "auto_child_list_selected",
  {}
);

function renderItemPopover(name: string, itemId: string): React.ReactNode {
  switch (name) {
    case "Button":
    case "Link":
      return (
        <NodeProvider id={itemId}>
          <ActionsInput />
          <IconInput
            propKey="icon"
            propType="component"
            label="Icon"
            labelWidth="w-full"
            inputWidth="w-fit"
            iconOnlyLabel="Only Show Icon"
            positionLabel="Position"
            collapsible={false}
          />
        </NodeProvider>
      );
    case "Image":
      return (
        <NodeProvider id={itemId}>
          <MediaInput propKey="videoId" typeKey="type" variant="chip" label="Image" />
        </NodeProvider>
      );
    case "Icon":
      return (
        <NodeProvider id={itemId}>
          <IconInput
            propKey="icon"
            propType="component"
            label="Icon"
            labelWidth="w-full"
            inputWidth="w-fit"
            collapsible={false}
          />
        </NodeProvider>
      );
    default:
      return null;
  }
}

function ChildListGroup({ parentId, group }: { parentId: string; group: DetectedGroup }) {
  const [selectedMap, setSelectedMap] = useAtomState(SelectedAutoListAtom) as unknown as [
    Record<string, number | null>,
    (v: Record<string, number | null>) => void,
  ];
  const groupKey = `${parentId}:${group.startIdx}:${group.name}`;
  const activeIndex = selectedMap[groupKey] ?? null;
  const setActiveIndex = (v: number | null) =>
    setSelectedMap({ ...selectedMap, [groupKey]: v });

  const def = getBuiltinComponentDef(group.name);
  const label = def?.name || group.name;
  const sectionIcon = React.useMemo(() => {
    const ico = def?.icon;
    if (!ico) return undefined;
    if (typeof ico === "string") return undefined;
    if (React.isValidElement(ico)) return ico;
    const IconComp = ico as React.ComponentType<unknown>;
    return <IconComp />;
  }, [def]);
  const idSet = React.useMemo(() => new Set(group.ids), [group.ids]);

  return (
    <ToolbarSection title={`${label}s`} icon={sectionIcon} collapsible={false}>
      <CraftListEditor
        parentId={parentId}
        childTypeName={group.name}
        filterChild={node => idSet.has(node.id)}
        mapItem={(node, _id, idx) => ({
          label:
            node?.data?.props?.text ||
            node?.data?.props?.alt ||
            node?.data?.custom?.displayName ||
            `${label} ${idx + 1}`,
        })}
        activeIndex={activeIndex}
        setActiveIndex={setActiveIndex}
        addLabel={`Add ${label}`}
        editTooltip={`Edit ${label.toLowerCase()}`}
        renderLabel={(item: any) => item.label}
        onAdd={({ query, actions, addNode, parentId: pid }) => {
          const Component = query.getOptions().resolver?.[group.name];
          if (!Component) return;
          const newId = addNode(<Component />);
          if (newId) applyPeerClassInherit(actions, query, newId, pid);
        }}
        renderPopover={(item: any) => renderItemPopover(group.name, item.id)}
      />
    </ToolbarSection>
  );
}

export function AutoChildListGroups() {
  const { id, name } = useNode((node: any) => ({ name: node.data?.name as string }));
  const { groups } = useEditor((_, q) => ({ groups: detectGroups(q, id) }));

  if (LIST_WRAPPER_NAMES.has(name)) return null;
  if (groups.length === 0) return null;

  return (
    <>
      {groups.map(g => (
        <ChildListGroup key={`${g.startIdx}:${g.name}`} parentId={id} group={g} />
      ))}
    </>
  );
}
