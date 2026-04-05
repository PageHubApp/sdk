// @ts-nocheck
import { useNode } from "@craftjs/core";
import { useEffect, useState } from "react";

export function useMousePosition(id, distance = 45, cref = null) {
  // Get DOM from CraftJS if not provided
  const { dom: craftDom } = useNode(node => ({
    dom: node.dom,
  }));

  const dom = cref || craftDom;

  const [isInTopOrLeft, setIsInTopOrLeft] = useState(false);
  const [isInBottomOrRight, setIsInBottomOrRight] = useState(false);
  const [isInTopOrLeftOrBottomOrRight, setIsInTopOrLeftOrBottomOrRight] = useState(false);
  const [isNearTop, setIsNearTop] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [isNearLeft, setIsNearLeft] = useState(false);
  const [isNearRight, setIsNearRight] = useState(false);

  useEffect(() => {
    if (!dom) return;

    const handleMouseMove = event => {
      const { clientX, clientY } = event;

      const { top, bottom, left, right } = dom.getBoundingClientRect();

      setIsInTopOrLeft(Math.abs(clientY - top) <= distance);
      setIsInBottomOrRight(Math.abs(clientY - bottom) <= distance);
      setIsInTopOrLeftOrBottomOrRight(clientX < left + distance || clientX > right - distance);

      // Individual edge detection
      setIsNearTop(Math.abs(clientY - top) <= distance);
      setIsNearBottom(Math.abs(clientY - bottom) <= distance);
      setIsNearLeft(Math.abs(clientX - left) <= distance);
      setIsNearRight(Math.abs(clientX - right) <= distance);
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [distance, dom]);

  return {
    isInTopOrLeft,
    isInBottomOrRight,
    isInTopOrLeftOrBottomOrRight,
    isNearTop,
    isNearBottom,
    isNearLeft,
    isNearRight,
    cref,
  };
}

export function useIsMouseOver(id) {
  // Get DOM from CraftJS
  const { dom } = useNode(node => ({
    dom: node.dom,
  }));

  const [isMouseOver, setIsMouseOver] = useState(false);

  useEffect(() => {
    if (!dom) return;

    const handleMouseOver = () => {
      setIsMouseOver(true);
    };

    const handleMouseOut = () => {
      setIsMouseOver(false);
    };

    dom.addEventListener("mouseover", handleMouseOver);
    dom.addEventListener("mouseout", handleMouseOut);

    return () => {
      dom.removeEventListener("mouseover", handleMouseOver);
      dom.removeEventListener("mouseout", handleMouseOut);
    };
  }, [dom]);

  return isMouseOver;
}

/**
 * Hook to get the computed color from the DOM element
 * This matches the color used by border-current in the CSS
 * Returns the color value to be used as inline style
 */
export function useElementColor(dom: HTMLElement | null, isActive: boolean) {
  const [elementColor, setElementColor] = useState<string | null>(null);

  useEffect(() => {
    if (!dom || !isActive) {
      setElementColor(null);
      return;
    }

    const computedStyle = window.getComputedStyle(dom);
    const color = computedStyle.color;

    // Always use the computed color, even if it's black
    if (color) {
      setElementColor(color);
    } else {
      // Fallback to a neutral color if no color is computed
      setElementColor("#9ca3af"); // gray-400
    }
  }, [dom, isActive]);

  return elementColor;
}
