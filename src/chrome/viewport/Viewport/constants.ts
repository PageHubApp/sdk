/** Tailwind canvas breakpoints in monotonic order — used for marker drag clamping. */
export const breakpointMarkerOrder = ["sm", "md", "lg", "xl", "2xl"] as const;
export type BpKey = (typeof breakpointMarkerOrder)[number];

/**
 * Non-draggable device reference guides — informational only ("this is iPhone width").
 * Not breakpoints, not editable. Toggled via `ShowDeviceGuidesAtom`.
 */
export const DEVICE_GUIDES = [
  { id: "iphone-se", label: "iPhone SE", width: 375 },
  { id: "iphone-14", label: "iPhone 14", width: 390 },
  { id: "iphone-pro-max", label: "iPhone Pro Max", width: 430 },
  { id: "ipad", label: "iPad", width: 768 },
  { id: "ipad-pro", label: "iPad Pro", width: 1024 },
  { id: "macbook", label: "MacBook", width: 1440 },
] as const;
