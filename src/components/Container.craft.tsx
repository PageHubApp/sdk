/** Container — Component definition via defineComponent(). */
import React from "react";
import { Element } from "@craftjs/core";
import {
  TbAlertTriangle,
  TbAppWindow,
  TbBadge,
  TbBrandTwitter,
  TbChartBar,
  TbChevronDown,
  TbContainer,
  TbCookie,
  TbLayoutColumns,
  TbLayoutList,
  TbLayoutNavbar,
  TbLayoutRows,
  TbList,
  TbListCheck,
  TbListNumbers,
  TbMinus,
  TbCarouselHorizontal,
  TbColumns2,
  TbInfinity,
  TbLayoutGrid,
  TbPhoto,
  TbPill,
  TbSection,
  TbSlideshow,
  TbSpace,
  TbStack2,
  TbTable,
  TbUserCircle,
} from "react-icons/tb";
const ContainerMainTab = React.lazy(() =>
  import("../chrome/toolbar/unified-settings/mainTabs/ContainerMainTab").then(mod => ({
    default: mod.ContainerMainTab,
  }))
);
const HeaderFooterToggles = React.lazy(() =>
  import("../chrome/toolbar/unified-settings/mainTabs/ContainerMainTab").then(mod => ({
    default: mod.HeaderFooterToggles,
  }))
);
import { defineComponent } from "../define";
import { migrateActions } from "../utils/action";
import {
  ariaAttrs,
  getInlineStyle,
  handlerAttrs,
  staticClasses,
  tag,
  type ToHTMLFn,
} from "../utils/static-html";
import { Button } from "./Button";
import { Container } from "./Container";
const ContainerPaddingOverlay = React.lazy(() =>
  import("../chrome/canvas/ContainerPaddingOverlay").then(mod => ({
    default: mod.ContainerPaddingOverlay,
  }))
);
import { Icon } from "./Icon";
import { layoutCanvasCanMoveIn } from "./layoutCanvasCanMoveIn";
import { Text } from "./Text";
import { Image } from "./Image";

export const toHTML: ToHTMLFn = (props, children, ctx) => {
  if (props.type === "component" || props.type === "componentCanvas") return "";

  let t = "div";
  if (props.type === "page") t = "article";
  else if (props.type === "section") t = "section";
  else if (props.type === "header") t = "header";
  else if (props.type === "footer") t = "footer";
  else if (props.type === "nav") t = "nav";
  else if (props.type === "aside") t = "aside";
  else if (props.type === "main") t = "main";
  else if (props.type === "form") t = "form";
  else if (props.type === "details") t = "details";
  else if (props.type === "summary") t = "summary";
  else if (props.type === "label") t = "label";
  else if (
    props.type === "ul" ||
    props.type === "ol" ||
    props.type === "li" ||
    props.type === "table" ||
    props.type === "thead" ||
    props.type === "tbody" ||
    props.type === "tfoot" ||
    props.type === "tr" ||
    props.type === "td" ||
    props.type === "th"
  )
    t = props.type;

  const attrs: Record<string, any> = {
    class: staticClasses(props, ctx) || undefined,
    style: getInlineStyle(props) || undefined,
    id: props.id || props.anchor || undefined,
    ...ariaAttrs(props),
    ...handlerAttrs(props),
    action: t === "form" ? props.action || "" : undefined,
    method: t === "form" ? props.method || "POST" : undefined,
    open: t === "details" && props.open ? "" : undefined,
    "data-tab-group": props.tabGroup || undefined,
  };
  if (props.attrs && typeof props.attrs === "object") {
    for (const [k, v] of Object.entries(props.attrs)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        attrs[k] = v as any;
      }
    }
  }

  // Stamp load-trigger show actions for the static-export bootstrap script
  // (PH_LOAD_ACTION_SCRIPT). The script reveals `[data-ph-load-show]`
  // elements on first visit (gated by optional `conditions`). React routes
  // don't need this — Container's mount effect dispatches the same actions
  // via `fireLoadAction`. `migrateActions` handles every action prop shape
  // (single object, array, legacy `props.actions`) and runs the same
  // legacy-field migration the runtime uses, so the static stamp can never
  // diverge from runtime semantics.
  // Stamp load-trigger set-state actions so PH_LOAD_ACTION_SCRIPT can seed
  // `window.__PH_STATE__` pre-hydration. Multiple set-states on one node are
  // emitted as a JSON array. Mirrors the show-hide stamp below.
  const loadStateWrites: Array<{ key: string; value: string; kind?: string }> = [];
  for (const la of migrateActions(props)) {
    if (la.type !== "show-hide") {
      if ((la as any).trigger === "load" && la.type === "set-state") {
        const ss = la as any;
        if (ss.key) {
          loadStateWrites.push({
            key: ss.key,
            value: ss.value ?? "",
            ...(ss.kind ? { kind: ss.kind } : {}),
          });
          ctx.hasLoadActions = true;
        }
      }
      continue;
    }
    if (la.trigger !== "load") continue;
    if (la.direction !== "show") continue;
    // Only stamp the target element. If it's not this node, skip — the
    // target Container's own toHTML pass will stamp itself when walked.
    const targetId = props.id || props.anchor;
    if (la.target !== targetId) continue;
    attrs["data-ph-load-show"] = "";
    if (la.method === "style") attrs["data-ph-load-method"] = "style";
    if (Array.isArray(la.conditions) && la.conditions.length > 0) {
      attrs["data-ph-load-conditions"] = JSON.stringify(la.conditions);
    }
    ctx.hasLoadActions = true;
  }
  if (loadStateWrites.length > 0) {
    attrs["data-ph-load-set-state"] = JSON.stringify(loadStateWrites);
  }

  // Horizontal scroll section: wrap children in sticky viewport + flex track
  if (props.scrollEffect === "horizontal-scroll") {
    attrs["data-scroll-effect"] = "horizontal-scroll";
    attrs["data-scroll-direction"] = props.scrollDirection || "ltr";
    attrs["data-scroll-speed"] = String(props.scrollSpeed ?? 1.5);
    attrs["data-scroll-smoothing"] = String(props.scrollSmoothing ?? 0.8);
    attrs["data-scroll-snap"] = String(!!props.scrollSnap);
    ctx.classes.add("ph-hscroll");
    const inner =
      `<div class="ph-hscroll-sticky" style="height:100vh;overflow:hidden">` +
      `<div class="ph-hscroll-track" style="display:flex;height:100%;will-change:transform">${children}</div>` +
      `</div>`;
    return tag(t, attrs, inner);
  }

  // Scroll timeline section: pin + per-child animations via data attributes
  if (props.scrollEffect === "scroll-timeline") {
    attrs["data-scroll-effect"] = "scroll-timeline";
    attrs["data-scroll-runway"] = String(props.scrollTimelineRunway ?? 3);
    attrs["data-scroll-smoothing"] = String(props.scrollSmoothing ?? 0.8);
    ctx.classes.add("ph-scroll-timeline");
    return tag(t, attrs, children);
  }

  const overflow = props.overflow || {};
  const overflowUx =
    (overflow.dragScroll || overflow.autoHide) && props.scrollEffect !== "horizontal-scroll";
  if (overflowUx) {
    const baseClass = attrs.class || "";
    if (!/\boverflow-x-[^\s]+/.test(baseClass)) {
      attrs.class = [baseClass, "overflow-x-auto"].filter(Boolean).join(" ");
      ctx.classes.add("overflow-x-auto");
    }
    ctx.classes.add("ph-overflow-site");
    if (overflow.dragScroll) {
      attrs["data-ph-overflow-drag"] = "";
      const rawS = overflow.smoothing;
      const n = typeof rawS === "number" ? rawS : typeof rawS === "string" ? parseFloat(rawS) : NaN;
      const sm = Number.isNaN(n) ? 0 : Math.min(0.5, Math.max(0, n));
      if (sm > 0) attrs["data-ph-overflow-smooth"] = String(sm);
    }
    if (overflow.autoHide) {
      attrs["data-ph-overflow-autohide"] = "";
      ctx.classes.add("ph-overflow-hide-native-scrollbar");
      attrs.class = [attrs.class, "ph-overflow-hide-native-scrollbar"].filter(Boolean).join(" ");
    }
    if (overflow.dragScroll && overflow.wheelHorizontal !== false) {
      attrs["data-ph-overflow-wheel"] = "";
    }
    attrs["data-ph-overflow-hide-delay"] = String(overflow.hideDelay ?? 1000);
  }

  return tag(t, attrs, children);
};

function buildSectionChildren() {
  return [
    <Element
      key="content"
      canvas
      is={Container}
      custom={{ displayName: "Content" }}
      canDelete={true}
      canEditName={true}
      className="gap-space-md max-w-page mx-auto flex w-full flex-col"
    />,
  ];
}

// ─── List / Table preset helpers ───
// All List/Table presets are plain Containers using props.type to set the
// semantic HTML tag (ul/ol/li/table/tr/td/th/tbody/thead/tfoot). The legacy
// List/ListItem/Table* components were removed in favor of Container.

function buildBulletedListChildren() {
  const items = ["First point", "Second point", "Third point"];
  return items.map((label, i) => (
    <Element
      key={`item-${i}`}
      canvas
      is={Container}
      type="li"
      custom={{ displayName: `Item ${i + 1}` }}
      canDelete={true}
      canEditName={true}
    >
      <Element
        is={Text}
        custom={{ displayName: "Text" }}
        text={`<p>${label}</p>`}
        canDelete={true}
        canEditName={true}
      />
    </Element>
  ));
}

function buildNumberedListChildren() {
  return buildBulletedListChildren();
}

function buildChecklistChildren() {
  const items = ["First item", "Second item", "Third item"];
  return items.map((label, i) => (
    <Element
      key={`item-${i}`}
      canvas
      is={Container}
      type="li"
      custom={{ displayName: `Item ${i + 1}` }}
      className="flex flex-row items-start gap-space-xs"
      canDelete={true}
      canEditName={true}
    >
      <Element
        is={Icon}
        custom={{ displayName: "Marker" }}
        value="ref-icon:tb/TbCheck"
        className="text-primary h-5 w-5 shrink-0"
        canDelete={true}
        canEditName={true}
      />
      <Element
        is={Text}
        custom={{ displayName: "Text" }}
        text={`<p>${label}</p>`}
        className="min-w-0 flex-1"
        canDelete={true}
        canEditName={true}
      />
    </Element>
  ));
}

function buildTableCell(displayName: string, text: string, isHeader: boolean) {
  return (
    <Element
      canvas
      is={Container}
      type={isHeader ? "th" : "td"}
      custom={{ displayName }}
      className={
        isHeader
          ? "border-base-300 border-b px-space-sm py-space-xs text-left font-semibold"
          : "border-base-300 border-b px-space-sm py-space-xs"
      }
      attrs={isHeader ? { scope: "col" } : undefined}
      canDelete={true}
      canEditName={true}
    >
      <Element
        is={Text}
        custom={{ displayName: "Text" }}
        text={`<p>${text}</p>`}
        canDelete={true}
        canEditName={true}
      />
    </Element>
  );
}

function buildTableChildren() {
  return [
    <Element
      key="thead"
      canvas
      is={Container}
      type="thead"
      custom={{ displayName: "Head" }}
      canDelete={true}
      canEditName={true}
    >
      <Element
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Header", "Column A", true)}
        {buildTableCell("Header", "Column B", true)}
        {buildTableCell("Header", "Column C", true)}
      </Element>
    </Element>,
    <Element
      key="tbody"
      canvas
      is={Container}
      type="tbody"
      custom={{ displayName: "Body" }}
      canDelete={true}
      canEditName={true}
    >
      <Element
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row 1" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Cell", "Row 1, A", false)}
        {buildTableCell("Cell", "Row 1, B", false)}
        {buildTableCell("Cell", "Row 1, C", false)}
      </Element>
      <Element
        canvas
        is={Container}
        type="tr"
        custom={{ displayName: "Row 2" }}
        canDelete={true}
        canEditName={true}
      >
        {buildTableCell("Cell", "Row 2, A", false)}
        {buildTableCell("Cell", "Row 2, B", false)}
        {buildTableCell("Cell", "Row 2, C", false)}
      </Element>
    </Element>,
  ];
}

function buildAvatarChildren() {
  return [
    <Element
      key="img"
      is={Image}
      custom={{ displayName: "Photo" }}
      canDelete={true}
      canEditName={true}
      className="h-full w-full object-cover"
    />,
  ];
}

const alertSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

function buildAlertChildren() {
  return [
    <Element
      key="icon"
      is={Text}
      custom={{ displayName: "Icon" }}
      text={`<span class="shrink-0">${alertSvg}</span>`}
      canDelete={true}
      canEditName={true}
    />,
    <Element
      key="text"
      is={Text}
      custom={{ displayName: "Message" }}
      text="<span>This is an important message for your visitors.</span>"
      canDelete={true}
      canEditName={true}
    />,
  ];
}

function buildStatChildren() {
  return [
    <Element
      key="value"
      is={Text}
      custom={{ displayName: "Value" }}
      text="2,400+"
      className="font-heading text-primary text-4xl font-bold"
      canDelete={true}
      canEditName={true}
    />,
    <Element
      key="label"
      is={Text}
      custom={{ displayName: "Label" }}
      text="Happy Customers"
      className="text-base-content/60 text-sm"
      canDelete={true}
      canEditName={true}
    />,
  ];
}

// ─── Button-group / nav-strip preset helpers ───
// Plain Container roots with Button children — no wrapper component required.
// 3+ contiguous Buttons trigger the auto-list editor in the toolbar.

const navButtonClassName =
  "px-(--button-padding-x) py-(--button-padding-y) flex-col gap-1.5 items-center justify-center";

const navListClassName =
  "flex flex-row items-center gap-container md:flex md:flex-row md:items-center md:gap-container";

const socialRefIcons = {
  twitter: "ref-icon:fa6/FaXTwitter",
  facebook: "ref-icon:fa6/FaFacebook",
  instagram: "ref-icon:fa6/FaInstagram",
  linkedin: "ref-icon:fa6/FaLinkedin",
  youtube: "ref-icon:fa6/FaYoutube",
} as const;

function buildSocialButtons(filled: boolean) {
  const baseClassName = filled
    ? "px-(--button-padding-x) py-(--button-padding-y) bg-primary text-primary-content rounded-box"
    : "btn btn-ghost";
  const colors: Record<string, string> = filled
    ? {}
    : {
        twitter: "text-[#1DA1F2]",
        facebook: "text-[#1877F2]",
        instagram: "text-[#E4405F]",
        linkedin: "text-[#0A66C2]",
        youtube: "text-[#FF0000]",
      };
  const items = ["twitter", "facebook", "instagram", "linkedin"] as const;
  const all = filled ? items : [...items, "youtube" as const];
  return all.map(name => (
    <Element
      key={name}
      is={Button}
      custom={{ displayName: name.charAt(0).toUpperCase() + name.slice(1) }}
      text={name.charAt(0).toUpperCase() + name.slice(1)}
      icon={{ value: socialRefIcons[name], only: true }}
      url="#"
      className={`${baseClassName}${colors[name] ? ` ${colors[name]}` : ""}`}
      canDelete={true}
      canEditName={true}
    />
  ));
}

function buildPlainNavButtons(withBg: boolean) {
  const names = ["Home", "About", "Services", "Contact"];
  return names.map(name => (
    <Element
      key={name}
      is={Button}
      custom={{ displayName: name }}
      text={name}
      url="#"
      className={
        withBg
          ? `${navButtonClassName} bg-primary text-primary-content rounded-box`
          : navButtonClassName
      }
      canDelete={true}
      canEditName={true}
    />
  ));
}

function buildPillNavButtons() {
  return ["Home", "About", "Contact"].map(name => (
    <Element
      key={name}
      is={Button}
      custom={{ displayName: name }}
      text={name}
      url="#"
      className={`${navButtonClassName} text-primary-content border-0 bg-transparent`}
      canDelete={true}
      canEditName={true}
    />
  ));
}

function buildButtonGroupChildren() {
  // 3 buttons hits the auto-list detector threshold immediately, so the
  // toolbar shows the Buttons list editor as soon as the preset is dropped.
  return ["Button 1", "Button 2", "Button 3"].map((text, i) => (
    <Element
      key={i}
      is={Button}
      custom={{ displayName: text }}
      text={text}
      url="#"
      className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold"
      canDelete={true}
      canEditName={true}
    />
  ));
}

// ─── Image gallery preset helpers ───
// All Image presets are plain Containers + Image children. The auto-list
// detector renders the add/remove/reorder editor in the toolbar when there
// are 3+ contiguous Image children. Marquee + carousel use animation /
// state primitives (no per-component runtime).

function buildSimpleImageChildren() {
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

function buildMarqueeChildren() {
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

function buildCarouselChildren(opts: { hero: boolean }) {
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

function buildModalChildren() {
  // Generate a unique anchor per insert so dropping multiple Modal presets on
  // one page doesn't collide. Trigger and backdrop share this closure value.
  const anchor = `modal-${Math.random().toString(36).slice(2, 8)}`;
  return [
    <Element
      key="trigger"
      is={Button}
      custom={{ displayName: "Open Modal" }}
      text="Open Modal"
      url=""
      action={{
        type: "show-hide",
        target: anchor,
        direction: "show",
        trigger: "click",
        method: "class",
      }}
      className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold"
    />,
    <Element
      key="overlay"
      canvas
      is={Container}
      custom={{ displayName: "Modal Backdrop" }}
      canDelete={true}
      canEditName={true}
      anchor={anchor}
      className="fixed top-0 left-0 z-[1200] hidden h-screen w-screen flex-col items-center justify-center bg-black/50 px-4 py-4"
      action={
        {
          type: "show-hide",
          target: anchor,
          direction: "hide",
          trigger: "click",
          method: "class",
        } as any
      }
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Modal Content" }}
        canDelete={true}
        canEditName={true}
        className="gap-container px-container-x py-container-y bg-base-100 rounded-box relative flex w-full max-w-lg flex-col shadow-xl"
        handlers={{ onClick: "event.stopPropagation()" }}
      >
        <Element
          is={Text}
          custom={{ displayName: "Title" }}
          tagName="h3"
          text='<h3 class="text-xl font-bold font-heading">Modal Title</h3>'
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Text}
          custom={{ displayName: "Body" }}
          text='<p class="text-base-content/80">Your modal content goes here.</p>'
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Close" }}
          text="Got it"
          url=""
          action={{
            type: "show-hide",
            target: anchor,
            direction: "hide",
            trigger: "click",
            method: "class",
          }}
          className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 self-end font-semibold"
        />
      </Element>
    </Element>,
  ];
}

function buildTabsChildren() {
  // Unique group + panel ids per insert so multiple Tabs presets on one page
  // don't collide. Buttons compose two actions on click: `show-hide` direction
  // tab swaps which panel is visible; `set-state` writes the selected panel
  // id under the group key so the active-styling stateModifier on each button
  // can read it. The first panel fires a load-trigger `set-state` so the
  // registry seeds before first paint — no flash of "no tab active".
  const suffix = Math.random().toString(36).slice(2, 8);
  const group = `tabs-${suffix}`;
  const panel = (i: number) => `tab-${suffix}-${i}`;
  const tabBtn = (i: number, label: string) => (
    <Element
      key={`tab-${i}`}
      is={Button}
      custom={{ displayName: `Tab ${i + 1}` }}
      text={label}
      url=""
      action={[
        {
          type: "show-hide",
          target: panel(i),
          direction: "tab",
          trigger: "click",
          method: "class",
          group,
        },
        {
          type: "set-state",
          key: group,
          kind: "selection",
          value: panel(i),
          trigger: "click",
        },
      ]}
      stateModifiers={[
        {
          conditions: [
            {
              logic: "all",
              conditions: [{ type: "state", key: group, operator: "equals", value: panel(i) }],
            },
          ],
          modifiers: ["tab-active"],
        },
      ]}
      className="text-base-content rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium"
    />
  );
  const tabPanel = (i: number, body: string, hidden: boolean) => {
    const isFirst = !hidden;
    const props: Record<string, any> = {
      canvas: true,
      is: Container,
      custom: { displayName: `Tab Panel ${i + 1}` },
      canDelete: true,
      canEditName: true,
      id: panel(i),
      tabGroup: group,
      className: `gap-container px-container-x py-container-y flex flex-col${hidden ? " hidden" : ""}`,
    };
    if (isFirst) {
      props.action = [
        {
          type: "set-state",
          key: group,
          kind: "selection",
          value: panel(i),
          trigger: "load",
        },
      ];
    }
    return (
      <Element key={`panel-${i}`} {...props}>
        <Element
          is={Text}
          custom={{ displayName: "Content" }}
          text={body}
          canDelete={true}
          canEditName={true}
        />
      </Element>
    );
  };
  return [
    <Element
      key="bar"
      canvas
      is={Container}
      custom={{ displayName: "Tab Bar" }}
      canDelete={true}
      canEditName={true}
      className="border-base-300 flex flex-row gap-0 border-b"
    >
      {tabBtn(0, "Overview")}
      {tabBtn(1, "Features")}
      {tabBtn(2, "Pricing")}
    </Element>,
    tabPanel(
      0,
      "<p>Overview content goes here. This is the first tab panel, visible by default.</p>",
      false
    ),
    tabPanel(
      1,
      "<p>Features content goes here. This panel is hidden until Tab 2 is clicked.</p>",
      true
    ),
    tabPanel(
      2,
      "<p>Pricing content goes here. This panel is hidden until Tab 3 is clicked.</p>",
      true
    ),
  ];
}

/**
 * Builds one accordion item — a `<details>` Container with a summary
 * (header + chevron) and a body Container. Factored out so the
 * Accordion preset's `addChild.template` reuses the exact shape.
 *
 * The shared `name` attribute (single-open exclusive toggle) is supplied
 * by the caller — the initial 3-item drop uses one shared group; new
 * items appended later inherit the same group via the wrapper's first
 * child for consistency, but the simplest correct path is to always
 * generate a fresh group when the user drops the preset and let new
 * items reuse that string. The wrapper's modifier (`accordion-slide-fade`)
 * carries the animation regardless.
 */
function buildAccordionItem(opts: {
  index: number;
  groupName: string;
  question: string;
  answer: string;
  open?: boolean;
}) {
  const { index, groupName, question, answer, open } = opts;
  return (
    <Element
      key={`item-${index}`}
      canvas
      is={Container}
      custom={{ displayName: `Accordion Item ${index + 1}` }}
      canDelete={true}
      canEditName={true}
      type="details"
      open={open || undefined}
      attrs={{ name: groupName }}
      className="border-base-300 group border-b"
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Header" }}
        canDelete={true}
        canEditName={true}
        type="summary"
        className="flex cursor-pointer list-none flex-row items-center justify-between px-4 py-3 select-none"
      >
        <Element
          is={Text}
          custom={{ displayName: "Title" }}
          text={`<p class="font-medium">${question}</p>`}
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Icon}
          custom={{ displayName: "Chevron" }}
          value="ref-icon:tb/TbChevronDown"
          className="h-5 w-5 transition-transform duration-200 group-open:rotate-180"
          canDelete={true}
          canEditName={true}
        />
      </Element>
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Body" }}
        canDelete={true}
        canEditName={true}
        className="text-base-content/80 px-4 pb-4"
      >
        <Element
          is={Text}
          custom={{ displayName: "Answer" }}
          text={`<p>${answer}</p>`}
          canDelete={true}
          canEditName={true}
        />
      </Element>
    </Element>
  );
}

/** Used for new items appended via the Component-tab "Add Item" affordance. */
function buildAccordionItemTemplate() {
  // Group name doesn't really matter for new items — the existing initial
  // children carry the original group; new items share their open-state
  // exclusivity with siblings only if the user manually copies the `name`
  // attr. Default to a fresh group so the new item starts independent.
  const groupName = `accordion-${Math.random().toString(36).slice(2, 8)}`;
  return buildAccordionItem({
    index: 0,
    groupName,
    question: "New question",
    answer: "Replace this with your answer.",
  });
}

function buildAccordionChildren() {
  // Native <details> + shared `name` attr gives single-open exclusive toggle
  // with zero JS. Drop the `name` attr to allow multiple panels open at once.
  // Container renders `props.type: "details"` → <details>, "summary" → <summary>.
  const groupName = `accordion-${Math.random().toString(36).slice(2, 8)}`;
  return [
    buildAccordionItem({
      index: 0,
      groupName,
      question: "How does the accordion work?",
      answer:
        "Native <details> elements share a name attribute, giving single-open exclusive toggle with zero JavaScript.",
      open: true,
    }),
    buildAccordionItem({
      index: 1,
      groupName,
      question: "Can I have multiple panels open?",
      answer: "Remove the name attr from each item to allow multiple panels open at once.",
    }),
    buildAccordionItem({
      index: 2,
      groupName,
      question: "How do I customize the chevron?",
      answer:
        "Use the Modifiers Modal to author your own animation classes — or swap the Chevron icon to any other ref-icon ref.",
    }),
  ];
}

function buildDropdownChildren() {
  return [
    <Element
      key="trigger"
      is={Button}
      custom={{ displayName: "Dropdown Trigger" }}
      text="Menu"
      url=""
      icon={{ value: "ref-icon:tb/TbChevronDown", position: "right", only: false, size: "w-5 h-5" }}
      canDelete={true}
      canEditName={true}
      className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold"
    />,
    <Element
      key="panel"
      canvas
      is={Container}
      custom={{ displayName: "Dropdown Panel" }}
      canDelete={true}
      canEditName={true}
      handlers={{
        onClick:
          "if (event.currentTarget.closest('[tabindex]')) event.currentTarget.closest('[tabindex]').blur()",
      }}
      className="bg-base-200 text-base-content rounded-box border-base-300 py-space-xs absolute top-full left-0 z-50 mt-1 hidden min-w-48 flex-col overflow-hidden border shadow-lg group-focus-within:flex"
    >
      <Element
        is={Button}
        custom={{ displayName: "Option 1" }}
        text="Option 1"
        url="#"
        canDelete={true}
        canEditName={true}
        className="hover:bg-neutral px-space-sm py-space-xs w-full rounded-none border-0 text-left text-sm"
      />
      <Element
        is={Button}
        custom={{ displayName: "Option 2" }}
        text="Option 2"
        url="#"
        canDelete={true}
        canEditName={true}
        className="hover:bg-neutral px-space-sm py-space-xs w-full rounded-none border-0 text-left text-sm"
      />
      <Element
        is={Button}
        custom={{ displayName: "Option 3" }}
        text="Option 3"
        url="#"
        canDelete={true}
        canEditName={true}
        className="hover:bg-neutral px-space-sm py-space-xs w-full rounded-none border-0 text-left text-sm"
      />
    </Element>,
  ];
}

function buildCookieConsentChildren() {
  // Banner starts hidden via the `hidden` class. A load-trigger show-hide
  // action on the banner itself reveals it on first mount — gated by a
  // `localStorage not-exists` condition so dismissed visitors stay
  // un-bothered. Same condition shape as node visibility / page access;
  // authors can stack additional gates (e.g. `auth.status equals
  // logged-out`) via the Action panel's condition chip-list.
  //
  // Container's mount effect dispatches the action in React routes
  // (/view, /static, custom domains, editor preview); static export ships
  // an inline bootstrap script (PH_LOAD_ACTION_SCRIPT) that evaluates the
  // same conditions client-side.
  //
  // Reject + Accept fire two actions on click: show-hide (snap visually) +
  // set-local-storage (persist key so the load gate matches next visit).
  const anchor = `cookie-consent-${Math.random().toString(36).slice(2, 8)}`;
  const storageKey = `ph-${anchor}`;
  return [
    <Element
      key="banner"
      canvas
      is={Container}
      custom={{ displayName: "Cookie Banner" }}
      canDelete={true}
      canEditName={true}
      anchor={anchor}
      action={{
        type: "show-hide",
        target: anchor,
        direction: "show",
        trigger: "load",
        method: "class",
        conditions: [
          {
            logic: "all",
            conditions: [
              {
                type: "localStorage",
                key: storageKey,
                operator: "not-exists",
                value: "",
              },
            ],
          },
        ],
      }}
      className="bg-base-200 text-base-content fixed right-0 bottom-0 left-0 z-[1100] hidden shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Banner Content" }}
        canDelete={true}
        canEditName={true}
        className="gap-space-sm px-space-md py-space-sm max-w-page mx-auto flex flex-col items-center justify-between sm:flex-row"
      >
        <Element
          is={Text}
          custom={{ displayName: "Consent Text" }}
          tagName="p"
          richText={{ mode: "inline" }}
          text="We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies."
          className="text-base-content/80 text-sm"
          canDelete={true}
          canEditName={true}
        />
        <Element
          canvas
          is={Container}
          custom={{ displayName: "Button Group" }}
          canDelete={true}
          canEditName={true}
          className="gap-space-xs flex shrink-0 flex-row items-center"
        >
          <Element
            is={Button}
            custom={{ displayName: "Reject" }}
            text="Reject"
            url=""
            action={[
              {
                type: "show-hide",
                target: anchor,
                direction: "hide",
                trigger: "click",
                method: "class",
              },
              { type: "set-local-storage", key: storageKey, value: "rejected" },
            ]}
            className="btn btn-ghost btn-sm rounded-box font-medium"
          />
          <Element
            is={Button}
            custom={{ displayName: "Accept" }}
            text="Accept"
            url=""
            action={[
              {
                type: "show-hide",
                target: anchor,
                direction: "hide",
                trigger: "click",
                method: "class",
              },
              { type: "set-local-storage", key: storageKey, value: "accepted" },
            ]}
            className="btn btn-primary btn-sm rounded-box font-medium"
          />
        </Element>
      </Element>
    </Element>,
  ];
}

function buildMobileMenuChildren() {
  // Hamburger + drawer pair only — for adding mobile nav to an existing
  // header without restructuring it. Trigger and drawer share the anchor.
  const anchor = `mnav-${Math.random().toString(36).slice(2, 8)}`;
  return [
    <Element
      key="hamburger"
      is={Button}
      custom={{ displayName: "Hamburger" }}
      text="Open menu"
      url=""
      icon={{ value: "ref-icon:tb/TbMenu2", only: true, size: "w-7 h-7" }}
      action={[
        {
          type: "show-hide",
          target: anchor,
          direction: "show",
          trigger: "click",
          method: "class",
        },
      ]}
      className="text-base-content px-space-xs py-space-xs flex items-center justify-center bg-transparent lg:hidden"
      canDelete={true}
      canEditName={true}
    />,
    <Element
      key="drawer"
      canvas
      is={Container}
      custom={{ displayName: "Mobile Drawer" }}
      canDelete={true}
      canEditName={true}
      attrs={{ id: anchor }}
      className="bg-base-100 p-space-lg fixed inset-0 z-[1200] hidden h-full flex-col lg:hidden"
      handlers={{
        onClick:
          "var a = event.target.closest('a, button[data-action]'); if (a) event.currentTarget.classList.add('hidden');",
      }}
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Drawer Header" }}
        canDelete={true}
        canEditName={true}
        className="pb-space-md flex items-center justify-end"
      >
        <Element
          is={Button}
          custom={{ displayName: "Close" }}
          text="Close"
          url=""
          icon={{ value: "ref-icon:tb/TbX", only: true, size: "w-6 h-6" }}
          action={[
            {
              type: "show-hide",
              target: anchor,
              direction: "hide",
              trigger: "click",
              method: "class",
            },
          ]}
          className="text-base-content px-space-xs py-space-xs flex items-center justify-center bg-transparent"
          canDelete={true}
          canEditName={true}
        />
      </Element>
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Drawer Links" }}
        canDelete={true}
        canEditName={true}
        className="gap-space-sm flex flex-col"
      >
        <Element
          is={Button}
          custom={{ displayName: "Link 1" }}
          text="Home"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="text-base-content py-space-sm w-full justify-start text-lg"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Link 2" }}
          text="About"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="text-base-content py-space-sm w-full justify-start text-lg"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Link 3" }}
          text="Contact"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="text-base-content py-space-sm w-full justify-start text-lg"
          canDelete={true}
          canEditName={true}
        />
      </Element>
    </Element>,
  ];
}

function buildNavbarChildren() {
  // Unique anchor per insert so multiple Navbar presets on one page don't
  // collide on the mobile drawer's show-hide id.
  const anchor = `nav-${Math.random().toString(36).slice(2, 8)}`;
  return [
    <Element
      key="nav"
      canvas
      is={Container}
      custom={{ displayName: "Navbar" }}
      type="nav"
      canDelete={true}
      canEditName={true}
      className="px-container-x py-space-sm bg-base-100 flex w-full items-center justify-between"
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Logo" }}
        canDelete={true}
        canEditName={true}
        className="gap-space-sm flex flex-row items-center"
      >
        <Element
          canvas
          is={Container}
          custom={{ displayName: "Logo Mark" }}
          canDelete={true}
          canEditName={true}
          className="bg-primary flex h-10 w-10 items-center justify-center rounded-md"
        >
          <Element
            is={Icon}
            custom={{ displayName: "Mark Icon" }}
            value="ref-icon:tb/TbBolt"
            className="text-primary-content h-6 w-6"
            canDelete={true}
            canEditName={true}
          />
        </Element>
        <Element
          is={Text}
          custom={{ displayName: "Wordmark" }}
          tagName="span"
          text='<span class="text-lg font-bold font-heading">Brand</span>'
          canDelete={true}
          canEditName={true}
        />
      </Element>
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Desktop Links" }}
        canDelete={true}
        canEditName={true}
        className="gap-space-md hidden items-center lg:flex"
      >
        <Element
          is={Button}
          custom={{ displayName: "Link 1" }}
          text="Home"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="text-base-content hover:text-primary"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Link 2" }}
          text="Features"
          url=""
          action={[{ type: "link", href: "#features" }]}
          className="text-base-content hover:text-primary"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Link 3" }}
          text="Pricing"
          url=""
          action={[{ type: "link", href: "#pricing" }]}
          className="text-base-content hover:text-primary"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "CTA" }}
          text="Get started"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold"
          canDelete={true}
          canEditName={true}
        />
      </Element>
      <Element
        is={Button}
        custom={{ displayName: "Hamburger" }}
        text="Open menu"
        url=""
        icon={{ value: "ref-icon:tb/TbMenu2", only: true, size: "w-7 h-7" }}
        action={[
          {
            type: "show-hide",
            target: anchor,
            direction: "show",
            trigger: "click",
            method: "class",
          },
        ]}
        className="text-base-content px-space-xs py-space-xs flex items-center justify-center bg-transparent lg:hidden"
        canDelete={true}
        canEditName={true}
      />
    </Element>,
    <Element
      key="drawer"
      canvas
      is={Container}
      custom={{ displayName: "Mobile Drawer" }}
      canDelete={true}
      canEditName={true}
      attrs={{ id: anchor }}
      className="bg-base-100 p-space-lg fixed inset-0 z-[1200] hidden h-full flex-col lg:hidden"
      handlers={{
        onClick:
          "var a = event.target.closest('a, button[data-action]'); if (a) event.currentTarget.classList.add('hidden');",
      }}
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Drawer Header" }}
        canDelete={true}
        canEditName={true}
        className="pb-space-md flex items-center justify-end"
      >
        <Element
          is={Button}
          custom={{ displayName: "Close" }}
          text="Close"
          url=""
          icon={{ value: "ref-icon:tb/TbX", only: true, size: "w-6 h-6" }}
          action={[
            {
              type: "show-hide",
              target: anchor,
              direction: "hide",
              trigger: "click",
              method: "class",
            },
          ]}
          className="text-base-content px-space-xs py-space-xs flex items-center justify-center bg-transparent"
          canDelete={true}
          canEditName={true}
        />
      </Element>
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Drawer Links" }}
        canDelete={true}
        canEditName={true}
        className="gap-space-sm flex flex-col"
      >
        <Element
          is={Button}
          custom={{ displayName: "Link 1" }}
          text="Home"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="text-base-content py-space-sm w-full justify-start text-lg"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Link 2" }}
          text="Features"
          url=""
          action={[{ type: "link", href: "#features" }]}
          className="text-base-content py-space-sm w-full justify-start text-lg"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Link 3" }}
          text="Pricing"
          url=""
          action={[{ type: "link", href: "#pricing" }]}
          className="text-base-content py-space-sm w-full justify-start text-lg"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "CTA" }}
          text="Get started"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="btn btn-primary rounded-box px-space-md py-space-xs mt-space-md min-h-12 font-semibold"
          canDelete={true}
          canEditName={true}
        />
      </Element>
    </Element>,
  ];
}

function buildNavbarMegaChildren() {
  // Mega navbar — desktop nav with one show-hide mega panel + same mobile
  // drawer pattern as the simple navbar. Unique anchor per insert covers
  // both the drawer and the mega panel toggle.
  const drawerAnchor = `nav-${Math.random().toString(36).slice(2, 8)}`;
  const megaAnchor = `mega-${Math.random().toString(36).slice(2, 8)}`;
  return [
    <Element
      key="nav"
      canvas
      is={Container}
      custom={{ displayName: "Navbar (mega)" }}
      type="nav"
      canDelete={true}
      canEditName={true}
      className="px-container-x py-space-sm bg-base-100 relative flex w-full items-center justify-between"
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Logo" }}
        canDelete={true}
        canEditName={true}
        className="gap-space-sm flex flex-row items-center"
      >
        <Element
          canvas
          is={Container}
          custom={{ displayName: "Logo Mark" }}
          canDelete={true}
          canEditName={true}
          className="bg-primary flex h-10 w-10 items-center justify-center rounded-md"
        >
          <Element
            is={Icon}
            custom={{ displayName: "Mark Icon" }}
            value="ref-icon:tb/TbBolt"
            className="text-primary-content h-6 w-6"
            canDelete={true}
            canEditName={true}
          />
        </Element>
        <Element
          is={Text}
          custom={{ displayName: "Wordmark" }}
          tagName="span"
          text='<span class="text-lg font-bold font-heading">Brand</span>'
          canDelete={true}
          canEditName={true}
        />
      </Element>
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Desktop Links" }}
        canDelete={true}
        canEditName={true}
        className="gap-space-md hidden items-center lg:flex"
      >
        <Element
          is={Button}
          custom={{ displayName: "Products" }}
          text="Products"
          url=""
          icon={{ value: "ref-icon:tb/TbChevronDown", position: "right", size: "w-4 h-4" }}
          action={[
            {
              type: "show-hide",
              target: megaAnchor,
              direction: "toggle",
              trigger: "click",
              method: "class",
            },
          ]}
          className="text-base-content hover:text-primary"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Pricing" }}
          text="Pricing"
          url=""
          action={[{ type: "link", href: "#pricing" }]}
          className="text-base-content hover:text-primary"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "CTA" }}
          text="Get started"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="btn btn-primary rounded-box px-space-md py-space-xs min-h-12 font-semibold"
          canDelete={true}
          canEditName={true}
        />
      </Element>
      <Element
        is={Button}
        custom={{ displayName: "Hamburger" }}
        text="Open menu"
        url=""
        icon={{ value: "ref-icon:tb/TbMenu2", only: true, size: "w-7 h-7" }}
        action={[
          {
            type: "show-hide",
            target: drawerAnchor,
            direction: "show",
            trigger: "click",
            method: "class",
          },
        ]}
        className="text-base-content px-space-xs py-space-xs flex items-center justify-center bg-transparent lg:hidden"
        canDelete={true}
        canEditName={true}
      />
      <Element
        key="mega"
        canvas
        is={Container}
        custom={{ displayName: "Mega Panel" }}
        canDelete={true}
        canEditName={true}
        attrs={{ id: megaAnchor }}
        className="bg-base-100 border-base-200 px-container-x py-space-lg absolute top-full right-0 left-0 z-[1100] hidden border-t shadow-xl"
      >
        <Element
          canvas
          is={Container}
          custom={{ displayName: "Mega Grid" }}
          canDelete={true}
          canEditName={true}
          className="gap-space-lg max-w-page mx-auto grid w-full grid-cols-3"
        >
          <Element
            canvas
            is={Container}
            custom={{ displayName: "Column 1" }}
            canDelete={true}
            canEditName={true}
            className="gap-space-xs flex flex-col"
          >
            <Element
              is={Text}
              custom={{ displayName: "Heading" }}
              tagName="h4"
              text='<h4 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Platform</h4>'
              canDelete={true}
              canEditName={true}
            />
            <Element
              is={Button}
              custom={{ displayName: "Link" }}
              text="Editor"
              url=""
              action={[{ type: "link", href: "#" }]}
              className="text-base-content hover:text-primary justify-start"
              canDelete={true}
              canEditName={true}
            />
            <Element
              is={Button}
              custom={{ displayName: "Link" }}
              text="Templates"
              url=""
              action={[{ type: "link", href: "#" }]}
              className="text-base-content hover:text-primary justify-start"
              canDelete={true}
              canEditName={true}
            />
          </Element>
          <Element
            canvas
            is={Container}
            custom={{ displayName: "Column 2" }}
            canDelete={true}
            canEditName={true}
            className="gap-space-xs flex flex-col"
          >
            <Element
              is={Text}
              custom={{ displayName: "Heading" }}
              tagName="h4"
              text='<h4 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Solutions</h4>'
              canDelete={true}
              canEditName={true}
            />
            <Element
              is={Button}
              custom={{ displayName: "Link" }}
              text="Marketing"
              url=""
              action={[{ type: "link", href: "#" }]}
              className="text-base-content hover:text-primary justify-start"
              canDelete={true}
              canEditName={true}
            />
            <Element
              is={Button}
              custom={{ displayName: "Link" }}
              text="Storefront"
              url=""
              action={[{ type: "link", href: "#" }]}
              className="text-base-content hover:text-primary justify-start"
              canDelete={true}
              canEditName={true}
            />
          </Element>
          <Element
            canvas
            is={Container}
            custom={{ displayName: "Column 3" }}
            canDelete={true}
            canEditName={true}
            className="gap-space-xs flex flex-col"
          >
            <Element
              is={Text}
              custom={{ displayName: "Heading" }}
              tagName="h4"
              text='<h4 class="text-sm font-semibold uppercase tracking-wide text-base-content/60">Resources</h4>'
              canDelete={true}
              canEditName={true}
            />
            <Element
              is={Button}
              custom={{ displayName: "Link" }}
              text="Docs"
              url=""
              action={[{ type: "link", href: "#" }]}
              className="text-base-content hover:text-primary justify-start"
              canDelete={true}
              canEditName={true}
            />
            <Element
              is={Button}
              custom={{ displayName: "Link" }}
              text="Blog"
              url=""
              action={[{ type: "link", href: "#" }]}
              className="text-base-content hover:text-primary justify-start"
              canDelete={true}
              canEditName={true}
            />
          </Element>
        </Element>
      </Element>
    </Element>,
    <Element
      key="drawer"
      canvas
      is={Container}
      custom={{ displayName: "Mobile Drawer" }}
      canDelete={true}
      canEditName={true}
      attrs={{ id: drawerAnchor }}
      className="bg-base-100 p-space-lg fixed inset-0 z-[1200] hidden h-full flex-col lg:hidden"
      handlers={{
        onClick:
          "var a = event.target.closest('a, button[data-action]'); if (a) event.currentTarget.classList.add('hidden');",
      }}
    >
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Drawer Header" }}
        canDelete={true}
        canEditName={true}
        className="pb-space-md flex items-center justify-end"
      >
        <Element
          is={Button}
          custom={{ displayName: "Close" }}
          text="Close"
          url=""
          icon={{ value: "ref-icon:tb/TbX", only: true, size: "w-6 h-6" }}
          action={[
            {
              type: "show-hide",
              target: drawerAnchor,
              direction: "hide",
              trigger: "click",
              method: "class",
            },
          ]}
          className="text-base-content px-space-xs py-space-xs flex items-center justify-center bg-transparent"
          canDelete={true}
          canEditName={true}
        />
      </Element>
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Drawer Links" }}
        canDelete={true}
        canEditName={true}
        className="gap-space-sm flex flex-col"
      >
        <Element
          is={Button}
          custom={{ displayName: "Products" }}
          text="Products"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="text-base-content py-space-sm w-full justify-start text-lg"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "Pricing" }}
          text="Pricing"
          url=""
          action={[{ type: "link", href: "#pricing" }]}
          className="text-base-content py-space-sm w-full justify-start text-lg"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Button}
          custom={{ displayName: "CTA" }}
          text="Get started"
          url=""
          action={[{ type: "link", href: "#" }]}
          className="btn btn-primary rounded-box px-space-md py-space-xs mt-space-md min-h-12 font-semibold"
          canDelete={true}
          canEditName={true}
        />
      </Element>
    </Element>,
  ];
}

export const ContainerDef = defineComponent(
  {
    name: "Container",
    component: Container,
    icon: TbContainer,
    category: "Layout",
    canvas: true,
    settings: ContainerMainTab,
    toolbarExtra: <HeaderFooterToggles />,
    toHTML,
    tools: () => [<ContainerPaddingOverlay key="padding-overlay" />],
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: (node, into) => layoutCanvasCanMoveIn(node, into),
    },
    presets: [
      {
        label: "Section",
        icon: TbSection,
        description: "A full-width strip of the page with built-in padding.",
        props: {
          type: "section",
          className:
            "bg-base-100 text-base-content w-full flex flex-col items-center py-space-lg px-container-x",
        },
        children: buildSectionChildren,
      },
      {
        label: "Row",
        icon: TbLayoutColumns,
        description: "Lay things side-by-side in a row.",
        props: {
          className: "flex flex-row flex-wrap gap-space-md items-start min-w-0 w-full",
        },
      },
      {
        label: "Column",
        icon: TbLayoutRows,
        description: "Stack things on top of each other in a column.",
        props: { className: "flex flex-col gap-space-md w-full" },
      },
      // ─── Pseudo-component presets (live in other toolbox categories) ───
      {
        label: "Badge",
        description: "A tiny pill for tags, status, or labels.",
        icon: TbBadge,
        category: "Components",
        props: { className: "badge badge-primary font-medium self-start" },
        children: () => [
          <Element
            key="label"
            is={Text}
            custom={{ displayName: "Label" }}
            text="New"
            canDelete={true}
            canEditName={true}
          />,
        ],
      },
      {
        label: "Avatar",
        description: "A round photo for profile or team headshots.",
        icon: TbUserCircle,
        category: "Components",
        props: { className: "w-16 h-16 rounded-full overflow-hidden shrink-0" },
        children: buildAvatarChildren,
      },
      {
        label: "Alert",
        description: "A coloured banner that says 'heads up'.",
        icon: TbAlertTriangle,
        category: "Components",
        props: { className: "alert alert-info flex flex-row items-center gap-space-xs w-full" },
        children: buildAlertChildren,
      },
      {
        label: "Stat",
        description: "A big number with a label underneath.",
        icon: TbChartBar,
        category: "Components",
        props: { className: "flex flex-col items-center gap-space-xs text-center" },
        children: buildStatChildren,
      },
      {
        label: "Modal",
        description: "A pop-up window that opens when something is clicked.",
        icon: TbAppWindow,
        category: "Interactive",
        props: { className: "contents" },
        children: buildModalChildren,
      },
      {
        label: "Tabs",
        description: "Tabs you click to switch between sections.",
        icon: TbLayoutNavbar,
        category: "Interactive",
        props: { className: "flex flex-col w-full" },
        children: buildTabsChildren,
      },
      {
        label: "Accordion",
        description: "Click a row to reveal what's hidden inside.",
        icon: TbLayoutList,
        category: "Interactive",
        props: { className: "flex flex-col w-full accordion-slide-fade" },
        children: buildAccordionChildren,
        addChild: {
          label: "Add Item",
          template: buildAccordionItemTemplate,
          childLabel: (childNode: any, index: number) => {
            try {
              const headerId = childNode?.data?.nodes?.[0];
              if (!headerId) return `Item ${index + 1}`;
              return childNode?.data?.custom?.displayName || `Item ${index + 1}`;
            } catch {
              return `Item ${index + 1}`;
            }
          },
        },
      },
      {
        label: "Bulleted List",
        description: "A simple bulleted list of points.",
        icon: TbList,
        category: "Lists",
        props: {
          type: "ul",
          className: "list-disc pl-space-md space-y-space-xs",
        },
        children: buildBulletedListChildren,
      },
      {
        label: "Numbered List",
        description: "An ordered list with numbers down the left.",
        icon: TbListNumbers,
        category: "Lists",
        props: {
          type: "ol",
          className: "list-decimal pl-space-md space-y-space-xs",
        },
        children: buildNumberedListChildren,
      },
      {
        label: "Checklist",
        description: "A list of rows each with a leading check icon.",
        icon: TbListCheck,
        category: "Lists",
        props: {
          type: "ul",
          className: "list-none flex flex-col gap-space-sm",
        },
        children: buildChecklistChildren,
      },
      {
        label: "List Item",
        description: "A single <li> row inside a list.",
        icon: TbList,
        category: "Lists",
        props: { type: "li" },
        children: () => [
          <Element
            key="text"
            is={Text}
            custom={{ displayName: "Text" }}
            text="<p>List item</p>"
            canDelete={true}
            canEditName={true}
          />,
        ],
      },
      {
        label: "Table",
        description: "A data table with header row and body rows.",
        icon: TbTable,
        category: "Tables",
        props: {
          type: "table",
          className: "table w-full border-collapse text-sm",
        },
        children: buildTableChildren,
      },
      {
        label: "Table Head",
        description: "A <thead> section — header rows for a table.",
        icon: TbTable,
        category: "Tables",
        props: { type: "thead" },
        children: () => [
          <Element
            key="row"
            canvas
            is={Container}
            type="tr"
            custom={{ displayName: "Row" }}
            canDelete={true}
            canEditName={true}
          >
            {buildTableCell("Header", "Column", true)}
          </Element>,
        ],
      },
      {
        label: "Table Body",
        description: "A <tbody> section — data rows for a table.",
        icon: TbTable,
        category: "Tables",
        props: { type: "tbody" },
        children: () => [
          <Element
            key="row"
            canvas
            is={Container}
            type="tr"
            custom={{ displayName: "Row" }}
            canDelete={true}
            canEditName={true}
          >
            {buildTableCell("Cell", "Cell", false)}
          </Element>,
        ],
      },
      {
        label: "Table Foot",
        description: "A <tfoot> section — footer rows for a table.",
        icon: TbTable,
        category: "Tables",
        props: { type: "tfoot" },
        children: () => [
          <Element
            key="row"
            canvas
            is={Container}
            type="tr"
            custom={{ displayName: "Row" }}
            canDelete={true}
            canEditName={true}
          >
            {buildTableCell("Cell", "Total", false)}
          </Element>,
        ],
      },
      {
        label: "Table Row",
        description: "A single <tr> with one cell.",
        icon: TbTable,
        category: "Tables",
        props: { type: "tr" },
        children: () => [buildTableCell("Cell", "Cell", false)],
      },
      {
        label: "Table Cell",
        description: "A single <td> data cell.",
        icon: TbTable,
        category: "Tables",
        props: {
          type: "td",
          className: "border-base-300 border-b px-space-sm py-space-xs",
        },
        children: () => [
          <Element
            key="text"
            is={Text}
            custom={{ displayName: "Text" }}
            text="<p>Cell</p>"
            canDelete={true}
            canEditName={true}
          />,
        ],
      },
      {
        label: "Table Header Cell",
        description: "A single <th> header cell with scope=col.",
        icon: TbTable,
        category: "Tables",
        props: {
          type: "th",
          className:
            "border-base-300 border-b px-space-sm py-space-xs text-left font-semibold",
          attrs: { scope: "col" },
        },
        children: () => [
          <Element
            key="text"
            is={Text}
            custom={{ displayName: "Text" }}
            text="<p>Header</p>"
            canDelete={true}
            canEditName={true}
          />,
        ],
      },
      {
        label: "Cookie Consent",
        description: "The 'accept cookies' bar at the bottom of the page.",
        icon: TbCookie,
        category: "Interactive",
        props: { className: "contents" },
        children: buildCookieConsentChildren,
      },
      {
        label: "Dropdown",
        description: "A menu that drops down when you click the trigger.",
        icon: TbChevronDown,
        category: "Interactive",
        props: {
          className: "group relative inline-flex flex-col self-start",
          attrs: { tabindex: 0 },
        },
        children: buildDropdownChildren,
      },
      {
        label: "Spacer",
        description: "An empty gap that pushes things apart.",
        icon: TbSpace,
        category: "Dividers",
        props: {
          className: "h-16 w-full bg-transparent",
          attrs: { "aria-hidden": "true" },
        },
      },
      {
        label: "Divider",
        description: "A thin line between sections.",
        icon: TbMinus,
        category: "Dividers",
        props: {
          className: "border-t w-full",
          attrs: { role: "separator" },
        },
      },
      {
        label: "Navbar",
        description: "A site header with logo, links, and a mobile menu.",
        icon: TbLayoutNavbar,
        category: "Navigation",
        props: { className: "contents" },
        children: buildNavbarChildren,
      },
      {
        label: "Navbar (mega)",
        description: "A header with a big drop-down panel of grouped links.",
        icon: TbLayoutNavbar,
        category: "Navigation",
        props: { className: "contents" },
        children: buildNavbarMegaChildren,
      },
      {
        label: "Mobile Menu",
        description: "Just the hamburger button and slide-in drawer.",
        icon: TbLayoutNavbar,
        category: "Navigation",
        props: { className: "contents" },
        children: buildMobileMenuChildren,
      },
      // ─── Button-group / nav-strip presets ───
      {
        label: "Button Group",
        description: "A row of buttons sitting next to each other.",
        icon: TbStack2,
        category: "Buttons",
        props: {
          className:
            "flex flex-col items-center justify-start gap-space-xs md:flex-row md:items-center md:justify-start w-auto",
        },
        children: buildButtonGroupChildren,
      },
      {
        label: "Social Nav",
        description: "A row of social icons with brand-colour fills.",
        icon: TbBrandTwitter,
        category: "Navigation",
        props: { className: navListClassName },
        children: () => buildSocialButtons(true),
      },
      {
        label: "Social Icons",
        description: "A row of social icons coloured by brand.",
        icon: TbBrandTwitter,
        category: "Navigation",
        props: { className: navListClassName },
        children: () => buildSocialButtons(false),
      },
      {
        label: "Plain Nav",
        description: "A simple row of text links.",
        icon: TbMinus,
        category: "Navigation",
        props: { className: navListClassName },
        children: () => buildPlainNavButtons(false),
      },
      {
        label: "Minimal Nav",
        description: "Nav links with a coloured pill behind each.",
        icon: TbLayoutNavbar,
        category: "Navigation",
        props: { className: navListClassName },
        children: () => buildPlainNavButtons(true),
      },
      {
        label: "Pill Nav",
        description: "A compact pill-shaped row of nav links.",
        icon: TbPill,
        category: "Navigation",
        props: {
          className:
            "flex flex-row items-center gap-space-xs md:flex md:flex-row md:items-center md:gap-space-xs bg-primary rounded-full px-space-xs py-space-xs",
        },
        children: buildPillNavButtons,
      },
      // ─── Image gallery presets ───
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
    ],
    modifiers: [
      // Composite patterns (real CSS classes via @utility in @pagehub/daisyui-spatial)
      // DaisyUI component classes go in `requires` — auto-added alongside the modifier.
      {
        name: "section-wrapper",
        label: "Section",
        category: "Pattern",
        description: "Full-width section with standard vertical padding and max-width content area",
      },
      {
        name: "section-wrapper-dark",
        label: "Section Dark",
        category: "Pattern",
        description: "Full-width dark section — dark background with light text, standard padding",
      },
      {
        name: "card-surface",
        label: "Card Surface",
        category: "Pattern",
        description: "Raised card with border, shadow, rounded corners, and padding",
        requires: "card",
      },
      {
        name: "icon-row",
        label: "Icon Row",
        category: "Pattern",
        description: "Horizontal flex row with gap — good for icon + label pairs",
      },
      {
        name: "content-col",
        label: "Content Column",
        category: "Pattern",
        description: "Vertical flex column with gap — good for stacked headings, copy, and CTAs",
      },
      {
        name: "hero-content-centered",
        label: "Hero Content",
        category: "Pattern",
        description:
          "Centered hero content with max-width constraint — use inside a hero container",
        requires: "hero-content",
      },
      // DaisyUI component roles
      {
        name: "card",
        label: "Card",
        category: "DaisyUI",
        description: "DaisyUI card — adds shadow, border-radius, and overflow clipping",
      },
      {
        name: "card-body",
        label: "Card Body",
        category: "DaisyUI",
        description: "Inner padding area of a DaisyUI card",
      },
      {
        name: "card-compact",
        label: "Compact Card",
        category: "DaisyUI",
        description: "Card with reduced padding — tighter than the default card-body",
      },
      {
        name: "hero",
        label: "Hero",
        category: "DaisyUI",
        description: "DaisyUI hero — full-width flex container with centered content layout",
      },
      {
        name: "hero-content",
        label: "Hero Content",
        category: "DaisyUI",
        description: "Inner content wrapper for a hero — constrains width and centers children",
      },
      {
        name: "hero-overlay",
        label: "Hero Overlay",
        category: "DaisyUI",
        description:
          "Dark semi-transparent overlay — place over a background image to improve text contrast",
      },
      {
        name: "navbar",
        label: "Navbar",
        category: "DaisyUI",
        description: "DaisyUI navbar — horizontal bar with padding and flex layout for nav items",
      },
      {
        name: "drawer",
        label: "Drawer",
        category: "DaisyUI",
        description: "DaisyUI drawer root — used for slide-in side panel layouts",
      },
      {
        name: "modal-box",
        label: "Modal Box",
        category: "DaisyUI",
        description: "DaisyUI modal content box — centered dialog with shadow and padding",
      },
      {
        name: "collapse",
        label: "Collapse",
        category: "DaisyUI",
        description: "DaisyUI collapsible container — children toggle open/closed",
      },
      {
        name: "collapse-title",
        label: "Collapse Title",
        category: "DaisyUI",
        description: "Clickable title row that toggles the collapse open or closed",
      },
      {
        name: "collapse-content",
        label: "Collapse Content",
        category: "DaisyUI",
        description: "Hidden content area that expands when the collapse is open",
      },
      // Spacing (spatial tokens)
      {
        name: "p-space-xs",
        label: "XS Padding",
        category: "Padding",
        description: "Extra-small padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-sm",
        label: "SM Padding",
        category: "Padding",
        description: "Small padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-md",
        label: "MD Padding",
        category: "Padding",
        description: "Medium padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-lg",
        label: "LG Padding",
        category: "Padding",
        description: "Large padding on all sides using the density-aware spatial scale",
      },
      {
        name: "p-space-xl",
        label: "XL Padding",
        category: "Padding",
        description: "Extra-large padding on all sides using the density-aware spatial scale",
      },
      // ── Animation patterns ────────────────────────────────────────────────
      // Express native <details> open/close transitions as Tailwind 4
      // arbitrary-variant utilities. Zero custom CSS — every class compiles
      // through the standard SSR Tailwind pipeline. Edit / clone via the
      // Modifiers Modal to author per-site variants.
      // `&` is the wrapper div — `::details-content` only exists on <details>,
      // so we need the descendant combinator (`_`) to target child <details>
      // elements: `[&_details::details-content]:…`.
      {
        name: "accordion-slide",
        label: "Slide",
        category: "Accordion",
        exclusive: true,
        renderAs: "patterns",
        description: "Animates height on <details> open/close — pure CSS, no JS",
        classes:
          "[&_details]:[interpolate-size:allow-keywords] " +
          "[&_details::details-content]:h-0 " +
          "[&_details::details-content]:overflow-clip " +
          "[&_details::details-content]:transition-all " +
          "[&_details::details-content]:duration-300 " +
          "[&_details::details-content]:ease-out " +
          "[&_details[open]::details-content]:h-auto " +
          "[&_details[open]::details-content]:starting:h-0 " +
          "[&_details::details-content]:[transition-behavior:allow-discrete]",
      },
      {
        name: "accordion-fade",
        label: "Fade",
        category: "Accordion",
        exclusive: true,
        renderAs: "patterns",
        description: "Animates opacity + height on <details> open/close",
        classes:
          "[&_details]:[interpolate-size:allow-keywords] " +
          "[&_details::details-content]:h-0 " +
          "[&_details::details-content]:opacity-0 " +
          "[&_details::details-content]:overflow-clip " +
          "[&_details::details-content]:transition-all " +
          "[&_details::details-content]:duration-300 " +
          "[&_details::details-content]:ease-out " +
          "[&_details[open]::details-content]:h-auto " +
          "[&_details[open]::details-content]:opacity-100 " +
          "[&_details[open]::details-content]:starting:h-0 " +
          "[&_details[open]::details-content]:starting:opacity-0 " +
          "[&_details::details-content]:[transition-behavior:allow-discrete]",
      },
      {
        name: "accordion-slide-fade",
        label: "Slide + Fade",
        category: "Accordion",
        exclusive: true,
        renderAs: "patterns",
        description: "Combined opacity + height animation (default Accordion preset)",
        classes:
          "[&_details]:[interpolate-size:allow-keywords] " +
          "[&_details::details-content]:h-0 " +
          "[&_details::details-content]:opacity-0 " +
          "[&_details::details-content]:overflow-clip " +
          "[&_details::details-content]:transition-all " +
          "[&_details::details-content]:duration-300 " +
          "[&_details::details-content]:ease-out " +
          "[&_details[open]::details-content]:h-auto " +
          "[&_details[open]::details-content]:opacity-100 " +
          "[&_details[open]::details-content]:starting:h-0 " +
          "[&_details[open]::details-content]:starting:opacity-0 " +
          "[&_details::details-content]:[transition-behavior:allow-discrete]",
      },
    ],
  },
  { __internal: true }
);
