import { getLinkedAncestorNode } from "../../componentUtils";
import { removeHasManyRelation } from "../../Viewport/lib";
import { TbBoxModel2, TbLink, TbLinkOff, TbPalette, TbPencil } from "react-icons/tb";
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

const LinkedActionCard = ({ icon, title, description, onClick, delay = 0, variant = "default" }) => {
  const variantStyles = {
    default: "border-border bg-card hover:bg-muted/50",
    primary: "border-primary/20 bg-primary/5 hover:bg-primary/10",
    destructive: "border-destructive/20 bg-destructive/5 hover:bg-destructive/10",
  };
  const iconStyles = {
    default: "bg-secondary text-secondary-foreground group-hover:bg-foreground group-hover:text-background",
    primary: "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
    destructive: "bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-destructive-foreground",
  };

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border ${variantStyles[variant]} p-4 text-left transition-all`}
    >
      <div className="relative flex flex-row items-center gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors ${iconStyles[variant]}`}>
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="toolbar-label font-semibold">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
      </div>
    </button>
  );
};

export const ConvertToRegularComponent = ({ query, actions, id }) => (
  <LinkedActionCard
    icon={<TbLinkOff className="size-5" />}
    title="Unlink Component"
    description="Make independent with all settings editable"
    variant="destructive"
    delay={0.25}
    onClick={() => {
      const node = query.node(id).get();
      removeHasManyRelation(node, query, actions);
      actions.setProp(id, prop => {
        prop.belongsTo = "";
        prop.relationType = "";
      });
    }}
  />
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
  <div className="flex flex-col gap-4 p-4">
    <p className="text-sm text-muted-foreground">No settings available for this linked node.</p>
    <ConvertToRegularComponent query={query} actions={actions} id={id} />
  </div>
);

export const ConvertToStyledComponent = ({ actions, id }) => (
  <LinkedActionCard
    icon={<TbPalette className="size-5" />}
    title="Style Only Mode"
    description="Edit styles while keeping other settings linked"
    delay={0.15}
    onClick={() => actions.setProp(id, prop => (prop.relationType = "style"))}
  />
);

export const ConvertToContentComponent = ({ actions, id }) => (
  <LinkedActionCard
    icon={<TbPencil className="size-5" />}
    title="Content Only Mode"
    description="Edit text and content while keeping styles linked"
    delay={0.2}
    onClick={() => actions.setProp(id, prop => (prop.relationType = "content"))}
  />
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
        <div className="flex flex-col gap-4 p-4">
          {/* Component identity header */}
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TbLink className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground">Linked instance of</span>
              <span className="toolbar-label font-semibold">{componentName}</span>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Action cards */}
          <div className="flex flex-col gap-3">
            <LinkedActionCard
              icon={<TbBoxModel2 className="size-5" />}
              title="Edit Linked Instance"
              description="Change the main component"
              variant="primary"
              delay={0.1}
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
