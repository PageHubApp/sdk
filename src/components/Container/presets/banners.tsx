import React from "react";
import { Element } from "@craftjs/core";
import { Container } from "../Container";
import { Button } from "../../Button/Button";
import { Text } from "../../Text/Text";

export function buildCookieConsentChildren() {
  // Banner starts hidden via the `hidden` class. A load-trigger show-hide
  // action on the banner itself reveals it on first mount — gated by a
  // `localStorage not-exists` condition so dismissed visitors stay
  // un-bothered. Same condition shape as node visibility / page access;
  // authors can stack additional gates (e.g. `auth.status equals
  // logged-out`) via the Action panel's condition chip-list.
  //
  // Container's mount effect dispatches the action in React routes
  // (/view, /static, custom domains, editor preview); static export ships
  // an inline bootstrap script (`getLoadActionScript()`) that evaluates
  // the same conditions client-side.
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
