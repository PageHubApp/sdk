import { getLinkedAncestorNode } from "@/utils/componentUtils";
import { clearRelation, getBelongsTo, setRelationField } from "@/utils/relation";
import { removeHasManyRelation } from "../../viewport/viewportExports";
import { TbBoxModel2, TbLink, TbLinkOff, TbPalette, TbPencil } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../../utils/atoms";
import { ViewModeAtom } from "@/utils/lib";
import { CanvasIsolateAtom } from "@/utils/componentIsolation";
import { ActionRow } from "./ActionRow";

export const ConvertToRegularComponent = ({ query, actions, id }) => (
  <ActionRow
    icon={<TbLinkOff className="size-5" />}
    title="Unlink Component"
    description="Make independent with all settings editable"
    variant="destructive"
    onClick={() => {
      const node = query.node(id).get();
      removeHasManyRelation(node, query, actions);
      actions.setProp(id, prop => clearRelation(prop));
    }}
  />
);

export const NoSettings = ({ actions, id, query }) => (
  <div className="flex flex-col gap-4 p-4">
    <p className="text-neutral-content text-sm">No settings available for this linked node.</p>
    <ConvertToRegularComponent query={query} actions={actions} id={id} />
  </div>
);

export const ConvertToStyledComponent = ({ actions, id }) => (
  <ActionRow
    icon={<TbPalette className="size-5" />}
    title="Style Only Mode"
    description="Edit styles while keeping other settings linked"
    onClick={() => actions.setProp(id, prop => setRelationField(prop, "relationType", "style"))}
  />
);

export const ConvertToContentComponent = ({ actions, id }) => (
  <ActionRow
    icon={<TbPencil className="size-5" />}
    title="Content Only Mode"
    description="Edit text and content while keeping styles linked"
    onClick={() => actions.setProp(id, prop => setRelationField(prop, "relationType", "content"))}
  />
);

export const RenderChildren = ({ props, children, query, actions, id }) => {
  const setViewMode = useSetAtomState(ViewModeAtom);
  const setCanvasIsolate = useSetAtomState(CanvasIsolateAtom);
  const canvasIsolate = useAtomValue(CanvasIsolateAtom) as unknown as string | null;
  const viewMode = useAtomValue(ViewModeAtom);

  // Skip the linked-ancestor lookup whenever we're in the component editor
  // (canvas view mode), isolated or not. The whole point of that editor is to
  // work directly on component internals — surfacing a "Linked instance of X"
  // panel from a parent clone is never what the user wants there.
  const inComponentEditor = viewMode === "canvas" || !!canvasIsolate;
  const linkedNode = inComponentEditor ? null : getLinkedAncestorNode(id, query);

  if (linkedNode) {
    const linkedNodeId = getBelongsTo(linkedNode.data.props);
    const parent = query.node(linkedNodeId).get();
    if (parent) {
      // Get the component container (parent's parent if it's inside a component)
      const componentContainer = parent.data.parent ? query.node(parent.data.parent).get() : null;
      const isInComponentContainer = componentContainer?.data?.props?.type === "component";

      // Get the first child of the component container (the actual content node)
      const contentNodeId = isInComponentContainer
        ? componentContainer.data.nodes?.[0]
        : getBelongsTo(props);
      const componentName =
        componentContainer?.data?.custom?.displayName ||
        parent.data.custom?.displayName ||
        parent.data.displayName ||
        "Master Component";

      const handleEditComponent = () => {
        // Walk up from the master node until we find the type="component" wrapper.
        // Older code assumed the master is a direct child of the wrapper, but
        // converted-from-section components nest the master inside a section
        // first, so the walk needs to keep going.
        let cursorId: string | undefined = contentNodeId;
        let foundContainerId: string | undefined;
        for (let depth = 0; depth < 6 && cursorId; depth++) {
          const node = query.node(cursorId).get();
          if (node?.data?.props?.type === "component") {
            foundContainerId = cursorId;
            break;
          }
          cursorId = node?.data?.parent;
        }
        if (!foundContainerId) {
          console.log("[editLinked] BAIL — no component ancestor found from", contentNodeId);
          return;
        }

        actions.selectNode(null);
        setViewMode("canvas");
        setCanvasIsolate(foundContainerId);
      };

      return (
        <div className="flex flex-col gap-2 p-3">
          {/* Component identity header */}
          <div className="flex items-center gap-3 px-3 py-1">
            <div className="text-primary flex size-8 shrink-0 items-center justify-center">
              <TbLink className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-content text-[11px]">Linked instance of</span>
              <span className="text-base-content text-sm font-medium">{componentName}</span>
            </div>
          </div>

          <div className="bg-base-300 h-px" />

          {/* Action cards */}
          <div className="flex flex-col gap-1">
            <ActionRow
              icon={<TbBoxModel2 className="size-5" />}
              title="Edit Linked Instance"
              description="Change the main component"
              variant="primary"
              onClick={handleEditComponent}
            />

            <ConvertToStyledComponent actions={actions} id={id} />

            <ConvertToContentComponent actions={actions} id={id} />

            <ConvertToRegularComponent query={query} actions={actions} id={id} />
          </div>
        </div>
      );
    }
  }

  return children;
};
