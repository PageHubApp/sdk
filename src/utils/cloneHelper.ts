// @ts-nocheck
/**
 * @pagehub/sdk — Clone helpers extracted from main app
 *
 * These handle linked/cloned component prop syncing.
 * Stripped of Recoil dependencies and editor-only UI components.
 */

export const setClonedProps = (props: any, query: any, exclude: string[] = []) => {
  if (!props.belongsTo) {
    return props;
  }

  try {
    const masterNode = query.node(props.belongsTo).get();
    if (!masterNode) {
      return props;
    }

    const masterProps = { ...masterNode.data.props };

    const propsToExclude = ["belongsTo", "relationType", "hasMany", "savedComponentName", "type"];
    propsToExclude.forEach((key) => {
      delete masterProps[key];
    });

    if (props.relationType === "style") {
      return {
        ...props,
        ...masterProps,
        root: props.root,
        className: props.className,
        belongsTo: props.belongsTo,
        relationType: props.relationType,
      };
    }

    if (props.relationType === "content") {
      const contentProps = [
        "text", "url", "urlTarget", "image", "videoId",
        "content", "buttonText", "placeholder", "value",
      ];
      const localContent: Record<string, any> = {};
      contentProps.forEach((key) => {
        if (key in props) {
          localContent[key] = props[key];
        }
      });

      return {
        ...props,
        ...masterProps,
        ...localContent,
        belongsTo: props.belongsTo,
        relationType: props.relationType,
      };
    }

    // Full sync
    return {
      ...props,
      ...masterProps,
      belongsTo: props.belongsTo,
      relationType: props.relationType,
    };
  } catch (error) {
    console.error("[PageHub SDK] Error syncing cloned props:", error);
    return props;
  }
};

export const getClonedState = (props: any, state: any) => {
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
