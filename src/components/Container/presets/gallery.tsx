import React from "react";
import { Element } from "@craftjs/core";
import { TbChevronLeft, TbChevronRight } from "react-icons/tb";
import { Container } from "../Container";
import { Button } from "../../Button/Button";
import { Image } from "../../Image/Image";

// ─── Image gallery preset helpers ───
// All Image presets are plain Containers + Image children. The auto-list
// detector renders the add/remove/reorder editor in the toolbar when there
// are 3+ contiguous Image children. Marquee + carousel use animation /
// state primitives (no per-component runtime).

export function buildSimpleImageChildren() {
  return [0, 1, 2].map(i => (
    <Element
      key={i}
      is={Image}
      custom={{ displayName: `Image ${i + 1}` }}
      alt={`Image ${i + 1}`}
      className="rounded-box h-auto w-full object-cover"
      canDelete={true}
      canEditName={true}
    />
  ));
}

export function buildMarqueeChildren() {
  // Marquee animates 0 → -50%, so duplicated children with `gap-X` land half a
  // gap off → visible jump. Use `mr-*` on each child instead. The CSS
  // animation system (cssMarquee preset) handles the keyframe.
  return [0, 1, 2, 3, 4, 5].map(i => (
    <Element
      key={i}
      is={Image}
      custom={{ displayName: `Image ${i + 1}` }}
      alt={`Image ${i + 1}`}
      className="mr-space-md rounded-box h-24 w-40 shrink-0 object-cover"
      canDelete={true}
      canEditName={true}
    />
  ));
}

export function buildCarouselChildren(opts: { hero: boolean }) {
  // Unique id per insert so multiple carousels on one page don't collide
  // on `--carousel-index` state, prev/next targets, or dot bindings.
  const uid = `carousel-${Math.random().toString(36).slice(2, 8)}`;
  const stateKey = uid;
  const slidesCount = 3;
  const itemsPerView = opts.hero ? 1 : 3;
  const slideClassName = opts.hero
    ? "w-full h-80 shrink-0 object-cover"
    : "h-56 shrink-0 object-cover px-space-xs";
  const slideStyle = opts.hero
    ? "flex-basis: 100%"
    : "flex-basis: calc(100% / var(--carousel-items))";

  const slides = Array.from({ length: slidesCount }).map((_, i) => (
    <Element
      key={`slide-${i}`}
      is={Image}
      custom={{ displayName: `Slide ${i + 1}` }}
      alt={`Slide ${i + 1}`}
      className={slideClassName}
      root={{ style: slideStyle }}
      canDelete={true}
      canEditName={true}
    />
  ));

  const dots = Array.from({ length: slidesCount }).map((_, i) => (
    <Element
      key={`dot-${i}`}
      is={Button}
      custom={{ displayName: `Dot ${i + 1}` }}
      text=""
      className="bg-base-content/30 hover:bg-base-content/60 size-2.5 rounded-full transition-all"
      action={[
        { type: "set-state", key: stateKey, kind: "value", value: String(i), trigger: "click" },
      ]}
      stateModifiers={[
        {
          conditions: [
            {
              logic: "all",
              conditions: [{ type: "state", key: stateKey, operator: "equals", value: String(i) }],
            },
          ],
          modifiers: ["dot-active"],
        },
      ]}
      canDelete={true}
      canEditName={true}
    />
  ));

  return [
    <Element
      key="track"
      canvas
      is={Container}
      custom={{ displayName: "Carousel Track" }}
      attrs={{ "data-carousel-track": uid }}
      className="flex transition-transform duration-500 ease-in-out"
      root={{
        style: `--carousel-items: ${itemsPerView}; transform: translateX(calc(var(--carousel-index, 0) * -100% / var(--carousel-items, 1)))`,
      }}
      stateStyleBindings={[{ key: stateKey, styleProp: "--carousel-index", defaultValue: "0" }]}
      canDelete={true}
      canEditName={true}
    >
      {slides}
    </Element>,
    <Element
      key="prev"
      is={Button}
      custom={{ displayName: "Previous" }}
      text=""
      icon={{ value: "ref-icon:tb/TbChevronLeft", only: true, size: "w-6 h-6" }}
      className="bg-base-100/80 text-base-content hover:bg-base-100 absolute top-1/2 left-2 z-10 -translate-y-1/2 rounded-full p-2 shadow-md transition-colors"
      action={[
        {
          type: "decrement-state",
          key: stateKey,
          step: 1,
          min: 0,
          max: slidesCount - 1,
          wrap: true,
          trigger: "click",
        },
      ]}
      canDelete={true}
      canEditName={true}
    />,
    <Element
      key="next"
      is={Button}
      custom={{ displayName: "Next" }}
      text=""
      icon={{ value: "ref-icon:tb/TbChevronRight", only: true, size: "w-6 h-6" }}
      className="bg-base-100/80 text-base-content hover:bg-base-100 absolute top-1/2 right-2 z-10 -translate-y-1/2 rounded-full p-2 shadow-md transition-colors"
      action={[
        {
          type: "increment-state",
          key: stateKey,
          step: 1,
          min: 0,
          max: slidesCount - 1,
          wrap: true,
          trigger: "click",
        },
      ]}
      canDelete={true}
      canEditName={true}
    />,
    <Element
      key="dots"
      canvas
      is={Container}
      custom={{ displayName: "Dots" }}
      className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2"
      canDelete={true}
      canEditName={true}
    >
      {dots}
    </Element>,
  ];
}
