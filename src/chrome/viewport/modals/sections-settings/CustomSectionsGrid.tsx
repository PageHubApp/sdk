import { useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import React, { useCallback, useMemo } from "react";
import { SectionPickerDialogAtom } from "../../../../utils/atoms";
import { useSetAtomState } from "../../../../utils/atoms";
import { useInsertTarget } from "../../../hooks/useInsertTarget";
import { AddElement } from "../../toolbox/toolboxUtils";
import { CustomSectionCard } from "./components";

export function CustomSectionsGrid({ sections }: { sections: any[] }) {
  const { actions, query } = useEditor();
  const {
    connectors: { create },
  } = useEditor(state => ({ enabled: state.options.enabled }));
  const resolver = useMemo(() => {
    try {
      return (query as any).getOptions?.()?.resolver ?? {};
    } catch {
      return {};
    }
  }, [query]);

  const positionInfo = useAtomValue(SectionPickerDialogAtom);
  const setPositionInfo = useSetAtomState(SectionPickerDialogAtom);
  const { getTargetPageId } = useInsertTarget();

  const insertElement = useCallback(
    (element: any) => {
      if (!element) return;
      if (positionInfo.nodeId && positionInfo.parent) {
        const parentNodeData = query.node(positionInfo.parent).get();
        const currentIndex = parentNodeData.data.nodes.indexOf(positionInfo.nodeId);
        const newIndex = positionInfo.position === "bottom" ? currentIndex + 1 : currentIndex;
        AddElement({ element, actions, query, addTo: positionInfo.parent, index: newIndex });
        setPositionInfo({ isOpen: false, nodeId: null, position: null, parent: null });
      } else {
        const targetPageId = getTargetPageId();
        AddElement({ element, actions, query, addTo: targetPageId });
      }
    },
    [actions, query, positionInfo, setPositionInfo, getTargetPageId]
  );

  return (
    <div className="grid w-full grid-cols-1 gap-3">
      {sections.map(template => (
        <CustomSectionCard
          key={template.id}
          template={template}
          resolver={resolver}
          query={query}
          onInsert={insertElement}
          createRef={create}
        />
      ))}
    </div>
  );
}
