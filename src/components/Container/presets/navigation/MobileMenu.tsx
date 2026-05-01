import React from "react";
import { Element } from "@craftjs/core";
import { Container } from "../../Container";
import { Button } from "../../../Button/Button";

export function buildMobileMenuChildren() {
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
