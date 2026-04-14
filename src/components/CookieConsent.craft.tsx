import React from "react";
import { Element } from "@craftjs/core";
import { TbCookie } from "react-icons/tb";
import { defineComponent } from "../define";
import { CookieConsent } from "./CookieConsent";
import { staticClasses, getInlineStyle, tag, ariaAttrs, type ToHTMLFn } from "../utils/static-html";

const toHTML: ToHTMLFn = (props, children, ctx) => {
  const id = props.anchor || "";
  const consentKey = props.consentKey || "cookie-consent";
  const position = props.position || "bottom";
  const showBackdrop = props.showBackdrop ?? false;

  // Hidden anchor — show-hide action system finds this by ID
  const anchor = tag(
    "div",
    {
      id: id || undefined,
      "data-modal": "true",
      "data-consent-key": consentKey,
      style: "display:none",
    },
    ""
  );

  const positionClasses =
    position === "top" ? "top-0 left-0 right-0" : "bottom-0 left-0 right-0";

  const barClass = [staticClasses(props, ctx), `fixed ${positionClasses} z-[9998]`]
    .filter(Boolean)
    .join(" ");

  const bar = tag(
    "div",
    {
      "data-consent-banner": id,
      class: barClass,
      style: `display:none;${getInlineStyle(props) || ""}`,
      role: "dialog",
      "aria-label": "Cookie consent",
      ...ariaAttrs(props),
    },
    children
  );

  // Backdrop (optional)
  const backdrop = showBackdrop
    ? tag(
        "div",
        {
          "data-consent-backdrop": id,
          class: `fixed inset-0 z-[9997] bg-black/50 ${props.backdropBlur ? "backdrop-blur-sm" : ""}`,
          style: "display:none;",
        },
        ""
      )
    : "";

  // Inline script: auto-show if no consent stored, wire dismiss buttons
  const script = `<script>(function(){
var k="ph-consent-${consentKey}";
if(localStorage.getItem(k))return;
var b=document.querySelector('[data-consent-banner="${id}"]');
var d=document.querySelector('[data-consent-backdrop="${id}"]');
if(b)b.style.display="";
if(d)d.style.display="";
document.addEventListener("click",function(e){
var t=e.target.closest("[data-modal-close=\\"${id}\\"]")||e.target.closest("[data-consent-dismiss]");
if(!t)return;
var v=t.getAttribute("data-consent-dismiss")||"accepted";
localStorage.setItem(k,v);
if(b)b.style.display="none";
if(d)d.style.display="none";
});
})()</script>`;

  return anchor + backdrop + bar + script;
};

import {
  CookieConsentMainTab,
  CookieConsentMainTabAdvanced,
} from "../chrome/toolbar/unified-settings/mainTabs/CookieConsentMainTab";
import { HoverNodeController, NameNodeController, DeleteNodeController } from "./editor-chrome";
import { Button } from "./Button";
import { Container } from "./Container";
import { Text } from "./Text";

function buildCookieConsentChildren() {
  return [
    // Banner bar — the visible fixed-position container
    <Element
      key="banner"
      canvas
      id="cookie-consent"
      is={Container}
      custom={{ displayName: "Cookie Banner" }}
      canDelete={false}
      canEditName={false}
      className="fixed bottom-0 left-0 right-0 z-[9998] bg-base-200 text-base-content shadow-[0_-2px_10px_rgba(0,0,0,0.1)]"
    >
      {/* Content row */}
      <Element
        canvas
        is={Container}
        custom={{ displayName: "Banner Content" }}
        canDelete={false}
        className="flex flex-col sm:flex-row items-center justify-between gap-space-sm px-space-md py-space-sm max-w-page mx-auto"
      >
        <Element
          is={Text}
          custom={{ displayName: "Consent Text" }}
          text="<p>We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.</p>"
          className="text-sm text-base-content/80"
          canDelete={true}
          canEditName={true}
        />
        {/* Button group */}
        <Element
          canvas
          is={Container}
          custom={{ displayName: "Button Group" }}
          className="flex flex-row items-center gap-space-xs shrink-0"
          canDelete={true}
        >
          <Element
            is={Button}
            custom={{ displayName: "Reject" }}
            text="Reject"
            url=""
            action={{
              type: "show-hide",
              target: "cookie-consent",
              direction: "hide",
              trigger: "click",
              method: "class",
            }}
            className="btn btn-ghost btn-sm rounded-box px-space-sm py-space-xs"
          />
          <Element
            is={Button}
            custom={{ displayName: "Accept" }}
            text="Accept"
            url=""
            action={{
              type: "show-hide",
              target: "cookie-consent",
              direction: "hide",
              trigger: "click",
              method: "class",
            }}
            className="btn btn-primary btn-sm rounded-box px-space-sm py-space-xs"
          />
        </Element>
      </Element>
    </Element>,
  ];
}

export const CookieConsentDef = defineComponent(
  {
    name: "CookieConsent",
    component: CookieConsent,
    icon: TbCookie,
    category: "Interactive",
    canvas: true,
    settings: CookieConsentMainTab,
    advancedSettings: CookieConsentMainTabAdvanced,
    toHTML,
    disable: ["hoverClick"],
    rules: {
      canDrag: () => true,
      canDelete: () => true,
      canMoveIn: () => true,
    },
    tools: props => [
      <NameNodeController
        key="consentName"
        position="top"
        align="start"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <HoverNodeController
        key="consentHover"
        position="top"
        align="start"
        placement="end"
        alt={{ position: "bottom", align: "start", placement: "start" }}
      />,
      <DeleteNodeController key="consentDelete" />,
    ],
    presets: [
      {
        label: "Cookie Consent",
        props: {
          anchor: "cookie-consent",
          consentKey: "cookie-consent",
          position: "bottom",
          animation: "slide-up",
          showBackdrop: false,
          backdropBlur: false,
          blockScroll: false,
          showCloseButton: false,
          closeOnEscape: true,
          className: "flex flex-col",
        },
        children: buildCookieConsentChildren,
      },
    ],
  },
  { __internal: true }
);
