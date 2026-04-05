// @ts-nocheck
import { ROOT_NODE, useEditor } from "@craftjs/core";
import { AutoHideScrollbar } from "components/layout/AutoHideScrollbar";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  TbBoxModel2,
  TbDevices2,
  TbDownload,
  TbExternalLink,
  TbEye,
  TbEyeOff,
  TbFilePlus,
  TbLayoutGrid,
  TbLayoutSidebar,
  TbLayoutSidebarRight,
  TbMoon,
  TbPalette,
  TbPhoto,
  TbSettings,
  TbSun,
} from "react-icons/tb";
import { useAtomState } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { ClippyOpenAtom, ClippyVisibleAtom, ShowGridLinesAtom } from "utils/atoms";
import { useAiEnabled } from "utils/hooks/useAiEnabled";
import { useSDK } from "../../context";
import { ToolboxTabs } from "./ToolboxTabs";

interface EditorNavigationProps {
  headerMenu: {
    isOpen: boolean;
    activeTab: string;
    menuType: string;
  };
  setHeaderMenu: (value: any) => void;
  lsIds: any[];
  settings: any;
  isTenant: boolean;
  sideBarLeft: boolean;
  setSideBarLeft: (value: boolean) => void;
  setIsLayersDialogOpen: (value: boolean) => void;
  setIsMediaManagerModalOpen: (value: boolean) => void;
  isDesignSystemSidebarOpen: boolean;
  setIsDesignSystemSidebarOpen: (value: boolean) => void;
  setIsSiteSettingsModalOpen: (value: boolean) => void;
  setIsImportExportDialogOpen: (value: boolean) => void;
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export const EDITOR_NAV_FOOTER_ID = "editor-nav-footer";
export const EDITOR_NAV_PUBLISH_ID = "editor-nav-publish";

const formatKbd = (mac: string) => {
  if (isMac) return mac;
  return mac.replace(/⌘/g, "Ctrl+").replace(/⇧/g, "Shift+").replace(/⌥/g, "Alt+").replace(/\+$/, "");
};

const Kbd = ({ children, win }: { children: string; win?: string }) => (
  <kbd className="ml-auto rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-foreground/80">
    {win && !isMac ? win : formatKbd(children)}
  </kbd>
);

export const EditorNavigation = ({
  headerMenu,
  setHeaderMenu,
  lsIds,
  settings,
  isTenant,
  sideBarLeft,
  setSideBarLeft,
  setIsLayersDialogOpen,
  setIsMediaManagerModalOpen,
  isDesignSystemSidebarOpen,
  setIsDesignSystemSidebarOpen,
  setIsSiteSettingsModalOpen,
  setIsImportExportDialogOpen,
  toggleTheme,
  isDarkMode,
}: EditorNavigationProps) => {
  const { actions } = useEditor();
  const [showHidden, setShowHidden] = useState(true);
  const [showGridLines, setShowGridLines] = useAtomState(ShowGridLinesAtom);
  const [clippyVisible, setClippyVisible] = useAtomState(ClippyVisibleAtom);
  const setClippyOpen = useSetAtomState(ClippyOpenAtom);
  const { config } = useSDK();
  const isAiEnabled = useAiEnabled();
  const renderNavAi = config.editorChromeSlots?.renderNavAiMenuItem;

  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        // Don't close the menu if the design system modal is open
        if (isDesignSystemSidebarOpen) {
          return;
        }
        setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
      }
    };

    if (headerMenu.isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [headerMenu.isOpen, setHeaderMenu, isDesignSystemSidebarOpen]);

  if (!headerMenu.isOpen) return null;

  return (
    <nav
      ref={ref}
      role="navigation"
      aria-label="Editor menu"
      className="pointer-events-auto absolute bottom-0 top-10 z-50 mt-1 flex w-full flex-col bg-background text-foreground"
    >
      {(headerMenu.menuType === "components" || headerMenu.menuType === "sections") ? (
        <ToolboxTabs headerMenu={headerMenu} setHeaderMenu={setHeaderMenu} />
      ) : (
      <AutoHideScrollbar
        className="flex flex-1 flex-col gap-3 overflow-y-auto py-3"
        hideDelay={2000}
      >
        {headerMenu.menuType === "domain" && <div id={EDITOR_NAV_PUBLISH_ID} className="flex-1" />}

        {headerMenu.menuType === "builds" && lsIds.length > 0 && (
          <>
            <div className="flex flex-col gap-6 p-3">
              <div className="text-xl">Account Builds</div>
              <p>
                These builds have been saved to your account and can be accessed anywhere you login.
              </p>
            </div>

            {lsIds.length ? (
              <div className="flex flex-col gap-6 p-3">
                <div className="text-xl">Local Builds</div>
                <p>
                  These builds are saved but only referenced locally, you will need the link to
                  access them outside of your current browser
                </p>

                <div className="flex flex-col gap-3">
                  {lsIds.reverse().map((_, key) => (
                    <div className="flex w-full flex-row gap-3" key={key}>
                      <div className="text-base">
                        <TbExternalLink />
                      </div>
                      <div className="capitalize">
                        <Link href={`/build/${_._id}`} target="_blank">
                          {_.draftId}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        )}

        {!headerMenu.menuType && (
          <>
            {isTenant ? (
              // For tenant users, show background and settings panel buttons
              <>
                <button
                  onClick={() => {
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                    actions.selectNode(ROOT_NODE);
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">
                    <TbBoxModel2 />
                  </div>{" "}
                  Select Background
                </button>

                <button
                  onClick={() => setSideBarLeft(!sideBarLeft)}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">
                    {sideBarLeft ? <TbLayoutSidebarRight /> : <TbLayoutSidebar />}
                  </div>
                  Move this panel to the {sideBarLeft ? "right" : "left"} side
                </button>
              </>
            ) : (
              // For regular users, show all the original items
              <>
                <Link
                  href="/build"
                  className="hidden cursor-pointer items-center gap-3 p-3 text-muted-foreground hover:bg-muted"
                >
                  <TbFilePlus /> New Builder
                </Link>


                <button
                  onClick={() => {
                    setIsMediaManagerModalOpen(true);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">
                    <TbPhoto />
                  </div>
                  <div className="text-sm">Media Manager</div>
                  <Kbd>⌘⇧M</Kbd>
                </button>

                <button
                  onClick={() => {
                    setIsDesignSystemSidebarOpen(!isDesignSystemSidebarOpen);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">
                    <TbPalette />
                  </div>
                  <div className="text-sm">Design System</div>
                  <Kbd>⌘⇧D</Kbd>
                </button>

                <button
                  onClick={() => {
                    setIsSiteSettingsModalOpen(true);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">
                    <TbSettings />
                  </div>
                  <div className="text-sm">Site Settings</div>
                  <Kbd>⌘,</Kbd>
                </button>

                {settings?.name && (
                  <a
                    href={`https://${settings.name}.pagehub.dev`}
                    target="_blank"
                    className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                  >
                    <div className="text-base">
                      <TbExternalLink />
                    </div>
                    <div className="text-sm">View Live Version</div>
                  </a>
                )}

                <hr className="border-b border-border" />

                <button
                  onClick={() => {
                    setIsImportExportDialogOpen(true);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">
                    <TbDownload />
                  </div>
                  <div className="text-sm">Import / Export</div>
                  <Kbd>⌘⇧E</Kbd>
                </button>

                {settings?.draftId && (
                  <a
                    href={`https://${settings.draftId}.pagehub.dev`}
                    target="_blank"
                    className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                  >
                    <div className="text-base">
                      <TbExternalLink />
                    </div>
                    <div className="text-sm">View Draft Version</div>
                  </a>
                )}

                {lsIds.length ? (
                  <button
                    onClick={() => {
                      setHeaderMenu(prev => ({ ...prev, isOpen: true, menuType: "builds" }));
                    }}
                    className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                  >
                    <div className="text-base">
                      <TbDevices2 />
                    </div>
                    <div className="text-sm">Previous Builds</div>
                  </button>
                ) : null}

                <hr className="border-b border-border" />

                <button
                  onClick={() => {
                    setIsLayersDialogOpen(true);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">
                    <TbLayoutGrid />
                  </div>
                  <div className="text-sm">Show Layers</div>
                  <Kbd>⌘⇧L</Kbd>
                </button>

                <button
                  onClick={() => {
                    const viewport = document.getElementById("viewport");
                    setShowGridLines(!showGridLines);
                    viewport?.setAttribute("data-show-gridlines", (!showGridLines).toString());
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">
                    <TbBoxModel2 />
                  </div>
                  <div className="text-sm">{`${showGridLines ? "Hide" : "Show"} Grid Lines`}</div>
                  <Kbd>⌘⇧G</Kbd>
                </button>

                <button
                  onClick={() => {
                    const viewport = document.getElementById("viewport");

                    setShowHidden(!showHidden);
                    viewport.setAttribute("data-show-hidden", showHidden ? "true" : "false");
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">{showHidden ? <TbEyeOff /> : <TbEye />}</div>
                  <div className="text-sm">{`${showHidden ? "Show" : "Hide"} Hidden Components`}</div>
                </button>

                {isAiEnabled &&
                  renderNavAi &&
                  renderNavAi({
                    onSelect: () => {
                      setClippyOpen({});
                      setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                    },
                  })}

                <hr className="border-b border-border" />

                <button
                  onClick={() => {
                    setSideBarLeft(!sideBarLeft);
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">
                    {sideBarLeft ? <TbLayoutSidebarRight /> : <TbLayoutSidebar />}
                  </div>
                  <div className="text-sm">{sideBarLeft ? "Right" : "Left"} Settings Panel</div>
                </button>

                <button
                  onClick={() => {
                    toggleTheme();
                    setHeaderMenu(prev => ({ ...prev, isOpen: false, menuType: "" }));
                  }}
                  className="flex cursor-pointer items-center gap-1 px-3 py-2 text-muted-foreground hover:bg-muted"
                >
                  <div className="text-base">{isDarkMode ? <TbSun /> : <TbMoon />}</div>
                  <div className="text-sm">Switch to {isDarkMode ? "Light" : "Dark"} Theme</div>
                </button>
              </>
            )}
          </>
        )}
      </AutoHideScrollbar>
      )}

      {/* Portal target — app injects footer content (account, nav links) here */}
      {headerMenu.menuType !== "components" && headerMenu.menuType !== "sections" && (
        <div id="editor-nav-footer" className="mt-auto" />
      )}
    </nav>
  );
};
