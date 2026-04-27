import { UserComponent } from "@craftjs/core";
import { FooterMainTab } from "../chrome/toolbar/unified-settings/mainTabs/FooterMainTab";
import { Container } from "./Container";
import { LazyUnifiedSettings } from "./LazyUnifiedSettings";

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
        toolbar: LazyUnifiedSettings,
      },
      toolbar: {
        ...(containerCraft.toolbar || {}),
        settings: FooterMainTab,
      },
    };
  },
});
