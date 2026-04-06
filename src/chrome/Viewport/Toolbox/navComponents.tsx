import { Element } from "@craftjs/core";
import { Button } from "../../../components/Button";
import { ButtonList } from "../../../components/ButtonList";
import { Container } from "../../../components/Container";
import { Nav } from "../../../components/Nav";
import { TbBrandTwitter, TbDeviceMobile, TbLayoutNavbar, TbMinus, TbPill } from "react-icons/tb";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

const socialIcons = {
  twitter: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
  facebook: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,
  instagram: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987s11.987-5.367 11.987-11.987C24.014 5.367 18.647.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.281c-.49 0-.98-.49-.98-.98s.49-.98.98-.98.98.49.98.98-.49.98-.98.98zm-2.448 9.281c-1.297 0-2.448-.49-3.323-1.297-.807-.875-1.297-2.026-1.297-3.323s.49-2.448 1.297-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.807.875 1.297 2.026 1.297 3.323s-.49 2.448-1.297 3.323c-.875.807-2.026 1.297-3.323 1.297z"/></svg>`,
  linkedin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,
  youtube: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,
};

const navLinkClass =
  "hidden px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center md:block";

export const NavToolbox = {
  title: "Navigation",
  content: [
    <RenderToolComponent
      key="mobile-menu"
      display={<ToolboxItemDisplay icon={TbDeviceMobile} label="Mobile Menu" />}
      element={Nav}
      custom={{ displayName: "Nav" }}
      menu={{ enabled: true, id: "mobile-menu", side: "left", type: "slide", breakpoint: "mobile" }}
      className="flex justify-between items-center gap-(--container-gap)"
    >
      <Element is={Button} custom={{ displayName: "Home" }} text="Home" url="#" className={navLinkClass} />
      <Element is={Button} custom={{ displayName: "About Us" }} text="About Us" url="#" className={navLinkClass} />
      <Element is={Button} custom={{ displayName: "Contact us" }} text="Contact us" url="#" className={navLinkClass} />

      <Button
        text="Menu"
        url=""
        click={{
          type: "click",
          direction: "show",
          value: "mobile-menu",
        }}
        icon={{
          value: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M0 96C0 78.3 14.3 64 32 64H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H416c17.7 0 32 14.3 32 32z"/></svg>`,
          only: true,
        }}
        className="border-0 block px-(--button-padding-x) py-(--button-padding-y) md:hidden"
      />

      <Element
        canvas
        id="mobile-menu"
        is={Container}
        custom={{ displayName: "Mobile Menu Overlay" }}
        canDelete={false}
        canEditName={false}
        className="hidden fixed h-screen w-screen top-0 left-0 z-50 md:hidden bg-black/50"
        click={{
          type: "click",
          direction: "hide",
          value: "mobile-menu",
        }}
      >
        <Element
          canvas
          id="mobile-menu-panel"
          is={Container}
          custom={{ displayName: "Mobile Menu Panel" }}
          canDelete={false}
          canEditName={false}
          className="h-full w-80 max-w-sm bg-(--background) shadow-xl"
          click={{
            type: "click",
            direction: "toggle",
            value: "mobile-menu",
          }}
        >
          <Element
            canvas
            id="mobile-menu-header"
            is={Container}
            custom={{ displayName: "Mobile Nav Header" }}
            canDelete={false}
            canEditName={false}
            className="flex items-center justify-between px-(--container-padding-x) py-(--container-padding-y) border-b"
          >
            <Element
              canvas
              id="mobile-menu-close"
              is={Button}
              custom={{ displayName: "Mobile Nav Close" }}
              canDelete={false}
              canEditName={false}
              click={{
                type: "click",
                direction: "hide",
                value: "mobile-menu",
              }}
              text="×"
              url=""
              className="border-0 px-(--button-padding-x) py-(--button-padding-y) text-xl font-bold"
            />
          </Element>

          <Element
            canvas
            id="mobile-menu-items"
            is={ButtonList}
            custom={{ displayName: "Mobile Navigation" }}
            canDelete={false}
            canEditName={false}
            className="border-0 flex flex-col gap-(--container-gap) w-full"
          />
        </Element>
      </Element>
    </RenderToolComponent>,

    <RenderToolComponent
      key="social-nav"
      display={<ToolboxItemDisplay icon={TbBrandTwitter} label="Social Nav" />}
      element={ButtonList}
      custom={{ displayName: "Social Nav" }}
      className="flex flex-row items-center gap-(--container-gap)"
    >
      <Element
        is={Button}
        custom={{ displayName: "Twitter" }}
        text="Twitter"
        icon={{ value: socialIcons.twitter, only: true }}
        url="#"
        className="bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--button-padding-x) py-(--button-padding-y)"
      />
      <Element
        is={Button}
        custom={{ displayName: "Facebook" }}
        text="Facebook"
        icon={{ value: socialIcons.facebook, only: true }}
        url="#"
        className="bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--button-padding-x) py-(--button-padding-y)"
      />
      <Element
        is={Button}
        custom={{ displayName: "Instagram" }}
        text="Instagram"
        icon={{ value: socialIcons.instagram, only: true }}
        url="#"
        className="bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--button-padding-x) py-(--button-padding-y)"
      />
      <Element
        is={Button}
        custom={{ displayName: "LinkedIn" }}
        text="LinkedIn"
        icon={{ value: socialIcons.linkedin, only: true }}
        url="#"
        className="bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--button-padding-x) py-(--button-padding-y)"
      />
    </RenderToolComponent>,

    <RenderToolComponent
      key="social-icons"
      display={<ToolboxItemDisplay icon={TbBrandTwitter} label="Social Icons" />}
      element={ButtonList}
      custom={{ displayName: "Social Icons" }}
      className="flex flex-row items-center gap-(--container-gap)"
    >
      <Element
        is={Button}
        custom={{ displayName: "Twitter" }}
        text="Twitter"
        icon={{ value: socialIcons.twitter, only: true }}
        url="#"
        className="bg-transparent text-[#1DA1F2] border-0 px-2 py-2"
      />
      <Element
        is={Button}
        custom={{ displayName: "Facebook" }}
        text="Facebook"
        icon={{ value: socialIcons.facebook, only: true }}
        url="#"
        className="bg-transparent text-[#1877F2] border-0 px-2 py-2"
      />
      <Element
        is={Button}
        custom={{ displayName: "Instagram" }}
        text="Instagram"
        icon={{ value: socialIcons.instagram, only: true }}
        url="#"
        className="bg-transparent text-[#E4405F] border-0 px-2 py-2"
      />
      <Element
        is={Button}
        custom={{ displayName: "LinkedIn" }}
        text="LinkedIn"
        icon={{ value: socialIcons.linkedin, only: true }}
        url="#"
        className="bg-transparent text-[#0A66C2] border-0 px-2 py-2"
      />
      <Element
        is={Button}
        custom={{ displayName: "YouTube" }}
        text="YouTube"
        icon={{ value: socialIcons.youtube, only: true }}
        url="#"
        className="bg-transparent text-[#FF0000] border-0 px-2 py-2"
      />
    </RenderToolComponent>,

    <RenderToolComponent
      key="plain-nav"
      display={<ToolboxItemDisplay icon={TbMinus} label="Plain Nav" />}
      element={ButtonList}
      custom={{ displayName: "Plain Nav" }}
      className="flex flex-row items-center gap-(--container-gap)"
    >
      <Element
        is={Button}
        custom={{ displayName: "Home" }}
        text="Home"
        url="#"
        className="px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
      <Element
        is={Button}
        custom={{ displayName: "About" }}
        text="About"
        url="#"
        className="px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
      <Element
        is={Button}
        custom={{ displayName: "Services" }}
        text="Services"
        url="#"
        className="px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
      <Element
        is={Button}
        custom={{ displayName: "Contact" }}
        text="Contact"
        url="#"
        className="px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
    </RenderToolComponent>,

    <RenderToolComponent
      key="minimal-nav"
      display={<ToolboxItemDisplay icon={TbLayoutNavbar} label="Minimal Nav" />}
      element={ButtonList}
      custom={{ displayName: "Minimal Nav" }}
      className="flex flex-row items-center gap-(--container-gap)"
    >
      <Element
        is={Button}
        custom={{ displayName: "Home" }}
        text="Home"
        url="#"
        className="bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
      <Element
        is={Button}
        custom={{ displayName: "About" }}
        text="About"
        url="#"
        className="bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
      <Element
        is={Button}
        custom={{ displayName: "Services" }}
        text="Services"
        url="#"
        className="bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
      <Element
        is={Button}
        custom={{ displayName: "Contact" }}
        text="Contact"
        url="#"
        className="bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
    </RenderToolComponent>,

    <RenderToolComponent
      key="pill-nav"
      display={<ToolboxItemDisplay icon={TbPill} label="Pill Nav" />}
      element={ButtonList}
      custom={{ displayName: "Pill Nav" }}
      className="bg-(--primary) rounded-full px-2 py-1 flex flex-row items-center gap-1"
    >
      <Element
        is={Button}
        custom={{ displayName: "Home" }}
        text="Home"
        url="#"
        className="bg-transparent text-(--primary-foreground) border-0 px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
      <Element
        is={Button}
        custom={{ displayName: "About" }}
        text="About"
        url="#"
        className="bg-transparent text-(--primary-foreground) border-0 px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
      <Element
        is={Button}
        custom={{ displayName: "Contact" }}
        text="Contact"
        url="#"
        className="bg-transparent text-(--primary-foreground) border-0 px-(--button-padding-x) py-(--button-padding-y) flex flex-col gap-1.5 items-center justify-center"
      />
    </RenderToolComponent>,
  ],
  classes: {
    content: "p-3 grid grid-cols-2 gap-3",
  },
};
