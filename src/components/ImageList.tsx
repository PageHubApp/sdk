import { useEditor, useNode, UserComponent } from "@craftjs/core";
import React, { useEffect, useState } from "react";
import { TbChevronLeft, TbChevronRight, TbPhoto } from "react-icons/tb";
import { getClonedState, setClonedProps } from "../utils/cloneHelper";
import { Box } from "@pagehub/ui";
import { motionIt } from "../utils/lib";

import { applyAnimation, CSStoObj } from "../utils/tailwind/tailwind";
import { useScrollToSelected } from "./lib";

import { BaseSelectorProps, applyAriaProps } from "./selectors";

export interface ImageListProps extends BaseSelectorProps {
  mode: "grid" | "carousel" | "hero" | "masonry" | "infinite" | "flex";
  itemsPerView: number;
  flexDirection?: string;
  alignItems?: string;
  justifyContent?: string;
  gap?: string;
  autoScroll: boolean | string;
  autoScrollInterval: number;
  infiniteSpeed: number;
  infiniteDirection: "left" | "right";
  animationEnabled: boolean | string;
  previewInEditor: boolean | string;
  showNavigation: boolean | string;
  showDots: boolean | string;
}

export const ImageList: UserComponent<ImageListProps> = (incomingProps: ImageListProps) => {
  let props: any = { mode: "flex", itemsPerView: 3, alignItems: "items-center", justifyContent: "justify-start", gap: "gap-2", autoScroll: false, autoScrollInterval: 3000, infiniteSpeed: 30, infiniteDirection: "left", animationEnabled: true, previewInEditor: false, showNavigation: true, showDots: true, ...incomingProps };

  const {
    connectors: { connect, drag },
    id,
  } = useNode();

  const { actions, query, enabled } = useEditor(state => getClonedState(props, state));



  props = setClonedProps(props, query);

  const [isMounted, setIsMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get child Image nodes for gallery modes
  let childImages: any[] = [];
  if (isMounted) {
    try {
      const node = query.node(id).get();
      childImages = (node.data.nodes || [])
        .map(childId => {
          try {
            const childNode = query.node(childId).get();
            if (childNode.data.name === "Image") {
              return {
                id: childId,
                src: childNode.data.props.src || "",
                alt: childNode.data.props.alt || "",
              };
            }
            return null;
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
    } catch (e) {
      childImages = [];
    }
  }

  // Auto-scroll functionality
  useEffect(() => {
    if (
      !props.autoScroll ||
      enabled ||
      !isMounted ||
      props.mode === "flex" ||
      props.mode === "infinite"
    )
      return;

    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        const maxIndex = childImages.length - props.itemsPerView;
        return prev >= maxIndex ? 0 : prev + 1;
      });
    }, props.autoScrollInterval);

    return () => clearInterval(interval);
  }, [
    props.autoScroll,
    props.autoScrollInterval,
    childImages.length,
    props.itemsPerView,
    enabled,
    isMounted,
    props.mode,
  ]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : childImages.length - props.itemsPerView));
  };

  const handleNext = () => {
    setCurrentIndex(prev => {
      const maxIndex = childImages.length - props.itemsPerView;
      return prev >= maxIndex ? 0 : prev + 1;
    });
  };

  useScrollToSelected(id, enabled);

  const prop: any = {
    ref: r => {
      connect(drag(r));
    },
    style: props.root?.style ? CSStoObj(props.root.style) || {} : {},
    className: props.className || "",
  };

  applyAriaProps(prop, props);

  if (enabled) {
    prop["data-bounding-box"] = enabled;
    // Only add node-id after client-side mount to prevent hydration mismatch
    if (isMounted) {
      prop["node-id"] = id;
    }
  }

  const element = motionIt(props, Box, enabled);

  const { children } = props;

  // Apply mode-specific className and style adjustments
  let containerClasses = prop.className;
  let additionalStyles = {};

  if (props.mode === "grid") {
    containerClasses += ` grid ${props.gap || "gap-2"}`;
    additionalStyles = {
      gridTemplateColumns: `repeat(${props.itemsPerView || 3}, minmax(0, 1fr))`,
    };
  } else if (props.mode === "masonry") {
    containerClasses += ` ${props.gap || "gap-2"}`;
    additionalStyles = {
      columnCount: props.itemsPerView || 3,
    };
  } else if (props.mode === "carousel" || props.mode === "hero") {
    containerClasses += " relative overflow-hidden";
  } else if (props.mode === "infinite") {
    containerClasses += " relative overflow-hidden";
  }

  prop.className = containerClasses;
  prop.style = { ...prop.style, ...additionalStyles };

  // Check if there are Image children
  let hasActualImages = childImages.length > 0 || !!children;

  // Wrap children for carousel/hero modes
  let wrappedChildren = children;
  if ((props.mode === "carousel" || props.mode === "hero") && isMounted) {
    const isHero = props.mode === "hero";
    const imageWidth = isHero ? "100%" : `${100 / (props.itemsPerView || 3)}%`;

    wrappedChildren = (
      <>
        <style jsx>{`
          .carousel-container > * {
            flex-shrink: 0;
            width: ${imageWidth};
            padding: 0 0.5rem;
          }
        `}</style>
        <div
          className="carousel-container flex transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentIndex * (100 / (isHero ? 1 : props.itemsPerView))}%)`,
          }}
        >
          {children}
        </div>
      </>
    );
  } else if (props.mode === "infinite" && isMounted) {
    const shouldAnimate =
      isMounted && props.animationEnabled !== "" && (!enabled || !!props.previewInEditor);

    // Calculate width for each image based on itemsPerView
    const imageWidth = `${100 / (props.itemsPerView || 3)}%`;

    // Determine animation direction
    const isScrollingLeft = props.infiniteDirection === "left";
    const animationName = isScrollingLeft ? "gallery-scroll-left" : "gallery-scroll-right";

    wrappedChildren = (
      <>
        <style jsx global>{`
          @keyframes gallery-scroll-left {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          @keyframes gallery-scroll-right {
            0% {
              transform: translateX(-50%);
            }
            100% {
              transform: translateX(0);
            }
          }
          .gallery-infinite-scroll:hover {
            animation-play-state: paused !important;
          }
          .gallery-infinite-scroll > * {
            flex-shrink: 0;
            width: ${imageWidth};
          }
        `}</style>
        <div className="w-full overflow-hidden">
          <div
            className="gallery-infinite-scroll flex"
            style={{
              animation: shouldAnimate
                ? `${animationName} ${props.infiniteSpeed}s linear infinite`
                : "none",
            }}
          >
            {children}
          </div>
        </div>
      </>
    );
  }

  const content = (
    <>
      {/* Render children with mode-specific wrapper */}
      {hasActualImages || !enabled
        ? wrappedChildren
        : enabled && (
          <div className="flex w-auto items-center justify-center p-4">
            <div data-empty-state={true} className="text-3xl">
              <TbPhoto />
            </div>
          </div>
        )}

      {/* Navigation Arrows for carousel/hero */}
      {(props.mode === "carousel" || props.mode === "hero") &&
        props.showNavigation &&
        childImages.length > props.itemsPerView &&
        !enabled && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-foreground p-2 text-background transition-colors hover:bg-muted"
              aria-label="Previous"
            >
              <TbChevronLeft size={24} />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-foreground p-2 text-background transition-colors hover:bg-muted"
              aria-label="Next"
            >
              <TbChevronRight size={24} />
            </button>
          </>
        )}

      {/* Dots Indicator for carousel/hero */}
      {(props.mode === "carousel" || props.mode === "hero") &&
        props.showDots &&
        childImages.length > props.itemsPerView &&
        !enabled && (
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
            {Array.from({
              length: childImages.length - props.itemsPerView + 1,
            }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`size-2 rounded-full transition-all ${currentIndex === index ? "w-8 bg-background" : "bg-muted"}`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
    </>
  );

  prop.children = content;

  return React.createElement(element, {
    ...applyAnimation(prop, props, null, enabled),
  });
};

ImageList.craft = {
  displayName: "Image List",
  rules: {
    canDrag: () => true,
    canMoveIn: nodes => nodes.every(node => node.data?.name === "Image"),
  },
};
