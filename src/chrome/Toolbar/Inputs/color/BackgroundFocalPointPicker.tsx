import { useEditor, useNode } from "@craftjs/core";
import { changeProp } from "../../../Viewport/lib";
import { useEffect, useRef, useState } from "react";
import { TbTarget } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { getBackgroundUrl } from "utils/lib";
import { ViewAtom } from "../../../Viewport/atoms";
import { getEffectiveViews, ViewSelectionAtom } from "../../Label";

interface BackgroundFocalPointPickerProps {
  imageUrl?: string;
}

export function BackgroundFocalPointPicker({
  imageUrl,
}: BackgroundFocalPointPickerProps) {
  const { actions, query } = useEditor();
  const view = useAtomValue(ViewAtom);
  const viewSelection = useAtomValue(ViewSelectionAtom);

  const {
    actions: { setProp },
    id,
    props,
  } = useNode(node => ({
    id: node.id,
    props: node.data.props,
  }));

  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [currentFocalPoint, setCurrentFocalPoint] = useState({ x: 50, y: 50 });
  const [savedFocalPoint, setSavedFocalPoint] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const componentElementRef = useRef<HTMLElement | null>(null);

  // Get the actual background image URL
  const backgroundUrl = imageUrl || getBackgroundUrl(props, query);

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
    const effectiveViews = getEffectiveViews(viewSelection, view);

    // Save to selected views via setProp
    const classDark = viewSelection.dark ?? false;
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

  // Mouse/Touch event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updateFocalPoint(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    updateFocalPoint(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    updateFocalPoint(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateFocalPoint(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

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

  // Handle global mouse events when dragging
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        updateFocalPoint(e.clientX, e.clientY);
      };
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };

      document.addEventListener("mousemove", handleGlobalMouseMove);
      document.addEventListener("mouseup", handleGlobalMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleGlobalMouseMove);
        document.removeEventListener("mouseup", handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

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
      {/* Toggle Button */}
      <button
        onClick={() => (isPickerOpen ? handleClosePicker() : setIsPickerOpen(true))}
        className="btn btn-secondary"
      >
        <TbTarget className="size-4" />
        <span>Focal Point Picker</span>
      </button>

      {/* Picker Interface */}
      {isPickerOpen && (
        <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
          <div className="text-xs text-muted-foreground">
            Click or drag to set the focal point of your background image
          </div>

          {/* Image Preview with Crosshair */}
          <div
            ref={pickerRef}
            role="presentation"
            aria-hidden="true"
            className="relative aspect-video w-full cursor-crosshair select-none overflow-hidden rounded-lg border-2 border-border bg-muted"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
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
              className="pointer-events-none absolute -ml-4 -mt-4 size-8"
              style={{ left: `${currentFocalPoint.x}%`, top: `${currentFocalPoint.y}%` }}
            >
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-2 border-white shadow-lg"></div>
              {/* Inner dot */}
              <div className="absolute inset-2 rounded-full bg-primary shadow-lg"></div>
              {/* Crosshair lines */}
              <div className="absolute left-1/2 top-0 h-full w-px bg-white opacity-50"></div>
              <div className="absolute left-0 top-1/2 h-px w-full bg-white opacity-50"></div>
            </div>
          </div>

          {/* Position Display and Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="font-mono text-xs text-muted-foreground">
              Position: {Math.round(currentFocalPoint.x)}%, {Math.round(currentFocalPoint.y)}%
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="btn btn-secondary btn-sm"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyFocalPoint}
                className="btn btn-primary btn-sm"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
