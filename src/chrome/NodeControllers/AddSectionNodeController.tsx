import { Element, ROOT_NODE, useEditor, useNode } from "@craftjs/core";
import { useRef, useState } from "react";
import { TbLayoutGridAdd } from "react-icons/tb";
import { useSetAtomState } from "../../utils/atoms";
import { ClippyOpenAtom, SectionPickerDialogAtom } from "utils/atoms";
import { HeaderMenuAtom } from "utils/lib";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../context";
import { usePanelUrl } from "../../utils/usePanelUrl";
import { AddElement } from "../Viewport/Toolbox/lib";
import { NodeType, useNodeType } from "./hooks/useNodeType";

import generate from "../../utils/data/nameGenerator";

export const AddSectionNodeController = (props: { position; align }) => {
  const { position } = props as any;
  const ref = useRef(null);
  const { id } = useNode();
  const [isControllerHovered, setIsControllerHovered] = useState(false);
  const { config } = useSDK();
  const aiEnabled = useAiEnabled();
  const renderNodeAi = config.editorChromeSlots?.renderNodeAiGenerateButton;
  const setClippyOpen = useSetAtomState(ClippyOpenAtom);

  const { isHover } = useNode(node => ({
    isHover: node.events.hovered,
  }));

  const setSectionPickerDialog = useSetAtomState(SectionPickerDialogAtom);
  const setHeaderMenu = useSetAtomState(HeaderMenuAtom);
  const { open: openPanel } = usePanelUrl();

  const { parent } = useNode(node => ({
    parent: node.data.parent,
  }));

  const { query, actions } = useEditor();
  const type = useNodeType();

  const isPage = (t: typeof type): t is NodeType.Page => t === NodeType.Page;
  const isSection = (t: typeof type): t is NodeType.Section => t === NodeType.Section;

  if (type !== NodeType.Section) return null;

  const handleAddPage = async () => {
    // Resolve Container from the globalThis-locked resolver to avoid HMR proxy issues
    const liveResolver = query.getOptions().resolver;
    const ContainerComp = liveResolver?.["Container"];
    const newPage = (
      <Element
        canvas
        is={ContainerComp}
        type="page"
        canDelete={true}
        canEditName={true}
        className="mx-auto flex flex-col items-center w-full h-full gap-8 py-6 px-3"
        custom={{ displayName: generate().spaced }}
      />
    );

    const rootNode = query.node(ROOT_NODE).get();
    const currentPageIndex = rootNode.data.nodes.indexOf(id);
    const newIndex = position === "bottom" ? currentPageIndex + 1 : currentPageIndex;

    const newElement = AddElement({
      element: newPage,
      actions,
      query,
      addTo: ROOT_NODE,
      index: newIndex,
    });

    if (newElement?.rootNodeId) {
      setTimeout(() => {
        const node = query.node(newElement.rootNodeId).get();
        if (node?.dom) {
          node.dom.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => actions.selectNode(newElement.rootNodeId), 500);
        }
      }, 100);
    }
  };

  const handleAddSection = () => {
    setSectionPickerDialog({
      isOpen: false,
      nodeId: id,
      position: position,
      parent: parent,
    });
    openPanel("blocks");
    setHeaderMenu(prev => ({ ...prev, isOpen: true, menuType: "sections", activeTab: "sections" }));
  };

  const handleAddComponent = () => {
    openPanel("components");
    setHeaderMenu(prev => ({ ...prev, isOpen: true, menuType: "components", activeTab: "components" }));
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isPage(type)) {
      handleAddPage();
    } else if (isSection(type)) {
      handleAddSection();
    } else {
      handleAddComponent();
    }
  };

  return (
    <div
      role="presentation"
      aria-hidden="true"
      className={`absolute -bottom-4 left-1/2 flex h-0 w-fit -translate-x-1/2 items-center justify-center gap-2 ${isControllerHovered ? "opacity-100" : "opacity-0"} transition-opacity duration-300 z-9999`}
      onMouseEnter={() => setIsControllerHovered(true)}
      onMouseLeave={() => setIsControllerHovered(false)}
    >
      <button
        ref={ref}
        className="btn-primary btn-sm z-99999 font-bold capitalize active:scale-95 transition-transform"
        onClick={handleClick}
      >
        <TbLayoutGridAdd />
        {type && <> Add {type}</>}
      </button>

      {aiEnabled &&
        renderNodeAi &&
        renderNodeAi({
          onClick: () =>
            setClippyOpen({
              nodeId: id,
              mode: "create",
              addAfter: true,
              parentNodeId: parent,
              position,
            }),
          className: "btn-primary btn-sm z-99999",
        })}
    </div>
  );
};
