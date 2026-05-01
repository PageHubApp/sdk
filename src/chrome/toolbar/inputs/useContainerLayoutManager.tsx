import { Element, useEditor, useNode } from "@craftjs/core";
import { createMergedActions } from "../../shell/spatial/mergedActions";
import { AddElement } from "../../viewport/toolbox/toolboxUtils";

const WIDTH_CLASS_PATTERN =
  /^(?:w-full|w-screen|w-auto|w-\d+(?:\.\d+)?(?:\/\d+)?|w-px|w-\[[^\]]+\]|flex-1|flex-auto|flex-none|flex-initial|flex-\[[^\]]+\]|min-w-0|min-w-full|basis-\d+(?:\/\d+)?|basis-\[[^\]]+\])$/;

const stripWidthClasses = (cn: string): string =>
  cn
    .split(/\s+/)
    .filter(c => c && !WIDTH_CLASS_PATTERN.test(c))
    .join(" ");

const widthClassFor = (
  layoutMode: "flex-row" | "flex-col" | "grid",
  asymmetric: boolean
): string => {
  if (asymmetric) return "";
  if (layoutMode === "flex-row") return "flex-1 min-w-0";
  if (layoutMode === "flex-col") return "w-full";
  return "";
};

export const useContainerLayoutManager = () => {
  const { actions, query } = useEditor();
  const { id } = useNode();

  const adjustContainerCount = async (
    targetColumns: number,
    layoutMode: "flex-row" | "flex-col" | "grid",
    options: { asymmetric?: boolean } = {}
  ) => {
    const { Container } = await import("../../../components/Container/Container");

    const currentNode = query.node(id).get();
    const currentChildren: string[] = currentNode?.data?.nodes || [];
    const totalCount = currentChildren.length;

    const widthCn = widthClassFor(layoutMode, !!options.asymmetric);

    // Single merged history entry for normalize + delete. AddElement creates its
    // own entry per add (via its internal createMergedActions) — that's fine.
    const batch = createMergedActions(actions);

    // Normalize existing children's width classes so a freshly-picked layout
    // actually takes effect (e.g. switching to flex-row with `w-full` children
    // would otherwise keep stacking on `flex-wrap` parents).
    currentChildren.forEach(childId => {
      const child = query.node(childId).get();
      if (!child) return;
      const cn = String(child.data?.props?.className || "");
      const stripped = stripWidthClasses(cn);
      const next = (widthCn ? `${stripped} ${widthCn}` : stripped).trim().replace(/\s+/g, " ");
      if (next !== cn) {
        batch.setProp(childId, (props: any) => {
          props.className = next;
        });
      }
    });

    if (totalCount < targetColumns) {
      // Sample the last sibling's visual treatment (bg, padding, radius,
      // border, etc.) so new containers blend in instead of looking blank.
      const lastChildId = currentChildren[currentChildren.length - 1];
      const lastChild = lastChildId ? query.node(lastChildId).get() : null;
      const sampledCn = lastChild?.data?.props?.className
        ? stripWidthClasses(String(lastChild.data.props.className))
        : "flex flex-col gap-4";
      const templateCn = sampledCn || "flex flex-col gap-4";
      const templateDisplayName = (lastChild?.data?.custom?.displayName as string) || "Container";

      const baseCn = (widthCn ? `${templateCn} ${widthCn}` : templateCn)
        .trim()
        .replace(/\s+/g, " ");
      const containersToAdd = targetColumns - totalCount;

      for (let i = 0; i < containersToAdd; i++) {
        AddElement({
          element: (
            <Element
              canvas
              is={Container}
              canDelete={true}
              className={baseCn}
              custom={{ displayName: templateDisplayName, layoutChild: true }}
            />
          ),
          actions,
          query,
          addTo: id,
        });
      }
    } else if (totalCount > targetColumns) {
      // Remove only stamped layoutChild containers, from the end. User-built
      // siblings (cards, sections) stay intact — let the user delete them.
      const layoutChildIds = currentChildren.filter(nodeId => {
        const node = query.node(nodeId).get();
        return node?.data?.custom?.layoutChild === true;
      });
      const removeBudget = totalCount - targetColumns;
      const containersToRemove = layoutChildIds.slice(-removeBudget);
      containersToRemove.forEach(containerId => {
        batch.delete(containerId);
      });
    }
  };

  return { adjustContainerCount };
};
