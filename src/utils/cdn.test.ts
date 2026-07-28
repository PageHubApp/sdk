import test from "node:test";
import assert from "node:assert/strict";
import { deriveImageSizes } from "./cdn";

// `deriveImageSizes` is the linchpin of responsive delivery: a wrong `sizes`
// makes the browser pick the wrong srcset candidate in either direction
// (oversized logo, blurry hero). These cases lock the two commonest layouts
// that the old matcher got wrong, plus grid/fraction/max-w handling.
const cases: Array<{ name: string; cn: string; parent?: string; expect: string }> = [
  // Height-capped logos → small px cap, NOT the 100vw/50vw/33vw fallback.
  { name: "logo h-10 w-auto", cn: "h-10 w-auto object-contain", expect: "160px" },
  { name: "logo h-10 (no width)", cn: "h-10 object-contain", expect: "160px" },
  { name: "logo h-8 w-auto", cn: "h-8 w-auto", expect: "128px" },
  { name: "logo responsive height", cn: "h-8 md:h-12 w-auto", expect: "(min-width: 768px) 192px, 128px" },

  // Full-bleed hero → 100vw at every width (old code returned 33vw desktop → blur).
  { name: "full-bleed hero", cn: "w-full h-full absolute inset-0 object-cover", expect: "100vw" },
  { name: "w-full fixed height", cn: "w-full h-[500px] object-cover", expect: "100vw" },
  { name: "split hero w-full lg:w-1/2", cn: "w-full lg:w-1/2 h-[500px]", expect: "(min-width: 1024px) 50vw, 100vw" },

  // Fixed / fractional / arbitrary widths.
  { name: "fixed w-64", cn: "w-64 h-64 rounded-box", expect: "256px" },
  { name: "fraction w-1/3", cn: "w-1/3 h-40", expect: "33vw" },
  { name: "arbitrary w-[400px]", cn: "w-[400px] h-40", expect: "400px" },
  { name: "max-w clamp", cn: "w-full max-w-lg", expect: "min(100vw, 512px)" },

  // Grid-column context divides the viewport width per column.
  {
    name: "card in responsive grid",
    cn: "w-full h-48",
    parent: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4",
    expect: "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  },
  {
    name: "height-only image in grid (not a logo)",
    cn: "h-48 object-cover",
    parent: "grid grid-cols-2 md:grid-cols-4",
    expect: "(min-width: 768px) 25vw, 50vw",
  },

  // Unknown layout → safe over-fetch (100vw), never the blur-prone 33vw.
  { name: "no signal defaults to 100vw", cn: "rounded-box object-cover", expect: "100vw" },
];

for (const c of cases) {
  test(`deriveImageSizes: ${c.name}`, () => {
    assert.equal(deriveImageSizes(c.cn, c.parent), c.expect);
  });
}
