import { useNode } from "@craftjs/core";
import { useFindScrollingParent } from "../../core/componentHooks";
import { useCallback, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { getRect } from "../viewport/hooks/useRect";

const RenderNodeControl = ({
  position,
  children = null,
  className = "",
  align,
  placement = "start",
  hPlacement = "start",
  isPadding = false,
  alt = {
    position: "",
    placement: "",
    align: "",
  },
  animate = {},
  style = {},
  ...props
}) => {
  const localRef = useRef(null);
  const ref = useRef(null);
  const { id } = useNode();

  const setPosition = useCallback(() => {
    if (!localRef.current) return;

    const originalDisplay = localRef.current.style.display;

    localRef.current.style.display = "flex";
    const rect = getRect(localRef.current);
    localRef.current.style.display = originalDisplay;

    const viewportRect = document.getElementById("viewport").getBoundingClientRect();

    delete ref.current.style.top;
    delete ref.current.style.bottom;

    delete ref.current.style.left;
    delete ref.current.style.right;

    let right = 0;
    const gap = 50;

    if (hPlacement === "middle") right = rect.width / 2;
    if (hPlacement === "end") right = rect.width;

    if (["top", "bottom"].includes(position)) {
      ref.current.style.left = `-${right - gap}px`;
      ref.current.style.right = "";

      if (align === "start" && isPadding) {
        // For padding controls at the start, position 6px from left
        ref.current.style.left = "6px";
      }

      if (align === "middle") {
        ref.current.style.left = `calc(50% - ${rect.width / 2}px)`;
      }

      if (align === "end") {
        ref.current.style.left = "auto";
        // For padding controls, position inside; for others, position outside
        ref.current.style.right = isPadding ? "6px" : `-${right}px`;
      }

      let top = 0;
      if (placement === "middle") top = rect.height / 2;
      if (placement === "start") top = rect.height;

      if (isPadding) {
        // Position inside the border for padding controls
        ref.current.style.top = position === "top" ? "6px" : "auto";
        if (position === "bottom") {
          ref.current.style.top = "auto";
          ref.current.style.bottom = "6px";
        }
      } else {
        // Position outside the border for margin/height/width controls
        ref.current.style.top = `-${top}px`;

        if (position === "bottom") {
          let top = rect.height;
          if (placement === "middle") top = rect.height / 2;
          if (placement === "start") top = 0;
          ref.current.style.top = "auto";
          ref.current.style.bottom = `-${top}px`;
        }
      }
    } else if (["left", "right"].includes(position)) {
      // align middle
      ref.current.style.top = `calc(50% - ${rect.height / 2}px)`;
      ref.current.style.bottom = "auto";

      if (isPadding) {
        // Position inside the border for padding controls
        if (position === "left") {
          ref.current.style.left = "6px";
          ref.current.style.right = "auto";
        } else if (position === "right") {
          ref.current.style.right = "6px";
          ref.current.style.left = "auto";
        }
      } else {
        // Position outside the border for margin/height/width controls
        if (position === "left") {
          ref.current.style.left = `-${rect.width}px`;
          ref.current.style.right = "auto";
        } else if (position === "right") {
          ref.current.style.right = `-${rect.width - 4}px`;
          ref.current.style.left = "auto";
        }
      }
      localRef.current.style.display = "flex";
      return;
    }

    const newRect = getRect(ref.current);

    const outOfViewport = newRect.bottom > viewportRect.bottom || newRect.top < viewportRect.top; // ||

    if (outOfViewport) {
      if (!alt.position) return;
      if (alt.position) {
        position = alt.position;
      }
      if (alt.placement) {
        placement = alt.placement;
      }
      if (alt.align) {
        align = alt.align;
      }

      if (alt.position === "none") {
        localRef.current.style.display = "none";
        return;
      }

      // Element is not within the viewport, position it on the opposite side
      if (position === "top") {
        ref.current.style.top = "auto";
        ref.current.style.bottom = `-${rect.height}px`;
      } else if (position === "bottom") {
        let top = rect.height;
        if (placement === "middle") top = rect.height / 2;
        if (placement === "start") top = 0;
        ref.current.style.bottom = "auto";
        ref.current.style.top = `-${top}px`;
      } else if (position === "left") {
        ref.current.style.left = `${viewportRect.width}px`;
        ref.current.style.right = "auto";
      } else if (position === "right") {
        ref.current.style.left = `-${rect.width}px`;
        ref.current.style.right = `${viewportRect.width}px`;
      }
    }

    const newsRect = getRect(ref.current);

    const stillOutOfView = newsRect.bottom > viewportRect.bottom || newsRect.top < viewportRect.top;

    if (stillOutOfView) {
      ref.current.style.bottom = "10px";
    }

    localRef.current.style.display = "flex";
  }, [localRef]);

  useEffect(() => {
    setPosition();
  }, [ref, localRef.current]);

  const scrollingParent = useFindScrollingParent(id);
  const originalElementRef = useRef(null);

  useEffect(() => {
    if (!ref.current) return;

    let animationFrameId;

    if (!scrollingParent) return;

    const handleScroll = () => {
      window.cancelAnimationFrame(animationFrameId);

      animationFrameId = window.requestAnimationFrame(() => {
        setPosition();
      });
    };

    scrollingParent.addEventListener("scroll", handleScroll);

    return () => {
      scrollingParent.removeEventListener("scroll", handleScroll);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [originalElementRef, scrollingParent, ref]);

  const display = "none";

  return (
    <div
      data-type="nodeControlBase"
      className={`${className} absolute z-30`}
      style={style}
      ref={ref}
      {...props}
      key={uuidv4()}
    >
      <div
        style={{
          display,
          ...style, // Inherit the color style to the inner div
        }}
        data-type="nodeControl"
        ref={localRef}
      >
        {children}
      </div>
    </div>
  );
};

export default RenderNodeControl;
