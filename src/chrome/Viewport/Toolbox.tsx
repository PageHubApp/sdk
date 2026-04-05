// @ts-nocheck
/**
 * NOTE: This Toolbox component is deprecated and not currently used.
 * Navigation and component management is now handled through the Header component.
 * See: components/editor/Viewport/Header.tsx
 */

import { ROOT_NODE, useEditor } from "@craftjs/core";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";

import { TbContainer, TbPlus } from "react-icons/tb";
import { useAtomState, useAtomValue } from "@zedux/react";
import { ComponentsAtom, SideBarAtom, SideBarOpen } from "utils/lib";
import { PreviewAtom } from "./atoms";
import { ToolboxMenu } from "../RenderNode";
import DelayedMouseEnter from "./Toolbox/DelayedMouseEnter";
import {
  activeMenuContainerVariants,
  containerVariants,
  iconVariants,
  subMenuItemVariants,
} from "./Toolbox/animations";
import { AudioToolbox } from "./Toolbox/audioComponents";
import { ButtonToolbox } from "./Toolbox/buttonComponents";
import { DividerToolbox } from "./Toolbox/dividerComponents";
import { EmbedToolbox } from "./Toolbox/embedComponents";
import { FormToolbox } from "./Toolbox/formComponents";
import { FormElementToolbox } from "./Toolbox/formElement";
import { ImageToolbox } from "./Toolbox/imageComponents";
import { sectionToolboxItems } from "./Toolbox/sectionComponents";
import { SpacerToolbox } from "./Toolbox/spacerComponents";
import { textToolboxItems } from "./Toolbox/textComponents";
import { VideoToolbox } from "./Toolbox/videoComponents";
import { MapToolbox } from "./Toolbox/mapComponents";
import { TbActiveItemAtom, TbActiveMenuAtom, TbActiveSubItemAtom } from "./atoms";

export const Toolbox = ({ userStyle = null }) => {
  const { enabled, query } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const [menu, setMenu] = useAtomState(ToolboxMenu);
  const [components, setComponents] = useAtomState(ComponentsAtom);
  const sideBarOpen = useAtomValue(SideBarOpen);
  const sideBarLeft = useAtomValue(SideBarAtom);
  const [preview, setPreview] = useAtomState(PreviewAtom);

  // const { id } = menu;

  const [activeMenu, setActiveMenu] = useAtomState(TbActiveMenuAtom);
  const [activeItem, setActiveItem] = useAtomState(TbActiveItemAtom);
  const [activeSubItem, setActiveSubItem] = useAtomState(TbActiveSubItemAtom);

  const ref = useRef(null);

  // Load components from Background node
  useEffect(() => {
    if (!query || !enabled) return;

    try {
      const rootNode = query.node(ROOT_NODE).get();
      const backgroundId = rootNode?.data?.nodes?.[0];

      if (backgroundId) {
        const backgroundNode = query.node(backgroundId).get();
        const savedComponents = backgroundNode?.data?.props?.savedComponents || [];
        setComponents(savedComponents);
      }
    } catch (e) {
      console.error("❌ Error loading saved components:", e);
    }
  }, [query, enabled, setComponents]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (ref.current && !ref.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener("click", handleClickOutside, true);

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [menu.enabled, setActiveMenu]);

  const parent = menu.parent;

  const comps =
    components ||
    []
      .map((_, k) => {
        const nodes = JSON.parse(_.nodes);
        const node = nodes[Object.keys(nodes)[0]];

        if (
          (menu?.parent?.displayName === "Background" && node.props?.type !== "page") ||
          (menu?.parent?.displayName !== "Background" && node.props?.type === "page")
        ) {
          return;
        }

        return { id: _, node };
      })
      .filter(_ => _);

  const items = [
    {
      title: "Components",
      icon: <TbPlus />,
      items: [
        textToolboxItems,
        ButtonToolbox,
        ImageToolbox,
        VideoToolbox,
        AudioToolbox,
        FormToolbox,
        FormElementToolbox,
        DividerToolbox,
        SpacerToolbox,
        EmbedToolbox,
        MapToolbox,
      ],
    },
    {
      title: "Blocks",
      icon: <TbContainer />,
      items: sectionToolboxItems,
    },
    /* {
       title: "Pages",
       icon: <TbNote />,
       items: pageToolboxItems,
     },*/
  ];

  //  if (!parent) delete items[0];

  //  let pos = "right-0";
  // let pos = "top-1/2 -mt-32";

  let pos = "left-0";

  if (!sideBarLeft) {
    pos = " right-0";
  }

  if (sideBarOpen) {
    if (!sideBarLeft) {
      pos += " right-[366px]";
    } else pos += " left-[366px]";
  }

  const iconList = Object.keys(items).map((_, k) => (
    <DelayedMouseEnter
      as="button"
      delayTime={300}
      key={`icon${k}`}
      variants={subMenuItemVariants}
      whileTap={{ scale: 0.9 }}
      onDelayedMouseEnter={() => {
        setActiveMenu(k);
        setActiveItem(0);
      }}
      className={`btn cursor-pointer rounded-full border bg-primary p-3 text-2xl text-foreground drop-shadow-2xl ${activeMenu === k ? "bg-primary" : ""
        }`}
      aria-label={items[_].title}
      role="button"
    >
      {items[_].icon}
    </DelayedMouseEnter>
  ));

  const getActiveItem = item => {
    if (!item) return;
    if (item?.items) {
      return (
        <div className="flex flex-row">
          {itemMenu(item, activeSubItem, setActiveSubItem, true)}
          {activeSubItem !== null && getActiveItem(item.items[activeSubItem])}
        </div>
      );
    }
    return (
      <div
        className={`scrollbar flex size-full min-w-[320px] flex-col gap-3 overflow-auto bg-background px-6 py-8 ${item?.classes?.content}`}
      >
        {item.content}
      </div>
    );
  };

  const itemMenu = (item, getter, setter, col = false) => (
    <div
      className={`scrollbar flex min-w-[170px] flex-col overflow-auto bg-muted p-4 ${col ? "bg-muted text-foreground" : "bg-muted text-foreground"
        }`}
    >
      <div className={`flex ${col ? "flex-col gap-3" : "flex-col gap-1.5"} items-end`}>
        {itemMenuButton(item, getter, setter, col)}
      </div>
    </div>
  );

  const itemMenuButton = (item, getter, setter, col) => {
    if (!item?.items) return null;

    return item.items?.map((a, k) => (
      <DelayedMouseEnter
        delayTime={300}
        className={`w-min cursor-pointer whitespace-nowrap rounded-lg px-3 py-1.5 ${getter === k ? (!col ? "font-bold underline" : "font-bold") : ""
          }`}
        key={`btn${k}`}
        onClick={() => {
          setter(k);
        }}
        onDelayedMouseEnter={() => {
          setter(k);
        }}
      >
        {a.title}
      </DelayedMouseEnter>
    ));
  };
  // if (!menu.enabled) return null;

  return (
    <AnimatePresence>
      {enabled && !preview && (
        <motion.nav
          role="navigation"
          aria-label="Component toolbox"
          variants={containerVariants}
          ref={ref}
          key="wrapper"
          initial="hidden"
          animate="visible"
          exit="hidden"
          className={`absolute z-40 ${pos} pointer-events-none flex h-screen select-none flex-col items-center md:flex-row`}
        >
          <div
            id="toolboxWrap"
            onMouseLeave={() => {
              setActiveMenu(null);
              setActiveItem(null);
            }}
            className={
              "pointer-events-auto flex flex-col items-center justify-center gap-6 md:flex-row"
            }
          >
            <motion.div
              variants={iconVariants}
              key="icons"
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={"pointer-events-auto flex flex-row gap-5 p-1.5 md:flex-col"}
            >
              {iconList}
            </motion.div>

            <AnimatePresence>
              {activeMenu !== null && (
                <motion.div
                  key="items"
                  className="pointer-events-auto z-50 flex h-[420px] flex-row overflow-hidden"
                  variants={activeMenuContainerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  id="toolbox"
                >
                  <div className="flex h-full flex-row overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                    {activeMenu !== null && itemMenu(items[activeMenu], activeItem, setActiveItem)}
                    {activeMenu !== null &&
                      activeItem !== null &&
                      getActiveItem(items[activeMenu]?.items[activeItem])}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};
