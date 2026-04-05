// @ts-nocheck
import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { GapDragControl } from "./NodeControllers/GapDragControl";
import { ProximityHover } from "./NodeControllers/ProximityHover";
import { RenderNodeDataStates } from "./RenderNodeDataStates";
import { InlineToolsRenderer } from "./InlineToolsRenderer";

class NodeErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.warn("[PageHub] Corrupt node skipped:", error.message);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export const RenderNodeNewer = ({ render }) => {
  const [show, setShow] = useState(false);

  const { enabled } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const { type, nodeProps } = useNode(node => ({
    type: node.data?.type,
    nodeProps: node.data?.props,
  }));

  useEffect(() => {
    const checkContainer = () => {
      const container = document.querySelector('[data-container="true"]');
      if (container) {
        setShow(true);
        return true;
      }
      return false;
    };

    // Try immediately
    if (checkContainer()) return;

    // If not found, use MutationObserver to wait for it
    const observer = new MutationObserver(() => {
      if (checkContainer()) {
        observer.disconnect();
      }
    });

    observer.observe(document.querySelector(".pagehub-sdk-root") || document.body, {
      childList: true,
      subtree: true,
    });

    // Cleanup
    return () => observer.disconnect();
  }, []);

  if (!enabled) return render;

  const isClient = typeof window !== "undefined";

  return (
    <NodeErrorBoundary>
      {render}
      {isClient && (
        <>
          <InlineToolsRenderer craftComponent={type} props={nodeProps} />
          <RenderNodeDataStates />
          <ProximityHover />
          <GapDragControl />
        </>
      )}
    </NodeErrorBoundary>
  );
};
