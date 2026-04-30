import { Element, useEditor, useNode } from "@craftjs/core";
import { lazy, Suspense, useState } from "react";
import { TbLayoutColumns, TbLayoutGrid, TbLayoutRows, TbPlus, TbSquare } from "react-icons/tb";
import { Chip } from "@/chrome/primitives/Chip";
import { ToolbarIconButton } from "@/chrome/primitives/ToolbarIconButton";
import { usePopoverPosition } from "../../unified-settings/hooks/usePopoverPosition";
import { AddElement } from "../../../viewport/toolbox/toolboxUtils";
import { ToolbarSection } from "../../ToolbarSection";
import type { LayoutPresetHandle } from "./hooks/useLayoutPreset";

const LayoutPresetPanel = lazy(() => import("./LayoutPresetPanel"));

const PANEL_WIDTH = 320;

interface LayoutPresetInputProps {
  /** Controller from `useLayoutPreset` in the parent (shared with Alignment shortcuts). */
  lp: LayoutPresetHandle;
  /**
   * When false, only the controls are rendered (no ToolbarSection wrapper).
   * Parent should wrap in `ToolbarSection title="Content"` per unified-settings helpers.
   */
  sectionWrapper?: boolean;
}

const LAYOUT_HOSTS = new Set(["Container", "Data", "Header", "Footer", "Form"]);

function useHasContainerType(): boolean {
  const { match } = useNode(node => ({
    match: LAYOUT_HOSTS.has((node.data?.name || node.data?.displayName || "") as string),
  }));
  return match;
}

function modeIcon(mode: LayoutPresetHandle["layoutMode"]) {
  if (mode === "flex-row") return <TbLayoutColumns className="size-3.5 shrink-0" aria-hidden />;
  if (mode === "flex-col") return <TbLayoutRows className="size-3.5 shrink-0" aria-hidden />;
  if (mode === "grid") return <TbLayoutGrid className="size-3.5 shrink-0" aria-hidden />;
  return <TbSquare className="size-3.5 shrink-0" aria-hidden />;
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function summaryFor(lp: LayoutPresetHandle): string {
  const slug = String(lp.currentPresetLayout || "").trim();
  if (slug) return titleCase(slug);
  if (lp.layoutMode === "block") return "Block";
  if (lp.layoutMode === "flex-row") return "Side by side";
  if (lp.layoutMode === "flex-col") return "Stacked";
  if (lp.layoutMode === "grid") return "Grid";
  return "Pick layout";
}

export function LayoutPresetInput({ lp, sectionWrapper = true }: LayoutPresetInputProps) {
  const hasContainerType = useHasContainerType();
  const { actions, query } = useEditor();
  const [open, setOpen] = useState(false);
  const { triggerRef, initialPos, setInitialPos, computePosition } =
    usePopoverPosition(PANEL_WIDTH);

  const addContainer = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const { Container } = await import("../../../../components/Container");
    AddElement({
      element: (
        <Element
          canvas
          is={Container}
          canDelete={true}
          className="gap-section flex w-full flex-col"
          custom={{ displayName: "Container" }}
        />
      ),
      actions,
      query,
    });
  };

  const openPanel = () => {
    setInitialPos(computePosition());
    setOpen(true);
  };

  const summary = summaryFor(lp);
  const leading = modeIcon(lp.layoutMode);

  const inner = (
    <>
      <Chip
        mode="popover"
        ref={triggerRef}
        label="Layout"
        open={open}
        onTriggerClick={() => (open ? setOpen(false) : openPanel())}
        onClear={() => {
          if (open) setOpen(false);
          lp.switchToMode("block");
        }}
        triggerAriaLabel="Pick layout"
        clearAriaLabel="Clear layout (Block)"
        leading={leading}
        summary={summary}
        trailingExtras={
          hasContainerType ? (
            <ToolbarIconButton
              ariaLabel="Add container"
              tooltip="Add container"
              onClick={addContainer}
            >
              <TbPlus className="size-3.5" aria-hidden />
            </ToolbarIconButton>
          ) : null
        }
      />

      {open && (
        <Suspense fallback={null}>
          <LayoutPresetPanel
            initialPosition={initialPos}
            onClose={() => setOpen(false)}
            lp={lp}
          />
        </Suspense>
      )}
    </>
  );

  if (!sectionWrapper) return inner;

  return (
    <ToolbarSection
      title="Layout"
      icon={<TbLayoutGrid />}
      propKey="display"
      defaultOpen
    >
      {inner}
    </ToolbarSection>
  );
}
