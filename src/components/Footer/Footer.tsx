import { UserComponent } from "@craftjs/core";
import React from "react";
import { Container } from "../Container/Container";
import { Inspector } from "../InspectorRegistry";

const FooterMainTab = React.lazy(() =>
  import("../../chrome/toolbar/inspector/mainTabs/FooterMainTab").then(mod => ({
    default: mod.FooterMainTab,
  }))
);

export const Footer: UserComponent<any> = (props: any) => {
  return <Container {...props} />;
};

Object.defineProperty(Footer, "craft", {
  get() {
    const containerCraft: any = Container.craft || {};
    return {
      ...containerCraft,
      displayName: "Footer",
      props: {
        canDelete: false,
        canEditName: false,
        type: "footer",
        root: {},
        custom: {
          displayName: "Footer",
        },
      },
      rules: {
        canDrag: () => false,
        canDrop: () => true,
        canMoveIn: () => true,
        canMoveOut: () => true,
      },
      related: {
        toolbar: Inspector,
      },
      toolbar: {
        ...(containerCraft.toolbar || {}),
        settings: FooterMainTab,
      },
    };
  },
});
