import { NodeTree, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { useCallback } from "react";
import { useAtomState, useAtomValue } from "@zedux/react";
import { useSetAtomState } from "../../../utils/atoms";
import { LastctiveAtom } from "utils/lib";
import { useUnifiedDelete } from "../../hooks/useUnifiedDelete";
import { Background } from "../../../components/Background";
import { Button } from "../../../components/Button";
import { Container } from "../../../components/Container";
import { Divider } from "../../../components/Divider";
import { Embed } from "../../../components/Embed";
import { Form } from "../../../components/Form";
import { FormElement, OnlyFormElement } from "../../../components/FormElement";
import { Image } from "../../../components/Image";
import { Text } from "../../../components/Text";
import { Video } from "../../../components/Video";
import { GetHtmlToComponent, buildClonedTree } from "../lib";
import { PreviewAtom, EnabledAtom, UnsavedChangesAtom, TabAtom } from "../atoms";
import { phStorage } from "../../../utils/phStorage";
import {
  finalizeToolboxHistorySelectionSync,
  markToolboxHistorySelectionSync,
} from "../../../utils/usePanelUrl";

export function useViewportKeyboard() {
  const {
    enabled,
    canUndo,
    canRedo,
    actions,
    query,
  } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
  }));

  const { deleteSelectedNode } = useUnifiedDelete();
  const [preview, setPreview] = useAtomState(PreviewAtom);
  const setEnabled = useSetAtomState(EnabledAtom);
  const lastActive = useAtomValue(LastctiveAtom);
  const setActiveTab = useSetAtomState(TabAtom);
  const [unsavedChanges, setUnsavedChanged] = useAtomState(UnsavedChangesAtom);

  const {
    actions: { setProp },
  } = useEditor(() => ({}));

  const fromEntries = (pairs: [string, unknown][]) => {
    if (Object.fromEntries) return Object.fromEntries(pairs);
    return pairs.reduce((acc, [id, value]) => ({ ...acc, [id]: value }), {} as Record<string, unknown>);
  };

  const getCloneTree = useCallback(
    (tree: NodeTree) => buildClonedTree({ tree, query, setProp }),
    [query, setProp]
  );

  const handleSaveTemplate = useCallback(() => {
    const active = query.getEvent("selected").first();
    const node = query.node(active).get();

    if (["page", "background"].includes(node.data.props.type))
      return phStorage.set("clipboard", {});

    const tree = query.node(active).toNodeTree();
    const nodePairs = Object.keys(tree.nodes).map(id => [id, query.node(id).toSerializedNode()]);
    const serializedNodesJSON = JSON.stringify(fromEntries(nodePairs as [string, unknown][]));
    phStorage.set("clipboard", { rootNodeId: tree.rootNodeId, nodes: serializedNodesJSON });
  }, [query]);

  async function checkIfHtmlInClipboard() {
    let text = await navigator.clipboard.readText();
    text = text.replace(/\s+/g, " ").trim().replace(/\s{2,}/g, " ");
    return text.startsWith("<") ? text : null;
  }

  const handleAdd = useCallback(async () => {
    let active = query.getEvent("selected").first();
    if (!active) active = ROOT_NODE;

    const pasties = await checkIfHtmlInClipboard();
    if (pasties) {
      const editorComponents: Record<string, unknown> = {
        Background, Container, Text, OnlyFormElement, Form, FormElement, Button, Video, Image, Embed, Divider,
      };

      const toNode = (data: any, parent = ROOT_NODE) => {
        if (!data.type) return;
        const result = { data: { type: editorComponents[data.type], props: data.props } };
        let freshNode = null;
        try {
          freshNode = query.parseFreshNode(result).toNode();
          actions.add(freshNode, parent);
        } catch (e) { console.error(e); }
        if (!freshNode) return null;
        if (data.children) data.children.forEach((child: any) => toNode(child, freshNode.id));
        return freshNode;
      };

      await GetHtmlToComponent(pasties);
    }
  }, [actions, getCloneTree, query]);

  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      const nodeId = target.closest("[node-id]")?.getAttribute("node-id");
      if (nodeId) setTimeout(() => setActiveTab(""), 600);
    },
    [setActiveTab]
  );

  const handleBodyKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && preview) {
      event.preventDefault();
      const viewport = document.getElementById("viewport");
      const scrollTop = viewport?.scrollTop ?? 0;
      const scrollLeft = viewport?.scrollLeft ?? 0;

      actions.setOptions(options => {
        options.enabled = !enabled;
        setPreview(false);
        setEnabled(true);
        setTimeout(() => {
          if (!lastActive) return;
          const node = query.node(lastActive).get();
          if (node) actions.selectNode(lastActive);
        }, 100);
      });

      requestAnimationFrame(() => {
        if (viewport) {
          viewport.scrollTop = scrollTop;
          viewport.scrollLeft = scrollLeft;
        }
      });
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true") return;

    const charCode = String.fromCharCode(event.which).toLowerCase();

    handleBodyKeyDown(event.nativeEvent);

    // Copy
    if ((event.ctrlKey || event.metaKey) && charCode === "c") {
      if (window.getSelection()?.toString()) return;
      event.preventDefault();
      try { handleSaveTemplate(); } catch (e) { console.error(e); }
      return;
    }

    // Paste
    if ((event.ctrlKey || event.metaKey) && charCode === "v") {
      event.preventDefault();
      handleAdd();
      return;
    }

    // Escape
    if (event.key === "Escape") {
      event.preventDefault();
      try {
        const active = query.getEvent("selected").first();
        if (active) {
          const rootNode = query.node(ROOT_NODE).get();
          const backgroundNodeId = rootNode?.data?.nodes?.[0];
          if (backgroundNodeId) actions.selectNode(backgroundNodeId);
        }
      } catch (e) { console.error(e); }
      return;
    }

    // Tab (cycle siblings)
    if (event.key === "Tab") {
      event.preventDefault();
      try {
        const active = query.getEvent("selected").first();
        const theNode = query.node(active).get();
        const parentNode = query.node(theNode.data.parent).get();
        const indexToAdd = parentNode.data.nodes.indexOf(active);
        let index = indexToAdd + 1;
        if (index + 1 > parentNode.data.nodes.length) index = 0;
        const ee = query.node(parentNode.data.nodes[index]).get();
        actions.selectNode(ee.id);
      } catch (e) { console.error(e); }
      return;
    }

    // Backspace (delete)
    if (event.which === 8) {
      try { event.preventDefault(); deleteSelectedNode(); } catch (e) { console.error(e); }
      return;
    }

    // Ctrl+S — just suppress browser save dialog; document-level useHeaderShortcuts handles Cmd+S
    if ((event.ctrlKey || event.metaKey) && charCode === "s") {
      event.preventDefault();
      return;
    }

    // Ctrl+Z (undo)
    if ((event.ctrlKey || event.metaKey) && charCode === "z") {
      try {
        event.preventDefault();
        if (canUndo) {
          markToolboxHistorySelectionSync();
          actions?.history?.undo();
          finalizeToolboxHistorySelectionSync();
        }
      } catch (e) { console.error(e); }
      return;
    }

    // Ctrl+Y (redo)
    if ((event.ctrlKey || event.metaKey) && charCode === "y") {
      try {
        event.preventDefault();
        if (canRedo) {
          markToolboxHistorySelectionSync();
          actions?.history?.redo();
          finalizeToolboxHistorySelectionSync();
        }
      } catch (e) { console.error(e); }
    }
  };

  return { handleKeyDown, handleDoubleClick, handleBodyKeyDown };
}
