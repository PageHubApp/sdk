import React, { useState, useCallback, useRef, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/core";
import { useEditor as useCraftEditor, ROOT_NODE } from "@craftjs/core";
import { createPortal } from "react-dom";
import { resolveVariable } from "../utils/design/variables";
import { VariablePopover } from "../chrome/Tools/VariablePopover";
import type { VariableNodeOptions } from "./VariableNode";

export function VariableNodeView({ node, editor, getPos, extension, updateAttributes, deleteNode }: NodeViewProps) {
  const varId = node.attrs.id as string;
  const options = extension.options as VariableNodeOptions;

  const { query, actions } = useCraftEditor();

  const resolved = resolveVariable(varId, query);
  const initialDisplay = (resolved && resolved !== varId) ? resolved : varId;
  const [displayOverride, setDisplayOverride] = useState<string | null>(null);
  const displayText = displayOverride ?? initialDisplay;

  // Clear override when the variable id changes (e.g. switched via dropdown)
  const prevVarId = useRef(varId);
  useEffect(() => {
    if (prevVarId.current !== varId) {
      prevVarId.current = varId;
      setDisplayOverride(null);
    }
  }, [varId]);

  // Listen for edits from other variable node popovers
  useEffect(() => {
    const handler = () => {
      const fresh = resolveVariable(varId, query);
      const freshDisplay = (fresh && fresh !== varId) ? fresh : varId;
      setDisplayOverride(prev => prev !== freshDisplay ? freshDisplay : prev);
    };
    document.addEventListener("pagehub:variable-changed", handler);
    return () => document.removeEventListener("pagehub:variable-changed", handler);
  }, [varId, query]);

  const [showPopover, setShowPopover] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (spanRef.current) {
      setAnchorRect(spanRef.current.getBoundingClientRect());
      setShowPopover(true);
    }
  }, []);

  const handleClose = useCallback(() => {
    setShowPopover(false);
  }, []);

  const handleChangeVariable = useCallback((newId: string) => {
    const pos = getPos();
    if (typeof pos === "number") {
      const newNode = editor.state.schema.nodes.variable.create({ id: newId });
      const tr = editor.state.tr.replaceWith(pos, pos + 1, newNode);
      editor.view.dispatch(tr);
    }
    setShowPopover(false);
  }, [editor, getPos]);

  const handleEditValue = useCallback((newValue: string) => {
    const parts = varId.split(".");
    if (parts[0] !== "company" || parts.length !== 2) return;
    const key = parts[1];
    actions.setProp(ROOT_NODE, (rootProps: any) => {
      if (!rootProps.company) rootProps.company = {};
      rootProps.company[key] = newValue;
    });
    setDisplayOverride(newValue);
    // Notify non-TipTap Text/Button components to re-render with new variable value
    document.dispatchEvent(new CustomEvent("pagehub:variable-changed"));
  }, [varId, actions]);

  const handleRemove = useCallback(() => {
    const pos = getPos();
    if (typeof pos === "number") {
      editor.chain().focus().deleteRange({ from: pos, to: pos + 1 }).run();
    }
    setShowPopover(false);
  }, [editor, getPos]);

  return (
    <NodeViewWrapper
      as="span"
      className="variable-node"
      data-variable={varId}
      data-tooltip-id="variable-tip"
      data-tooltip-content="Double-click to edit"
    >
      <span
        ref={spanRef}
        onDoubleClick={handleDoubleClick}
      >
        {displayText}
      </span>
      {showPopover && anchorRect && createPortal(
        <VariablePopover
          variables={options.getVariables()}
          currentId={varId}
          displayValue={displayText}
          anchorRect={anchorRect}
          onChangeVariable={handleChangeVariable}
          onEditValue={varId !== "year" ? handleEditValue : undefined}
          onRemove={handleRemove}
          onClose={handleClose}
        />,
        document.body,
      )}
    </NodeViewWrapper>
  );
}
