/**
 * Link — Text-styled hyperlink. Sibling of Button; always renders <a>, supports
 * only link-oriented actions (link-url, link-page, scroll-to, email, phone).
 */
import { TbLink } from "react-icons/tb";
import { defineComponent } from "../../define/defineComponent";
import { Link } from "./Link";
import { toHTML } from "./Link.toHTML";
import { lazyNamed } from "../../utils/lazyNamed";

const LinkMainTab = lazyNamed(
  () => import("../../chrome/toolbar/inspector/mainTabs/LinkMainTab"),
  "LinkMainTab",
);

export { toHTML };

export const LinkDef = defineComponent(
  {
    name: "Link",
    component: Link,
    icon: TbLink,
    category: "Buttons",
    settings: LinkMainTab,
    toHTML,
    disable: ["opacity"],
    rules: {
      canDrag: () => true,
    },
  },
  { __internal: true }
);
