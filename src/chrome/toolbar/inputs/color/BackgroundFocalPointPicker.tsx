import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../viewport/state/viewportExports";
import { useEffect, useRef, useState } from "react";
import { TbTarget } from "react-icons/tb";
import { ToolbarDashedButton } from "../../primitives/ToolbarDashedButton";
import { useAtomValue } from "@zedux/react";
import { getBackgroundUrl } from "@/utils/background";
import { extractRootDataFromQuery } from "@/utils/page/pageManagement";
import { useMemo } from "react";
import { ViewAtom } from "../../../viewport/state/atoms";
import { getEffectiveViews, EditModifiersAtom } from "../../Label";
import { MultiScopeAtom } from "../../breakpoint-chip/atoms";
import { useDragGesture } from "../../../hooks/useDragGesture";

interface BackgroundFocalPointPickerProps {
  imageUrl?: string;
  /** Optional callback fired whenever the picker opens or closes. Lets the
   *  host hide neighbouring chrome (e.g. ImageSettingsSection's settings
   *  list) while focal-point editing is active. */
  onOpenChange?: (open: boolean) => void;
}

export function BackgroundFocalPointPicker({
  imageUrl,
  onOpenChange,
}: BackgroundFocalPointPickerProps) {
  const { actions, query } = useEditor();
  const view = useAtomValue(ViewAtom);
  const modifiers = useAtomValue(EditModifiersAtom);
  const multiScope = useAtomValue(MultiScopeAtom);

  const {
    actions: { setProp },
    id,
    props,
  } = useNode(node => ({
    id: node.id,
    props: node.data?.props,
  }));

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [currentFocalPoint, setCurrentFocalPoint] = useState({ x: 50, y: 50 });
  const [savedFocalPoint, setSavedFocalPoint] = useState({ x: 50, y: 50 });
  const pickerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const componentElementRef = useRef<HTMLElement | null>(null);

  // Get the actual background image URL
  const { pageMedia } = useMemo(() => extractRootDataFromQuery(query), [query]);
  const backgroundUrl = imageUrl || getBackgroundUrl(props, pageMedia);

  // Get reference to the actual DOM element being edited
  useEffect(() => {
    if (typeof document !== "undefined") {
      const element = document.querySelector(`[node-id="${id}"]`) as HTMLElement;
      componentElementRef.current = element;
    }
  }, [id]);

  // Calculate focal point from mouse/touch position and apply preview
  const updateFocalPoint = (clientX: number, clientY: number) => {
    if (!pickerRef.current) return;

    const rect = pickerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

    setCurrentFocalPoint({ x, y });

    // Apply temporary preview to the component
    applyTemporaryPreview(x, y);
  };

  // Apply temporary preview directly to DOM (doesn't touch React state)
  const applyTemporaryPreview = (x: number, y: number) => {
    if (!componentElementRef.current) return;

    const xRounded = Math.round(x);
    const yRounded = Math.round(y);

    // Directly manipulate the DOM style for instant feedback
    componentElementRef.current.style.backgroundPosition = `${xRounded}% ${yRounded}%`;
  };

  // Apply the focal point to the component (saves to React state)
  const applyFocalPoint = () => {
    const xRounded = Math.round(currentFocalPoint.x);
    const yRounded = Math.round(currentFocalPoint.y);

    // Clear inline style first
    if (componentElementRef.current) {
      componentElementRef.current.style.backgroundPosition = "";
    }

    // Get which views to apply to based on selection
    const effectiveViews = getEffectiveViews(modifiers, view, multiScope);

    // Save to selected views via setProp
    const classDark = modifiers.dark ?? false;
    effectiveViews.forEach(targetView => {
      changeProp({
        propKey: "backgroundPosition",
        value: `bg-[${xRounded}%_${yRounded}%]`,
        setProp,
        propType: "class",
        view: targetView as "mobile" | "desktop",
        query,
        actions,
        nodeId: id,
        classDark,
      });
    });

    // Save as the new saved focal point
    setSavedFocalPoint({ x: xRounded, y: yRounded });
    setIsPickerOpen(false);
  };

  const { onPointerDown: onPickerPointerDown } = useDragGesture({
    onStart: (e, pos) => {
      e.preventDefault();
      updateFocalPoint(pos.clientX, pos.clientY);
    },
    onMove: (_e, m) => {
      updateFocalPoint(m.clientX, m.clientY);
    },
  });

  // Reset to saved focal point
  const handleReset = () => {
    setCurrentFocalPoint(savedFocalPoint);
    // Clear inline style to show saved CSS classes
    if (componentElementRef.current) {
      componentElementRef.current.style.backgroundPosition = "";
    }
  };

  // Close picker and revert to saved
  const handleClosePicker = () => {
    setCurrentFocalPoint(savedFocalPoint);
    // Clear inline style to revert to saved CSS classes
    if (componentElementRef.current) {
      componentElementRef.current.style.backgroundPosition = "";
    }
    setIsPickerOpen(false);
  };

  // Load saved focal point from props
  const loadSavedFocalPoint = () => {
    const cn = props?.className || "";
    const bgPosMatch = cn.match(/bg-\[\d+%_\d+%\]/);
    const bgPos = bgPosMatch ? bgPosMatch[0] : null;
    if (bgPos && bgPos.includes("bg-[") && bgPos.includes("%")) {
      // Parse bg-[X%_Y%] format
      const match = bgPos.match(/bg-\[(\d+)%_(\d+)%\]/);
      if (match) {
        const saved = { x: parseInt(match[1]), y: parseInt(match[2]) };
        setSavedFocalPoint(saved);
        setCurrentFocalPoint(saved);
        return;
      }
    }
    // Default to center if no custom position set
    const defaultPos = { x: 50, y: 50 };
    setSavedFocalPoint(defaultPos);
    setCurrentFocalPoint(defaultPos);
  };

  // Load saved focal point when component mounts or props change
  useEffect(() => {
    loadSavedFocalPoint();
  }, [props]);

  // Load saved focal point when picker opens
  useEffect(() => {
    if (isPickerOpen) {
      loadSavedFocalPoint();
      // Clear any inline style to show the saved CSS classes
      if (componentElementRef.current) {
        componentElementRef.current.style.backgroundPosition = "";
      }
    }
  }, [isPickerOpen]);

  // Notify host of open/close so neighbouring chrome can hide while picking.
  useEffect(() => {
    onOpenChange?.(isPickerOpen);
  }, [isPickerOpen, onOpenChange]);

  // Cleanup inline style when component unmounts
  useEffect(() => {
    return () => {
      if (componentElementRef.current) {
        componentElementRef.current.style.backgroundPosition = "";
      }
    };
  }, []);

  if (!backgroundUrl) return null;

  return (
    <>
      {/* Toggle Button — canonical dashed CTA shared with Action / Bundle / etc. */}
      <ToolbarDashedButton
        onClick={() => (isPickerOpen ? handleClosePicker() : setIsPickerOpen(true))}
        icon={<TbTarget className="size-3.5" aria-hidden />}
      >
        {isPickerOpen ? "Close Focal Point Picker" : "Focal Point Picker"}
      </ToolbarDashedButton>

      {/* Picker Interface */}
      {isPickerOpen && (
        <div className="border-base-300 bg-base-200 flex flex-col gap-3 rounded-lg border p-3">
          <div className="text-neutral-content text-xs">
            Click or drag to set the focal point of your background image
          </div>

          {/* Image Preview with Crosshair */}
          <div
            ref={pickerRef}
            role="presentation"
            aria-hidden="true"
            className="border-base-300 bg-neutral relative aspect-video w-full cursor-crosshair touch-none overflow-hidden rounded-lg border-2 select-none"
            onPointerDown={onPickerPointerDown}
          >
            {/* Background Image */}
            <img
              ref={imageRef}
              src={backgroundUrl}
              alt="Background preview"
              className="size-full object-cover"
              draggable={false}
            />

            {/* Grid Overlay */}
            <div className="pointer-events-none absolute inset-0">
              <svg className="size-full">
                {/* Vertical lines */}
                <line
                  x1="33.33%"
                  y1="0"
                  x2="33.33%"
                  y2="100%"
                  stroke="white"
                  strokeWidth="1"
                  opacity="0.3"
                />
                <line
                  x1="66.66%"
                  y1="0"
                  x2="66.66%"
                  y2="100%"
                  stroke="white"
                  strokeWidth="1"
                  opacity="0.3"
                />
                {/* Horizontal lines */}
                <line
                  x1="0"
                  y1="33.33%"
                  x2="100%"
                  y2="33.33%"
                  stroke="white"
                  strokeWidth="1"
                  opacity="0.3"
                />
                <line
                  x1="0"
                  y1="66.66%"
                  x2="100%"
                  y2="66.66%"
                  stroke="white"
                  strokeWidth="1"
                  opacity="0.3"
                />
              </svg>
            </div>

            {/* Focal Point Crosshair */}
            <div
              className="pointer-events-none absolute -mt-4 -ml-4 size-8"
              style={{ left: `${currentFocalPoint.x}%`, top: `${currentFocalPoint.y}%` }}
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-white shadow-lg"></div>
              {/* Inner dot */}
              <div className="bg-primary absolute inset-2 rounded-full shadow-lg"></div>
              {/* Crosshair lines */}
              <div className="absolute top-0 left-1/2 h-full w-px bg-white opacity-50"></div>
              <div className="absolute top-1/2 left-0 h-px w-full bg-white opacity-50"></div>
            </div>
          </div>

          {/* Position Display and Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="text-neutral-content font-mono text-xs">
              Position: {Math.round(currentFocalPoint.x)}%, {Math.round(currentFocalPoint.y)}%
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={handleReset} className="btn btn-secondary btn-sm">
                Reset
              </button>
              <button type="button" onClick={applyFocalPoint} className="btn btn-primary btn-sm">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
