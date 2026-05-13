/**
 * Tiny inline SVG stubs for body-file empty-state placeholders.
 *
 * Body files used to import `react-icons/tb` for editor placeholder icons.
 * Even though those JSX paths only render in editor mode, Webpack can't
 * statically prove the branch is dead — so the entire `react-icons/tb`
 * barrel (~360 icons, 164KB) shipped to every viewer page.
 *
 * Importing from this file instead keeps the editor visual (a generic
 * 16px placeholder square) without adding `react-icons` to the prod bundle.
 * The real Tabler icons render via `Icon` nodes through the SSR-inline SVG
 * resolver (`packages/sdk/src/utils/icons/serverResolve.ts`).
 */
import React from "react";

const baseProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// Generic placeholder. All component bodies share this — we never expose
// fine-grained icons in editor empty states; the panel chrome handles that.
const Placeholder = (props: React.SVGProps<SVGSVGElement>) => (
  <svg {...baseProps} {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
  </svg>
);

export const TbArrowDown = Placeholder;
export const TbContainer = Placeholder;
export const TbNote = Placeholder;
export const TbMusic = Placeholder;
export const TbPointer = Placeholder;
export const TbCode = Placeholder;
export const TbIcons = Placeholder;
export const TbCheck = Placeholder;
export const TbPhoto = Placeholder;
export const TbMapPin = Placeholder;
export const TbBrandVimeo = Placeholder;
export const TbBrandYoutube = Placeholder;
export const TbPlayerPlay = Placeholder;
export const TbVideo = Placeholder;
