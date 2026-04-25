import { useEditor, useNode } from "@craftjs/core";
import React, { useEffect, useMemo, useState } from "react";

function resolveCraftComponent(
  type: unknown,
  resolver: Record<string, React.ComponentType<any>> | undefined
): React.ComponentType<any> | null {
  if (type == null || !resolver) return null;
  if (typeof type === "function") return type as React.ComponentType<any>;
  if (typeof type === "string") return resolver[type] ?? null;
  if (typeof type === "object") {
    const rn = (type as { resolvedName?: string }).resolvedName;
    if (rn) return resolver[rn] ?? null;
  }
  return null;
}
import { InlineToolsRenderer } from "./InlineToolsRenderer";
import { GapDragControl } from "../canvas/GapDragControl";
import { ConditionBadgeController } from "../canvas/ConditionBadgeController";
import { RenderNodeDataStates } from "./RenderNodeDataStates";

class NodeErrorBoundary extends React.Component<{ children?: React.ReactNode }> {
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

  const resolver = useEditor(
    (_, query) => query.getOptions().resolver as Record<string, React.ComponentType<any>>
  );
  const craftComponent = useMemo(() => resolveCraftComponent(type, resolver), [type, resolver]);

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
          <InlineToolsRenderer craftComponent={craftComponent ?? undefined} props={nodeProps}>
            <ConditionBadgeController />
          </InlineToolsRenderer>
          <RenderNodeDataStates />
          <GapDragControl />
        </>
      )}
    </NodeErrorBoundary>
  );
};
