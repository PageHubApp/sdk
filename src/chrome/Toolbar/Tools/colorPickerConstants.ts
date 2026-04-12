/** Standard shades shared by all Tailwind color groups */
const STANDARD_SHADES = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
];

/** All Tailwind color groups with their shade ranges */
export const TAILWIND_COLORS = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
].map(name => ({ name, shades: STANDARD_SHADES }));

/** Special non-shade colors */
export const SPECIAL_COLORS = [
  { name: "White", value: "white", hex: "#ffffff" },
  { name: "Black", value: "black", hex: "#000000" },
  { name: "Transparent", value: "transparent", hex: "transparent" },
];
