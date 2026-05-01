/** Image — modifiers extracted from Image.craft.tsx. */
import type { ComponentModifier } from "../../define/types";

export const imageModifiers: ComponentModifier[] = [
      // Shape (using design tokens)
      {
        name: "rounded-box",
        label: "Rounded",
        category: "Shape",
        description: "Rounded corners matching the design system border-radius token",
        exclusive: true,
      },
      {
        name: "rounded-field",
        label: "Slight Round",
        category: "Shape",
        description: "Subtle rounding — softer than sharp but less than full rounded-box",
        exclusive: true,
      },
      {
        name: "rounded-full",
        label: "Circle",
        category: "Shape",
        description: "Fully circular crop — works best with a square aspect ratio",
        exclusive: true,
      },
      {
        name: "rounded-none",
        label: "Sharp",
        category: "Shape",
        description: "No border-radius — hard square corners",
        exclusive: true,
      },
      // Fit
      {
        name: "object-cover",
        label: "Cover",
        category: "Fit",
        description: "Crops to fill the container, maintaining aspect ratio — most common choice",
        exclusive: true,
      },
      {
        name: "object-contain",
        label: "Contain",
        category: "Fit",
        description:
          "Fits entirely within bounds without cropping — may leave empty space at sides",
        exclusive: true,
      },
      {
        name: "object-fill",
        label: "Fill",
        category: "Fit",
        description: "Stretches to fill the container — may distort the image",
        exclusive: true,
      },
      // Aspect ratio
      {
        name: "aspect-square",
        label: "Square",
        category: "Aspect",
        description: "Forces a 1:1 square crop",
        exclusive: true,
      },
      {
        name: "aspect-video",
        label: "Video (16:9)",
        category: "Aspect",
        description: "Forces a 16:9 widescreen crop — good for video thumbnails and banners",
        exclusive: true,
      },
      {
        name: "aspect-[4/3]",
        label: "4:3",
        category: "Aspect",
        description: "Classic 4:3 ratio — traditional photo and presentation format",
        exclusive: true,
      },
      {
        name: "aspect-[3/2]",
        label: "3:2",
        category: "Aspect",
        description:
          "Standard photography ratio — natural proportions for portraits and product shots",
        exclusive: true,
      },
      // Mask shapes
      {
        name: "mask mask-squircle",
        label: "Squircle",
        category: "Mask",
        description:
          "Rounded square (squircle) crop — softer than a circle, more distinctive than rounded-box",
        exclusive: true,
      },
      {
        name: "mask mask-hexagon",
        label: "Hexagon",
        category: "Mask",
        description: "Hexagon-shaped crop — good for team member avatars and icon grids",
        exclusive: true,
      },
      {
        name: "mask mask-diamond",
        label: "Diamond",
        category: "Mask",
        description: "Rotated square (diamond) crop",
        exclusive: true,
      },
      {
        name: "mask mask-heart",
        label: "Heart",
        category: "Mask",
        description: "Heart-shaped crop",
        exclusive: true,
      },
      // Effects
      {
        name: "shadow-lg",
        label: "Shadow",
        category: "Effect",
        description: "Soft drop shadow — adds depth",
      },
      {
        name: "shadow-2xl",
        label: "Deep Shadow",
        category: "Effect",
        description: "Large, dramatic drop shadow — stronger depth effect",
      },
      {
        name: "ring-2 ring-primary",
        label: "Ring",
        category: "Effect",
        description: "Colored border ring in the primary brand color",
      },
      {
        name: "grayscale",
        label: "Grayscale",
        category: "Effect",
        description: "Converts the image to black and white",
      },
      {
        name: "opacity-80",
        label: "Faded",
        category: "Effect",
        description: "Reduces opacity to 80% — creates a subtle de-emphasized look",
      },
];
