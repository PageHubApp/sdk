/**
 * Modal — Component definition via defineComponent()
 *
 * Complex preset with deeply nested Element trees: trigger button,
 * backdrop overlay, content panel, title/body text. All pre-wired
 * with click handlers and show/hide IDs.
 */
import React from "react";
import { Element } from "@craftjs/core";
import { TbAppWindow } from "react-icons/tb";
import { defineComponent } from "../define";
import { Modal } from "./Modal";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const id = props.anchor || "";

  // Hidden anchor element — click controls find this by ID
  const anchor = tag("div", {
    id: id || undefined,
    "data-modal": "true",
    style: "display:none",
  }, "");

  const positionClass =
    props.modalPosition === "top" ? "items-start pt-16" :
    props.modalPosition === "bottom" ? "items-end pb-16" :
    "items-center";

  const backdropClass = `fixed inset-0 z-9997 flex justify-center p-4 ${positionClass} ${props.backdropBlur ? "backdrop-blur-sm" : ""}`;

  const contentClass = [
    staticClasses(props, ctx),
    props.modalWidth || "max-w-lg",
    "w-full relative",
  ].filter(Boolean).join(" ");

  const closePos = props.closeButtonPosition === "top-left" ? "left:0.75rem;top:0.75rem;" : "right:0.75rem;top:0.75rem;";
  const closeBtn = props.showCloseButton !== false
    ? tag("button", {
        "data-modal-close": id,
        class: "absolute z-10 p-1 text-xl leading-none",
        style: `${closePos}cursor:pointer;background:none;border:none;`,
        "aria-label": "Close modal",
      }, "&times;")
    : "";

  const content = tag("div", {
    class: contentClass,
    style: getInlineStyle(props) || undefined,
    role: "dialog",
    "aria-modal": "true",
    ...ariaAttrs(props),
  }, closeBtn + children);

  const overlay = tag("div", {
    "data-modal-overlay": id,
    class: backdropClass,
    style: "display:none;background:rgba(0,0,0,0.5);",
  }, content);

  return anchor + overlay;
};
import { ModalMainTab, ModalMainTabAdvanced } from "../chrome/Toolbar/UnifiedSettings/mainTabs/ModalMainTab";
import { HoverNodeController, NameNodeController, DeleteNodeController } from "./editor-chrome";
import { Button } from "./Button";
import { Container } from "./Container";
import { Text } from "./Text";

function buildModalChildren() {
  return [
    // Trigger Button
    <Element
      key="trigger"
      is={Button}
      custom={{ displayName: "Open Modal" }}
      text="Open Modal"
      url=""
      action={{ type: "show-hide", target: "my-modal", direction: "show", trigger: "click", method: "style" }}
      className="px-(--button-padding-x) py-(--button-padding-y) bg-(--primary) text-(--primary-foreground) rounded-(--radius)"
    />,
    // Backdrop
    <Element
      key="backdrop"
      canvas
      id="my-modal"
      is={Container}
      custom={{ displayName: "Modal Backdrop" }}
      canDelete={false}
      canEditName={false}
      className="hidden fixed h-screen w-screen top-0 left-0 z-50 flex-col items-center justify-center px-4 py-4 md:hidden bg-black/50"
      action={{ type: "show-hide", target: "my-modal", direction: "hide", trigger: "click", method: "style" }}
    >
      {/* Content Panel */}
      <Element
        canvas
        id="my-modal-content"
        is={Container}
        custom={{ displayName: "Modal Content" }}
        canDelete={false}
        canEditName={false}
        className="flex flex-col gap-(--container-gap) px-(--container-padding-x) py-(--container-padding-y) w-full max-w-lg bg-(--background) rounded-(--radius) shadow-xl"
        action={{ type: "show-hide", target: "my-modal", direction: "toggle", trigger: "click", method: "style" }}
      >
        <Element
          is={Text}
          custom={{ displayName: "Modal Title" }}
          text="<h3>Modal Title</h3>"
          canDelete={true}
          canEditName={true}
        />
        <Element
          is={Text}
          custom={{ displayName: "Modal Content" }}
          text="<p>Your modal content goes here. Add any components you like.</p>"
          canDelete={true}
          canEditName={true}
        />
      </Element>
    </Element>,
  ];
}

export const ModalDef = defineComponent({
  name: "Modal",
  component: Modal,
  icon: TbAppWindow,
  category: "Interactive",
  canvas: true,
  settings: ModalMainTab,
  advancedSettings: ModalMainTabAdvanced,
  toHTML,
  disable: ["hoverClick"],
  rules: {
    canDrag: () => true,
    canDelete: () => true,
    canMoveIn: () => true,
  },
  tools: (props) => [
    <NameNodeController
      key="modalName"
      position="top"
      align="start"
      placement="end"
      alt={{ position: "bottom", align: "start", placement: "start" }}
    />,
    <HoverNodeController
      key="modalHover"
      position="top"
      align="start"
      placement="end"
      alt={{ position: "bottom", align: "start", placement: "start" }}
    />,
    <DeleteNodeController key="modalDelete" />,
  ],
  presets: [
    {
      label: "Modal",
      props: {
        anchor: "my-modal",
        trigger: { type: "click", delay: 3, showOnce: false },
        closeOnBackdrop: true,
        closeOnEscape: true,
        showCloseButton: true,
        closeButtonPosition: "top-right",
        modalAnimation: "fade",
        modalWidth: "max-w-lg",
        modalPosition: "center",
        className: "flex flex-col items-start gap-(--container-gap)",
      },
      children: buildModalChildren,
    },
  ],
}, { __internal: true });
