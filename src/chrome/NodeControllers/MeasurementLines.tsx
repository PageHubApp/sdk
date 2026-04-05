// @ts-nocheck
import { useEditor } from "@craftjs/core";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import ReactDOM from "react-dom";

/**
 * MeasurementLines - Figma-style distance measurements between elements
 * Hold Alt/Option key and hover over elements to see red measurement lines
 * Shows distances to parent edges and nearby sibling elements
 */
export const MeasurementLines = () => {
  const { enabled } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const [measurements, setMeasurements] = useState<
    Array<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      distance: number;
      direction: "horizontal" | "vertical";
      labelX: number;
      labelY: number;
    }>
  >([]);

  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const [altPressed, setAltPressed] = useState(false);

  // Track Alt/Option key (Figma-style)
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !altPressed) {
        setAltPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && altPressed) {
        setAltPressed(false);
        setMeasurements([]); // Clear measurements when Alt is released
      }
    };

    // Handle window blur (user switches tabs while holding Alt)
    const handleBlur = () => {
      setAltPressed(false);
      setMeasurements([]);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, altPressed]);

  useEffect(() => {
    if (!enabled) {
      setMeasurements([]);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      // Only show measurements when Alt/Option is held (Figma-style)
      if (!altPressed) {
        if (measurements.length > 0) {
          setMeasurements([]);
          setHoveredElement(null);
        }
        return;
      }

      const target = e.target as HTMLElement;

      // Find the craftjs node element - look up the tree for node-id attribute
      let nodeElement = target.closest("[node-id]") as HTMLElement;

      // Special handling for text elements that might be deeply nested
      if (!nodeElement && target.textContent) {
        let parent = target.parentElement;
        while (parent && !parent.hasAttribute("node-id")) {
          parent = parent.parentElement;
        }
        nodeElement = parent as HTMLElement;
      }

      if (!nodeElement) {
        setMeasurements([]);
        setHoveredElement(null);
        return;
      }

      // Don't show measurements when dragging
      if (e.buttons !== 0) {
        return;
      }

      setHoveredElement(nodeElement);

      const targetRect = nodeElement.getBoundingClientRect();
      const newMeasurements = [];

      // Find all other craftjs elements
      const allNodes = document.querySelectorAll("[node-id]");

      // Find the parent container (look for craftjs node or regular parent)
      let parent = nodeElement.parentElement;
      while (parent && !parent.hasAttribute("node-id") && parent.parentElement) {
        parent = parent.parentElement;
      }

      const siblings = parent
        ? (Array.from(parent.children).filter(
            el =>
              el !== nodeElement && (el.hasAttribute("node-id") || el.querySelector("[node-id]"))
          ) as HTMLElement[])
        : [];

      // Maximum distance to show measurements (in pixels)
      const MAX_DISTANCE = 300;

      // Measure distance to parent container edges
      if (parent && parent.hasAttribute("node-id")) {
        const parentRect = parent.getBoundingClientRect();

        // Distance to top of parent
        const distanceToTop = targetRect.top - parentRect.top;
        if (distanceToTop > 1 && distanceToTop < MAX_DISTANCE) {
          const x = targetRect.left + targetRect.width / 2;
          newMeasurements.push({
            x1: x,
            y1: parentRect.top,
            x2: x,
            y2: targetRect.top,
            distance: Math.round(distanceToTop),
            direction: "vertical",
            labelX: x,
            labelY: (parentRect.top + targetRect.top) / 2,
          });
        }

        // Distance to bottom of parent
        const distanceToBottom = parentRect.bottom - targetRect.bottom;
        if (distanceToBottom > 1 && distanceToBottom < MAX_DISTANCE) {
          const x = targetRect.left + targetRect.width / 2;
          newMeasurements.push({
            x1: x,
            y1: targetRect.bottom,
            x2: x,
            y2: parentRect.bottom,
            distance: Math.round(distanceToBottom),
            direction: "vertical",
            labelX: x,
            labelY: (targetRect.bottom + parentRect.bottom) / 2,
          });
        }

        // Distance to left of parent
        const distanceToLeft = targetRect.left - parentRect.left;
        if (distanceToLeft > 1 && distanceToLeft < MAX_DISTANCE) {
          const y = targetRect.top + targetRect.height / 2;
          newMeasurements.push({
            x1: parentRect.left,
            y1: y,
            x2: targetRect.left,
            y2: y,
            distance: Math.round(distanceToLeft),
            direction: "horizontal",
            labelX: (parentRect.left + targetRect.left) / 2,
            labelY: y,
          });
        }

        // Distance to right of parent
        const distanceToRight = parentRect.right - targetRect.right;
        if (distanceToRight > 1 && distanceToRight < MAX_DISTANCE) {
          const y = targetRect.top + targetRect.height / 2;
          newMeasurements.push({
            x1: targetRect.right,
            y1: y,
            x2: parentRect.right,
            y2: y,
            distance: Math.round(distanceToRight),
            direction: "horizontal",
            labelX: (targetRect.right + parentRect.right) / 2,
            labelY: y,
          });
        }
      }

      // Check siblings for proximity
      siblings.forEach(sibling => {
        // Get the actual node element if sibling contains one
        const siblingNode = sibling.hasAttribute("node-id")
          ? sibling
          : (sibling.querySelector("[node-id]") as HTMLElement);

        if (!siblingNode) return;

        const siblingRect = siblingNode.getBoundingClientRect();

        // Horizontal distance (left/right)
        if (
          Math.abs(targetRect.top - siblingRect.top) < targetRect.height &&
          Math.abs(targetRect.bottom - siblingRect.bottom) < targetRect.height
        ) {
          // Element to the right
          if (siblingRect.left > targetRect.right) {
            const distance = siblingRect.left - targetRect.right;
            if (distance > 0 && distance < MAX_DISTANCE) {
              const y =
                (Math.max(targetRect.top, siblingRect.top) +
                  Math.min(targetRect.bottom, siblingRect.bottom)) /
                2;
              newMeasurements.push({
                x1: targetRect.right,
                y1: y,
                x2: siblingRect.left,
                y2: y,
                distance: Math.round(distance),
                direction: "horizontal",
                labelX: (targetRect.right + siblingRect.left) / 2,
                labelY: y,
              });
            }
          }
          // Element to the left
          else if (siblingRect.right < targetRect.left) {
            const distance = targetRect.left - siblingRect.right;
            if (distance > 0 && distance < MAX_DISTANCE) {
              const y =
                (Math.max(targetRect.top, siblingRect.top) +
                  Math.min(targetRect.bottom, siblingRect.bottom)) /
                2;
              newMeasurements.push({
                x1: siblingRect.right,
                y1: y,
                x2: targetRect.left,
                y2: y,
                distance: Math.round(distance),
                direction: "horizontal",
                labelX: (siblingRect.right + targetRect.left) / 2,
                labelY: y,
              });
            }
          }
        }

        // Vertical distance (top/bottom)
        if (
          Math.abs(targetRect.left - siblingRect.left) < targetRect.width &&
          Math.abs(targetRect.right - siblingRect.right) < targetRect.width
        ) {
          // Element below
          if (siblingRect.top > targetRect.bottom) {
            const distance = siblingRect.top - targetRect.bottom;
            if (distance > 0 && distance < MAX_DISTANCE) {
              const x =
                (Math.max(targetRect.left, siblingRect.left) +
                  Math.min(targetRect.right, siblingRect.right)) /
                2;
              newMeasurements.push({
                x1: x,
                y1: targetRect.bottom,
                x2: x,
                y2: siblingRect.top,
                distance: Math.round(distance),
                direction: "vertical",
                labelX: x,
                labelY: (targetRect.bottom + siblingRect.top) / 2,
              });
            }
          }
          // Element above
          else if (siblingRect.bottom < targetRect.top) {
            const distance = targetRect.top - siblingRect.bottom;
            if (distance > 0 && distance < MAX_DISTANCE) {
              const x =
                (Math.max(targetRect.left, siblingRect.left) +
                  Math.min(targetRect.right, siblingRect.right)) /
                2;
              newMeasurements.push({
                x1: x,
                y1: siblingRect.bottom,
                x2: x,
                y2: targetRect.top,
                distance: Math.round(distance),
                direction: "vertical",
                labelX: x,
                labelY: (siblingRect.bottom + targetRect.top) / 2,
              });
            }
          }
        }
      });

      setMeasurements(newMeasurements);
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [enabled, altPressed, measurements.length]);

  const svg = document?.getElementById("measurement-lines-svg");
  if (!svg || measurements.length === 0) return null;

  return ReactDOM.createPortal(
    <>
      {measurements.map((measurement, i) => (
        <motion.g
          key={`measurement-${i}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* Main line */}
          <line
            x1={measurement.x1}
            y1={measurement.y1}
            x2={measurement.x2}
            y2={measurement.y2}
            stroke="#ef4444"
            strokeWidth="1"
            strokeDasharray="none"
          />

          {/* End caps */}
          {measurement.direction === "horizontal" ? (
            <>
              {/* Left cap */}
              <line
                x1={measurement.x1}
                y1={measurement.y1 - 4}
                x2={measurement.x1}
                y2={measurement.y1 + 4}
                stroke="#ef4444"
                strokeWidth="1"
              />
              {/* Right cap */}
              <line
                x1={measurement.x2}
                y1={measurement.y2 - 4}
                x2={measurement.x2}
                y2={measurement.y2 + 4}
                stroke="#ef4444"
                strokeWidth="1"
              />
            </>
          ) : (
            <>
              {/* Top cap */}
              <line
                x1={measurement.x1 - 4}
                y1={measurement.y1}
                x2={measurement.x1 + 4}
                y2={measurement.y1}
                stroke="#ef4444"
                strokeWidth="1"
              />
              {/* Bottom cap */}
              <line
                x1={measurement.x2 - 4}
                y1={measurement.y2}
                x2={measurement.x2 + 4}
                y2={measurement.y2}
                stroke="#ef4444"
                strokeWidth="1"
              />
            </>
          )}

          {/* Distance label */}
          <foreignObject
            x={measurement.labelX - 20}
            y={measurement.labelY - 10}
            width="40"
            height="20"
            style={{ pointerEvents: "none" }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.15 }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  color: "#ef4444",
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  padding: "2px 4px",
                  borderRadius: "2px",
                  border: "1px solid #ef4444",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  whiteSpace: "nowrap",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                {measurement.distance}px
              </span>
            </motion.div>
          </foreignObject>
        </motion.g>
      ))}
    </>,
    svg
  );
};
