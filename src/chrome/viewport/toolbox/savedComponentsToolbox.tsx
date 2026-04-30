/**
 * Editor toolbox UI for saved components.
 *
 * The runtime renderer (`SavedComponentLoader`) lives in
 * `core/savedComponents.tsx` so the viewer / static-renderer can include
 * it via the resolver without dragging editor toolbox chrome into the
 * viewer bundle.
 */
import { ROOT_NODE } from "@craftjs/utils";
import { useEditor } from "@craftjs/core";
import { TbBoxModel2, TbTrash } from "react-icons/tb";
import { useSetAtomState } from "../../../utils/atoms";
import { ComponentsAtom } from "../../../utils/lib";
import { SavedComponentLoader } from "../../../core/savedComponents";
import { RenderToolComponent, ToolboxItemDisplay } from "./toolboxUtils";

const SavedComponentDisplay = ({ componentData }: any) => {
  const { actions, query } = useEditor();
  const setComponents = useSetAtomState(ComponentsAtom);
  const componentName = componentData.name || "Unnamed Component";

  const handleDelete = (e: any) => {
    e.stopPropagation();
    e.preventDefault();

    const rootNode = query.node(ROOT_NODE).get();
    const backgroundId = rootNode?.data?.nodes?.[0];

    if (backgroundId) {
      actions.setProp(backgroundId, (prop: any) => {
        prop.savedComponents = (prop.savedComponents || []).filter(
          (c: any) => c.rootNodeId !== componentData.rootNodeId
        );
      });

      setComponents((prev: any) =>
        prev.filter((c: any) => c.rootNodeId !== componentData.rootNodeId)
      );
    }
  };

  return (
    <div className="relative">
      <ToolboxItemDisplay icon={TbBoxModel2} label={componentName} />
      <button
        onClick={handleDelete}
        onMouseDown={e => e.stopPropagation()}
        className="text-error hover:text-error pointer-events-auto absolute top-1 right-1 z-10 cursor-pointer p-1"
        aria-label="Delete component"
      >
        <TbTrash className="text-sm" />
      </button>
    </div>
  );
};

export const RenderSavedComponent = ({ componentData }: any) => {
  const componentName = componentData.name || "Unnamed Component";

  return (
    <RenderToolComponent
      element={SavedComponentLoader}
      componentData={componentData}
      custom={{ displayName: componentName }}
      display={<SavedComponentDisplay componentData={componentData} />}
    />
  );
};

export const SavedComponentsToolbox = (components: any[]) => ({
  title: "My Components",
  content: components
    .filter(component => !component.isSection)
    .map((component, index) => <RenderSavedComponent key={index} componentData={component} />),
});
