/**
 * Attach an IntersectionObserver that flips `.ph-in-view` on paused
 * `.ph-anim-scroll` elements when they scroll into the viewport.
 *
 * Two modes — pick based on whether `root` itself can be clipped by an
 * `overflow:hidden` ancestor:
 *
 *  - `"per-element"` (default): observe every `.ph-anim-scroll` descendant
 *    individually. Right for full-page renders where elements aren't trapped
 *    inside a clipping box. The static-renderer's inlined runtime uses this.
 *
 *  - `"bulk-on-root"`: observe `root` itself; when `root` intersects, flip
 *    `.ph-in-view` on every descendant at once. Right for clipped previews
 *    (e.g. the `aspect-[4/3] overflow-hidden` template tiles on /templates,
 *    where most descendants sit outside the card's clip box and per-element
 *    IO reports `isIntersecting:false` permanently).
 *
 * Returns a `disconnect` callback so React effects can unmount cleanly.
 */
export function attachScrollAnimObserver(
  root: HTMLElement,
  mode: "per-element" | "bulk-on-root" = "per-element"
): () => void {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    root.querySelectorAll(".ph-anim-scroll").forEach(el => el.classList.add("ph-in-view"));
    return () => {};
  }

  if (mode === "bulk-on-root") {
    const io = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            root
              .querySelectorAll(".ph-anim-scroll")
              .forEach(el => el.classList.add("ph-in-view"));
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1 }
    );
    io.observe(root);
    return () => io.disconnect();
  }

  const io = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("ph-in-view");
          io.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.1 }
  );
  root.querySelectorAll(".ph-anim-scroll").forEach(el => io.observe(el));
  return () => io.disconnect();
}
