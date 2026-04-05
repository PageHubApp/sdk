// @ts-nocheck
// source: https://gist.github.com/morajabi/523d7a642d8c0a2f71fcfa0d8b3d2846
import { useCallback, useEffect, useState } from "react";

type RectResult = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
  x: number;
  y: number;
};

export function getRect(element?: any): RectResult {
  let rect: RectResult = {
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
  };
  if (element) rect = element.getBoundingClientRect();
  return rect;
}

export function useRect<T extends HTMLElement>(ref: React.RefObject<T>): RectResult {
  const [rect, setRect] = useState<RectResult>(
    ref && ref.current ? getRect(ref.current) : getRect()
  );

  const handleResize = useCallback(() => {
    if (!ref.current) return;

    const _rect = getRect(ref.current);
    setRect(_rect); // Update client rect
  }, [ref]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [ref]);

  return rect;
}

export const useElementPosition = id => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = document.querySelector(`[node-id="${id}"]`);
    if (element) {
      const rect = element.getBoundingClientRect();
      setPosition({ top: rect.top, left: rect.left });
      setSize({ width: rect.width, height: rect.height });
    }
  }, [id]);

  return { position, size };
};
