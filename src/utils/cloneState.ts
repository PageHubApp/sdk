import { sdkLog } from "./logger";
/**
 * @pagehub/sdk — Clone helpers extracted from main app
 *
 * These handle linked/cloned component prop syncing.
 * Stripped of Recoil dependencies and editor-only UI components.
 */

export const setClonedProps = (props: any, query: any, exclude: string[] = []) => {
  const relation = props.relation;
  if (!relation?.belongsTo) {
    return props;
  }

  try {
    const masterNode = query.node(relation.belongsTo).get();
    if (!masterNode) {
      return props;
    }

    const masterProps = { ...masterNode.data.props };

    // The master's relation namespace is stripped; clone keeps its own.
    const propsToExclude = ["relation", "savedComponentName", "type"];
    propsToExclude.forEach(key => {
      delete masterProps[key];
    });

    if (relation.relationType === "style") {
      return {
        ...props,
        ...masterProps,
        root: props.root,
        className: props.className,
        relation: props.relation,
      };
    }

    if (relation.relationType === "content") {
      const contentProps = [
        "text",
        "url",
        "urlTarget",
        "action",
        "image",
        "videoId",
        "content",
        "buttonText",
        "placeholder",
        "value",
      ];
      const localContent: Record<string, any> = {};
      contentProps.forEach(key => {
        if (key in props) {
          localContent[key] = props[key];
        }
      });

      return {
        ...props,
        ...masterProps,
        ...localContent,
        relation: props.relation,
      };
    }

    // Full sync
    return {
      ...props,
      ...masterProps,
      relation: props.relation,
    };
  } catch (error) {
    sdkLog.error("[PageHub SDK] Error syncing cloned props:", error);
    return props;
  }
};

export const getClonedState = (props: any, state: any) => {
  const belongsTo = props.relation?.belongsTo;
  if (!belongsTo) {
    return { enabled: state.options.enabled };
  }
  // Return master's props/children references — CraftJS re-renders the clone
  // when these references change (Immer creates new objects on mutation).
  const masterNode = state.nodes[belongsTo];
  return {
    enabled: state.options.enabled,
    masterProps: masterNode?.data?.props,
    masterChildren: masterNode?.data?.nodes,
  };
};
