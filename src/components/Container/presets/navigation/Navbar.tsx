import React from "react";
import { Element } from "@craftjs/core";
import { Container } from "../../Container";
import { Button } from "../../../Button/Button";
import { Icon } from "../../../Icon/Icon";
import { Text } from "../../../Text/Text";

export function buildNavbarChildren() {
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
