import { Element } from "@craftjs/core";
import { TbAppWindow } from "react-icons/tb";
import { Button } from "../../../components/Button";
import { Container } from "../../../components/Container";
import { Modal } from "../../../components/Modal";
import { Text } from "../../../components/Text";
import { RenderToolComponent, ToolboxItemDisplay } from "./lib";

export const ModalToolbox = {
  title: "Modal",
  content: [
    <RenderToolComponent
      key="modal"
      display={<ToolboxItemDisplay icon={TbAppWindow} label="Modal" />}
      element={Modal}
      custom={{ displayName: "Modal" }}
      anchor="my-modal"
      trigger={{ type: "click", delay: 3, showOnce: false }}
      closeOnBackdrop={true}
      closeOnEscape={true}
      showCloseButton={true}
      closeButtonPosition="top-right"
      modalAnimation="fade"
      modalWidth="max-w-lg"
      modalPosition="center"
      className="flex flex-col items-start gap-(--container-gap)"
    >
      <Element
        is={Button}
        custom={{ displayName: "Open Modal" }}
        text="Open Modal"
        url=""
        click={{
          type: "click",
          direction: "show",
          value: "my-modal",
        }}
        className="bg-(--primary) text-(--primary-foreground) rounded-(--radius) px-(--button-padding-x) py-(--button-padding-y)"
      />

      <Element
        canvas
        id="my-modal"
        is={Container}
        custom={{ displayName: "Modal Backdrop" }}
        canDelete={false}
        canEditName={false}
        className="hidden fixed inset-0 z-50 bg-black/50"
        click={{
          type: "click",
          direction: "hide",
          value: "my-modal",
        }}
      >
        <Element
          canvas
          id="my-modal-content"
          is={Container}
          custom={{ displayName: "Modal Content" }}
          canDelete={false}
          canEditName={false}
          className="bg-(--background) rounded-(--radius) shadow-xl flex flex-col gap-(--container-gap) px-(--container-padding-x) py-(--container-padding-y) w-full max-w-lg"
          click={{
            type: "click",
            direction: "toggle",
            value: "my-modal",
          }}
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
      </Element>
    </RenderToolComponent>,
  ],
};
