import { UserComponent } from "@craftjs/core";
import { HeaderMainTab } from "../chrome/toolbar/unified-settings/mainTabs/HeaderMainTab";
import { Container } from "./Container";
import { LazyUnifiedSettings } from "./LazyUnifiedSettings";

export const Header: UserComponent<any> = (props: any) => {
  return <Container {...props} />;
};

Object.defineProperty(Header, "craft", {
  get() {
    const containerCraft: any = Container.craft || {};
    return {
      ...containerCraft,
      displayName: "Header",
      props: {
        canDelete: false,
        canEditName: false,
        type: "header",
        root: {},
        custom: {
          displayName: "Header",
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
        settings: HeaderMainTab,
      },
    };
  },
});
