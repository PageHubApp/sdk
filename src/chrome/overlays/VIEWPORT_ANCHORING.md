# Viewport vs body anchored UI

**Body-fixed popovers** (toolbar dropdowns, context submenus, Clippy menus) use `useAnchoredPopover` with `strategy: "fixed"` and portaling to `document.body`.

**Canvas-relative toolbars** ([`PortalToolbarBelowNode`](../Tools/InlineEditToolbar/PortalToolbarBelowNode.tsx)) stay on their own path: they portal into `#viewport`, use absolute coordinates against the scroll container, and handle vertical flip with scroll/MutationObserver. That is intentional until a Floating UI setup with a viewport boundary and virtual reference is proven equivalent in QA.

**Horizontal clamp inside the canvas** ([`useClampToViewport`](./useClampToViewport.ts)) only adjusts `translateX` so controls that already live in viewport space do not clip off the left/right edges. It is not a second global popover stack.
