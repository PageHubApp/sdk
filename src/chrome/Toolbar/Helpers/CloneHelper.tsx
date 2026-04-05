// @ts-nocheck
import { getLinkedAncestorNode } from "../../componentUtils";
import { removeHasManyRelation } from "../../Viewport/lib";
import { TbBoxModel2, TbLinkOff, TbPalette, TbPencil } from "react-icons/tb";
import { useSetAtomState } from "../../../utils/atoms";
import { OpenComponentEditorAtom, ViewModeAtom } from "utils/lib";

export const setClonedProps = (props, query, exclude = []) => {
  // If this node doesn't belong to a master component, just return props as-is
  if (!props.belongsTo) {
    return props;
  }

  try {
    // Get the master node
    const masterNode = query.node(props.belongsTo).get();
    if (!masterNode) {
      return props;
    }

    const masterProps = { ...masterNode.data.props };

    // Always exclude these props from syncing
    const propsToExclude = ["belongsTo", "relationType", "hasMany", "savedComponentName", "type"];
    propsToExclude.forEach(key => {
      delete masterProps[key];
    });

    // If it's a "style" relation type, sync everything EXCEPT styles
    if (props.relationType === "style") {
      // Clone keeps its own styles (root, className)
      // but gets everything else from master
      return {
        ...props,
        ...masterProps,
        root: props.root,
        className: props.className,
        belongsTo: props.belongsTo,
        relationType: props.relationType,
      };
    }

    // If it's a "content" relation type, sync styles but keep content local
    if (props.relationType === "content") {
      // Clone keeps its own content props (text, url, image, etc.)
      // but gets styles and layout from master
      const contentProps = [
        "text",
        "url",
        "urlTarget",
        "image",
        "videoId",
        "content",
        "buttonText",
        "placeholder",
        "value",
      ];
      const localContent = {};
      contentProps.forEach(key => {
        if (key in props) {
          localContent[key] = props[key];
        }
      });

      return {
        ...props,
        ...masterProps,
        ...localContent, // Override with local content
        belongsTo: props.belongsTo,
        relationType: props.relationType,
      };
    }

    // For "full" relation type, sync everything from master
    return {
      ...props,
      ...masterProps,
      belongsTo: props.belongsTo,
      relationType: props.relationType,
    };
  } catch (error) {
    console.error("Error syncing cloned props:", error);
    return props;
  }
};

export const ConvertToRegularComponent = ({ query, actions, id }) => (
  <button
    className="flex w-full items-center gap-3 rounded-lg bg-destructive px-4 py-3 text-left text-destructive-foreground transition-colors hover:bg-destructive/90"
    onClick={() => {
      const node = query.node(id).get();
      removeHasManyRelation(node, query, actions);

      actions.setProp(id, prop => {
        prop.belongsTo = "";
        prop.relationType = "";
      });
    }}
  >
    <TbLinkOff className="shrink-0 text-xl" />
    <div className="flex-1">
      <div className="font-semibold">Unlink Component</div>
      <div className="text-xs">Make independent with all settings editable</div>
    </div>
  </button>
);

export const getClonedState = (props, state) => {
  if (!props.belongsTo) {
    return {
      enabled: state.options.enabled,
    };
  }
  return {
    enabled: state.options.enabled,
    state,
  };
};

export const NoSettings = ({ actions, id, query }) => (
  <>
    <p className="text-xl">No settings available.</p>

    <ConvertToRegularComponent query={query} actions={actions} id={id} />
  </>
);

export const ConvertToStyledComponent = ({ actions, id }) => (
  <button
    className="flex w-full items-center gap-3 rounded-lg bg-secondary px-4 py-3 text-left text-secondary-foreground transition-colors hover:bg-secondary/90"
    onClick={() => actions.setProp(id, prop => (prop.relationType = "style"))}
  >
    <TbPalette className="shrink-0 text-xl" />
    <div className="flex-1">
      <div className="font-semibold text-foreground">Style Only Mode</div>
      <div className="text-xs text-muted-foreground">
        Edit styles while keeping other settings linked
      </div>
    </div>
  </button>
);

export const ConvertToContentComponent = ({ actions, id }) => (
  <button
    className="flex w-full items-center gap-3 rounded-lg bg-accent px-4 py-3 text-left text-accent-foreground transition-colors hover:bg-accent/90"
    onClick={() => actions.setProp(id, prop => (prop.relationType = "content"))}
  >
    <TbPencil className="shrink-0 text-xl text-purple-400" />
    <div className="flex-1">
      <div className="font-semibold text-foreground">Content Only Mode</div>
      <div className="text-xs text-muted-foreground">
        Edit text and content while keeping styles linked
      </div>
    </div>
  </button>
);

export const RenderChildren = ({ props, children, query, actions, id }) => {
  const setViewMode = useSetAtomState(ViewModeAtom);
  const setOpenComponentEditor = useSetAtomState(OpenComponentEditorAtom);

  // Check if this node or ANY ancestor is a linked component
  const linkedNode = getLinkedAncestorNode(id, query);

  if (linkedNode) {
    const linkedNodeId = linkedNode.data.props.belongsTo;
    const parent = query.node(linkedNodeId).get();
    if (parent) {
      // Get the component container (parent's parent if it's inside a component)
      const componentContainer = parent.data.parent ? query.node(parent.data.parent).get() : null;
      const isInComponentContainer = componentContainer?.data?.props?.type === "component";

      // Get the first child of the component container (the actual content node)
      const contentNodeId = isInComponentContainer
        ? componentContainer.data.nodes?.[0]
        : props.belongsTo;
      const componentName =
        componentContainer?.data?.custom?.displayName ||
        parent.data.custom?.displayName ||
        parent.data.displayName ||
        "Master Component";

      const handleEditComponent = () => {
        // Switch to component mode
        setViewMode("component");

        // Open the component for editing
        setTimeout(() => {
          setOpenComponentEditor({
            componentId: contentNodeId,
            componentName: componentName,
          });
        }, 100);
      };

      return (
        <div className="flex flex-col gap-3 p-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-2 text-sm text-muted-foreground">This is a linked instance of:</div>
            <div className="text-lg font-semibold text-foreground">{componentName}</div>
          </div>

          <button
            className="flex w-full items-center gap-3 rounded-lg bg-primary px-4 py-3 text-left text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={handleEditComponent}
          >
            <TbBoxModel2 className="shrink-0 text-xl" />
            <div className="flex-1">
              <div className="font-semibold">Edit Linked Instance</div>
              <div className="text-xs">Change the main component</div>
            </div>
          </button>

          <ConvertToStyledComponent actions={actions} id={id} />

          <ConvertToContentComponent actions={actions} id={id} />

          <ConvertToRegularComponent query={query} actions={actions} id={id} />
        </div>
      );
    }
  }

  return children;
};
