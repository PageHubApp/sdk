/** Container catalog — image gallery presets (Group, Grid, Masonry, Marquee, Carousel, Hero). */
import {
  TbCarouselHorizontal,
  TbColumns2,
  TbInfinity,
  TbLayoutGrid,
  TbPhoto,
  TbSlideshow,
} from "react-icons/tb";
import type { ComponentPreset } from "../../../../define/types";
import {
  buildCarouselChildren,
  buildMarqueeChildren,
  buildSimpleImageChildren,
} from "../gallery";

export const imagePresets: ComponentPreset[] = [
  {
    label: "Image Group",
    description: "A row of pictures sitting next to each other.",
    icon: TbPhoto,
    category: "Images",
    props: {
      className: "flex flex-row items-center gap-space-sm w-full",
    },
    children: buildSimpleImageChildren,
  },
  {
    label: "Image Grid",
    description: "A grid of pictures with equal-width columns.",
    icon: TbLayoutGrid,
    category: "Images",
    props: {
      className: "grid grid-cols-3 gap-space-sm w-full",
    },
    children: buildSimpleImageChildren,
  },
  {
    label: "Image Masonry",
    description: "A staggered Pinterest-style column layout.",
    icon: TbColumns2,
    category: "Images",
    props: {
      className: "columns-3 gap-space-sm w-full [&>*]:mb-space-sm [&>*]:break-inside-avoid",
    },
    children: buildSimpleImageChildren,
  },
  {
    label: "Image Marquee",
    description: "Pictures scrolling sideways in an endless loop.",
    icon: TbInfinity,
    category: "Images",
    props: {
      className: "flex w-full overflow-hidden hover:[animation-play-state:paused]",
      root: { animation: "cssMarquee" },
    },
    children: buildMarqueeChildren,
  },
  {
    label: "Image Carousel",
    description: "A slideshow with prev/next arrows and dots.",
    icon: TbCarouselHorizontal,
    category: "Images",
    props: {
      className: "relative overflow-hidden w-full rounded-box",
    },
    children: () => buildCarouselChildren({ hero: false }),
  },
  {
    label: "Image Hero",
    description: "A full-width slideshow showing one big image at a time.",
    icon: TbSlideshow,
    category: "Images",
    props: {
      className: "relative overflow-hidden w-full rounded-box",
    },
    children: () => buildCarouselChildren({ hero: true }),
  },
];
