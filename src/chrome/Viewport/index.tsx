// @ts-nocheck
import sluggit from "slug";
import { NodeTree, useEditor } from "@craftjs/core";
import { ROOT_NODE } from "@craftjs/utils";
import { Tooltip } from "components/layout/Tooltip";
import { Background } from "../../components/Background";
import { Button } from "../../components/Button";
import { Container } from "../../components/Container";
import { Divider } from "../../components/Divider";
import { Embed } from "../../components/Embed";
import { Form } from "../../components/Form";
import { FormElement, OnlyFormElement } from "../../components/FormElement";
import { Image } from "../../components/Image";
import { Text } from "../../components/Text";
import { Video } from "../../components/Video";
import { useRouter, router } from "next/router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { TbCode } from "react-icons/tb";
import { useAtomState, useAtomValue, useEcosystem } from "@zedux/react";
import { useSetAtomState } from "../../utils/atoms";
import { BatchOperationAtom, SessionTokenAtom, SettingsAtom, ShowGridLinesAtom } from "utils/atoms";
import {
  IsolateAtom,
  LastctiveAtom,
  OnlineAtom,
  ScreenshotAtom,
  SideBarAtom,
  SideBarOpen,
  ViewModeAtom,
  isolatePageAlt,
} from "utils/lib";
import { FloatingWidget } from "../FloatingWidget";
import { useAutoOpenSidebar } from "../hooks/useAutoOpenSidebar";
import { useUnifiedDelete } from "../hooks/useUnifiedDelete";
import { DeviceOffline } from "../Toolbar/DeviceOffline";
import { useComponentSync } from "../hooks/useComponentSync";
import { ComponentEditorTabs } from "./ComponentEditorTabs";
import { ViewSelectionAtom } from "../Toolbar/Label";
import { DeviceSelector } from "./DeviceSelector";
import { DeviceZoom } from "./DeviceZoom";
import { GetHtmlToComponent, SaveToServer, buildClonedTree } from "./lib";
import { MinimumSizeOverlay } from "./MinimumSizeOverlay";
import { ViewportMeta } from "./ViewportMeta";

import { PreviewAtom, ViewportScrollAtom, MouseInEditor, UnsavedChangesAtom, ViewAtom, ToolbarTitleAtom, TabAtom, DeviceAtom, DeviceDimensionsAtom, DeviceZoomAtom, EnabledAtom, InitialLoadCompleteAtom } from "./atoms";
import { useEditorStore } from "../../store";
import { EDITOR_CANVAS_BREAKPOINT_PX, isEditorCanvasBreakpointView } from "../../utils/tailwind/className";
import {
  getEditorTabletCanvasClasses,
  getEditorWidthOnlyCanvasClasses,
} from "./editorCanvasLayout";

/** External scrollbar that sits to the right of the mobile device frame */
function DeviceScrollbar({ deviceWidth, deviceHeight, deviceZoom, sideBarOpen, sideBarLeft }: { deviceWidth: number; deviceHeight: number; deviceZoom: number; sideBarOpen: boolean; sideBarLeft: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const thumbHeightRef = useRef(40);
  const rafRef = useRef(0);
  const isDragging = useRef(false);

  // Zoomed dimensions
  const zoomedW = deviceWidth * deviceZoom;
  const zoomedH = deviceHeight * deviceZoom;
  const trackH = zoomedH * 0.8;

  useEffect(() => {
    const viewport = document.getElementById("viewport");
    const container = containerRef.current;
    const thumb = thumbRef.current;
    if (!viewport || !container || !thumb) return;

    const sync = () => {
      if (isDragging.current) return;
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      if (scrollHeight <= clientHeight) {
        container.style.display = "none";
        return;
      }
      container.style.display = "";
      // Position fixed relative to the device frame's screen position
      const deviceEl = viewport.closest("[style*='zoom']") as HTMLElement;
      if (deviceEl) {
        const rect = deviceEl.getBoundingClientRect();
        container.style.left = `${rect.right + 10}px`;
        container.style.top = `${rect.top + rect.height * 0.1}px`;
        container.style.height = `${rect.height * 0.8}px`;
      }
      const tH = container.clientHeight;
      const ratio = clientHeight / scrollHeight;
      const th = Math.max(30, ratio * tH);
      thumbHeightRef.current = th;
      thumb.style.height = `${th}px`;
      thumb.style.top = `${(scrollTop / (scrollHeight - clientHeight)) * (tH - th)}px`;
    };

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(sync);
    };

    sync();
    viewport.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    const observer = new MutationObserver(sync);
    observer.observe(viewport, { childList: true, subtree: true });
    const interval = setInterval(sync, 500);
    return () => {
      viewport.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
      observer.disconnect();
      clearInterval(interval);
      cancelAnimationFrame(rafRef.current);
    };
  }, [deviceZoom, deviceWidth, deviceHeight]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const viewport = document.getElementById("viewport");
    const thumb = thumbRef.current;
    const container = containerRef.current;
    if (!viewport || !thumb || !container) return;
    isDragging.current = true;
    viewport.style.scrollBehavior = "auto";
    const startY = e.clientY;
    const startThumbTop = parseFloat(thumb.style.top || "0");

    const onMouseMove = (e: MouseEvent) => {
      const tH = container.clientHeight;
      const delta = e.clientY - startY;
      const trackRange = tH - thumbHeightRef.current;
      if (trackRange <= 0) return;
      const newTop = Math.max(0, Math.min(trackRange, startThumbTop + delta));
      thumb.style.top = `${newTop}px`;
      const scrollRange = viewport.scrollHeight - viewport.clientHeight;
      viewport.scrollTop = (newTop / trackRange) * scrollRange;
    };

    const onMouseUp = () => {
      isDragging.current = false;
      viewport.style.scrollBehavior = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className="fixed w-1.5 rounded-full bg-border/30 z-[5]"
      style={{
        height: `${trackH}px`,
      }}
    >
      <div
        ref={thumbRef}
        onMouseDown={onMouseDown}
        className="absolute left-0 w-full rounded-full bg-muted-foreground/50 hover:bg-muted-foreground/80 cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}

export const Viewport: React.FC<any> = ({ children }) => {
  const {
    enabled,
    connectors,
    actions: { setOptions },
  } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const { deleteSelectedNode } = useUnifiedDelete();

  // Sync linked components when master components change
  useComponentSync();

  // Auto-open sidebar when nodes are selected
  useAutoOpenSidebar();

  useEffect(() => {
    if (!window) {
      return;
    }

    window.requestAnimationFrame(() => {
      setTimeout(() => {
        setOptions(options => {
          options.enabled = true;
        });
      }, 200);
    });
  }, [setOptions]);

  const { canUndo, canRedo, actions, query, nodeIdKeys } = useEditor((state, query) => ({
    enabled: state.options.enabled,
    canUndo: query.history.canUndo(),
    canRedo: query.history.canRedo(),
    // Subscribe only to node ID list (stable string), not the full nodes object.
    // state.nodes changes on every prop/selection change — this only changes when
    // nodes are added or removed, which is all the drop-detection effect needs.
    nodeIdKeys: Object.keys(state.nodes).join(","),
  }));

  // Store the current set of node ids here
  const nodeIdsRef = useRef<Set<string> | undefined>();
  const isBatchOperation = useAtomValue(BatchOperationAtom);
  const classDarkEdit = useAtomValue(ViewSelectionAtom).dark ?? false;
  const ecosystem = useEcosystem();
  const [showGridLines, setShowGridLines] = useAtomState(ShowGridLinesAtom);

  // Load grid lines preference from localStorage on mount
  useEffect(() => {
    const savedGridLines = localStorage.getItem("showGridLines");
    if (savedGridLines !== null) {
      setShowGridLines(savedGridLines === "true");
    }
  }, [setShowGridLines]);

  // Sync grid lines visibility with viewport attribute and save to localStorage
  useEffect(() => {
    const viewport = document.getElementById("viewport");
    if (viewport) {
      viewport.setAttribute("data-show-gridlines", showGridLines.toString());
    }
    localStorage.setItem("showGridLines", showGridLines.toString());
  }, [showGridLines]);

  useEffect(() => {
    const prevIds = nodeIdsRef.current;
    const currentNodeIds = nodeIdKeys ? nodeIdKeys.split(",") : [];

    if (!prevIds) {
      // Store initial set of node ids
      nodeIdsRef.current = new Set(currentNodeIds);
      return;
    }

    if (currentNodeIds.length !== prevIds.size) {
      const newNodeIds = new Set(currentNodeIds);
      const diffIds = [...newNodeIds].filter(id => !prevIds.has(id));

      if (diffIds.length) {
        // Get the newly added node
        const newNodeId = diffIds[0];
        const newNode = query.node(newNodeId).get();
        const parentNode = newNode?.data?.parent ? query.node(newNode.data.parent).get() : null;

        // Determine drop type based on parent
        let dropType = "unknown";
        if (parentNode) {
          if (parentNode.data.props?.type === "page") {
            dropType = "section"; // Dropped into Page → becomes Section
          } else if (parentNode.data.custom?.displayName === "Section") {
            dropType = "content"; // Dropped into Section → becomes Content
          } else if (parentNode.data.custom?.displayName === "Content") {
            dropType = "component"; // Dropped into Content → first-level child
          }
        }

        // Apply page container styles if added to a page container
        if (parentNode && parentNode.data.props?.type === "page") {
          // Only apply to Container components
          const nodeType = (newNode?.data?.type as any)?.resolvedName || newNode?.data?.type;
          const isContainer = nodeType === "Container";

          // Check if this is a section template (has a meaningful displayName other than "Container")
          const currentDisplayName =
            newNode?.data?.custom?.displayName || newNode?.data?.displayName || "";
          const isFromTemplate =
            currentDisplayName &&
            currentDisplayName !== "Container" &&
            currentDisplayName !== "Section" &&
            currentDisplayName !== "Row" &&
            currentDisplayName !== "Column";

          // Only apply auto-styling if it's a Container and NOT from a template
          if (isContainer && !isFromTemplate) {
            // Section gets NO vars, just basic structure
            // Apply the styles to the new container
            actions.setProp(newNodeId, props => {
              props.className = "w-full flex flex-col";
              props.type = "section";
            });

            // Rename the container to "Section"
            actions.setProp(newNodeId, props => {
              props.custom = {
                ...props.custom,
                displayName: "Section",
              };
            });

            actions.setCustom(newNodeId, custom => (custom.displayName = "Section"));
          }
        }

        // Check if added to a section container (3rd level: root > section > content)
        if (parentNode && parentNode.data.custom?.displayName === "Section") {
          // Only apply to Container components
          const nodeType = (newNode?.data?.type as any)?.resolvedName || newNode?.data?.type;
          const isContainer = nodeType === "Container";

          // Check if this container already has a meaningful displayName (from a template)
          const currentDisplayName =
            newNode?.data?.custom?.displayName || newNode?.data?.displayName || "";
          const isFromTemplate =
            currentDisplayName &&
            currentDisplayName !== "Container" &&
            currentDisplayName !== "Content" &&
            currentDisplayName !== "Row" &&
            currentDisplayName !== "Column";

          // Only apply auto-styling if it's a Container and NOT from a template
          if (isContainer && !isFromTemplate) {
            // Apply the styles to the new container
            actions.setProp(newNodeId, props => {
              props.className = "flex flex-col w-full gap-(--container-gap) items-center py-(--container-padding-y) px-(--container-padding-x) mx-auto max-w-(--content-width)";
            });

            // Rename the container to "Content"
            actions.setCustom(newNodeId, custom => (custom.displayName = "Content"));
          }
        }

        // Check if added to a content container (4th level: root > section > content > first-level child)
        if (parentNode && parentNode.data.custom?.displayName === "Content") {
          // Only apply to Container components
          const nodeType = (newNode?.data?.type as any)?.resolvedName || newNode?.data?.type;
          const isContainer = nodeType === "Container";

          // Check if this container already has a meaningful displayName (from a template)
          const currentDisplayName =
            newNode?.data?.custom?.displayName || newNode?.data?.displayName || "";
          const isFromTemplate =
            currentDisplayName &&
            currentDisplayName !== "Container" &&
            currentDisplayName !== "Row" &&
            currentDisplayName !== "Column";

          // Only apply auto-styling if it's a Container and NOT from a template
          if (isContainer && !isFromTemplate) {
            // Apply the styles to the new container
            actions.setProp(newNodeId, props => {
              props.className = "flex flex-col items-center gap-(--container-gap) w-full max-w-(--content-width) p-(--container-padding)";
            });

          }
        }

        // Read batch flag synchronously from atom instance (not render-cycle value)
        // so list editors can suppress auto-select without React timing issues
        const isBatch = ecosystem.getInstance(BatchOperationAtom).getState();

        // Select the newly added node and scroll to it (but not if it's ROOT_NODE or during batch operations)
        if (newNodeId !== ROOT_NODE && !isBatch) {
          actions.selectNode(newNodeId);
        }

        // Scroll to the newly added node (but not if it's ROOT_NODE or during batch operations)
        if (newNodeId !== ROOT_NODE && !isBatch) {
          setTimeout(() => {
            const node = query.node(newNodeId).get();
            if (node?.dom) {
              node.dom.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }, 100);
        }
      }
      nodeIdsRef.current = newNodeIds;
    }
  }, [nodeIdKeys, query]);

  // TO-DO: what is this ? bad? lazy AI
  // Expose query to window for style guide resolution
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__CRAFT_EDITOR__ = { query };
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__CRAFT_EDITOR__;
      }
    };
  }, [query]);

  const [ac, setAc] = useState(false);
  const setInitialLoadComplete = useSetAtomState(InitialLoadCompleteAtom);
  const nextRouter = useRouter();
  const [isolate, setIsolate] = useAtomState(IsolateAtom);
  const viewMode = useAtomValue(ViewModeAtom);
  const [settings, setSettings] = useAtomState(SettingsAtom);
  const sessionToken = useAtomValue(SessionTokenAtom);

  // Handle URL-based page isolation
  useEffect(() => {

    const pathParts = nextRouter.asPath.split("/").filter(p => p && !p.startsWith("?"));

    const root = query.node(ROOT_NODE).get();
    if (!root) return;

    const handlePageSwitch = async (targetPageId: string | null) => {
      // Save current changes before switching pages
      if (unsavedChanges && Object.keys(unsavedChanges).length > 0) {
        try {
          await SaveToServer(
            unsavedChanges,
            true, // Save as draft
            settings,
            setSettings,
            sessionToken
          );
          setUnsavedChanged(null); // Clear unsaved changes
        } catch (e) {
          console.error("❌ Failed to save changes before URL-based page switch:", e);
          // Continue with page switch even if save fails
        }
      }

      // Now switch to the target page
      isolatePageAlt(isolate, query, targetPageId, actions, setIsolate, true);
    };

    // Check if there's a page slug in the URL (last part of the path)
    if (pathParts.length >= 3) {
      // Has page slug: /build/something/page-slug
      const pageSlug = pathParts[pathParts.length - 1];

      // Find the page that matches this slug
      const matchingPage = root.data.nodes.find(nodeId => {
        const node = query.node(nodeId).get();
        if (node?.data?.props?.type === "page") {
          const displayName = node.data.custom?.displayName;
          const nodeSlug = sluggit(displayName, "-");
          return nodeSlug === pageSlug;
        }
        return false;
      });

      if (matchingPage && matchingPage !== isolate) {
        // Save and isolate the page found in the URL
        setTimeout(() => {
          handlePageSwitch(matchingPage);
        }, 500);
      }
    } else if (pathParts.length === 1 || pathParts.length === 2) {
      // Base URL: /build or /build/something - show home page
      // Find the page marked as home page
      const homePageId = root.data.nodes.find(nodeId => {
        const node = query.node(nodeId).get();
        const isPage = node?.data?.props?.type === "page";
        const isHomePage = node?.data?.props?.isHomePage;
        return isPage && isHomePage;
      });

      if (homePageId && homePageId !== isolate) {
        // Save and isolate the home page
        setTimeout(() => {
          handlePageSwitch(homePageId);
        }, 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextRouter.asPath]);

  const [unsavedChanges, setUnsavedChanged] = useAtomState(UnsavedChangesAtom);

  const view = useAtomValue(ViewAtom);
  const { setView: setStoreView, setPreview: setStorePreview } = useEditorStore();

  // Sync ViewAtom (Zedux) → EditorStore (React context) so components
  // using useView() get the correct view for responsive rendering.
  useEffect(() => {
    setStoreView(view);
  }, [view, setStoreView]);

  const [device, setDevice] = useAtomState(DeviceAtom);
  const deviceDimensions = useAtomValue(DeviceDimensionsAtom);
  const deviceZoom = useAtomValue(DeviceZoomAtom);
  const [preview, setPreview] = useAtomState(PreviewAtom);

  // Sync PreviewAtom → EditorStore so components using usePreview() stay in sync.
  useEffect(() => {
    setStorePreview(preview);
  }, [preview, setStorePreview]);

  const setEnabled = useSetAtomState(EnabledAtom);
  const isolated = useAtomValue(IsolateAtom);
  const lastActive = useAtomValue(LastctiveAtom);
  const screenshot = useAtomValue(ScreenshotAtom);
  const [online, setOnline] = useAtomState(OnlineAtom);
  const sideBarOpen = useAtomValue(SideBarOpen);
  const sideBarLeft = useAtomValue(SideBarAtom);
  const setActiveTab = useSetAtomState(TabAtom);

  // Always enable device view for mobile
  useEffect(() => {
    setDevice(view === "mobile");
  }, [view, setDevice]);

  useEffect(() => {
    localStorage.setItem("clipBoard", JSON.stringify({}));
  }, []);

  const onlineStateChange = async (event) => {
    setOnline(event.type === "online");

    if (event.type !== "online") return;

    setUnsavedChanged(false);
  };

  useEffect(() => {
    setOnline(window.navigator.onLine);

    window.addEventListener("online", onlineStateChange);
    window.addEventListener("offline", onlineStateChange);
    return () => {
      window.removeEventListener("online", onlineStateChange);
      window.removeEventListener("offline", onlineStateChange);
    };
  }, []);

  const hasDirtyChanges = unsavedChanges && (typeof unsavedChanges !== "object" || Object.keys(unsavedChanges).length > 0);

  useEffect(() => {
    if (!hasDirtyChanges) return;

    const warningText = "Leave site? Changes you made may not be saved.";
    const handleWindowClose = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      return (e.returnValue = warningText);
    };

    const handleBrowseAway = (url: string) => {
      // Check if navigating within the same build context (just changing pages)
      const currentPath = router.asPath;
      const currentParts = currentPath.split("/").filter(p => p && !p.startsWith("?"));
      const newParts = url.split("/").filter(p => p && !p.startsWith("?"));

      // If both URLs are /build/[tenant]/... then it's just page navigation
      if (
        currentParts.length >= 2 &&
        newParts.length >= 2 &&
        currentParts[0] === "build" &&
        newParts[0] === "build" &&
        currentParts[1] === newParts[1]
      ) {
        // Same build context, allow navigation without warning
        return;
      }

      // Different context, show warning
      if (window.confirm(warningText)) return;
      router.events.emit("routeChangeError");
      // throw new Error("routeChange aborted.");
    };

    window.addEventListener("beforeunload", handleWindowClose);
    router.events.on("routeChangeStart", handleBrowseAway);
    return () => {
      window.removeEventListener("beforeunload", handleWindowClose);
      router.events.off("routeChangeStart", handleBrowseAway);
    };
  }, [hasDirtyChanges, router]);

  const {
    actions: { setProp },
  } = useEditor(() => ({}));

  const fromEntries = pairs => {
    if (Object.fromEntries) {
      return Object.fromEntries(pairs);
    }
    return pairs.reduce(
      (accum, [id, value]) => ({
        ...accum,
        [id]: value,
      }),
      {}
    );
  };

  const getCloneTree = useCallback(
    (tree: NodeTree) => buildClonedTree({ tree, query, setProp }),
    [query]
  );

  async function checkIfHtmlInClipboard() {
    let text = await navigator.clipboard.readText();
    text = text.replace(/\s+/g, " ").trim();
    text = text.replace(/\s{2,}/g, " "); // replace any sequence of 2 or more whitespace characters with a single space

    if (text.startsWith("<")) {
      // The clipboard contains HTML starting with <div>
      return text;
    }

    return null;
  }

  const handleSaveTemplate = useCallback(() => {
    const active = query.getEvent("selected").first();
    const node = query.node(active).get();

    if (["page", "background"].includes(node.data.props.type))
      return localStorage.setItem("clipBoard", JSON.stringify({}));

    const tree = query.node(active).toNodeTree();
    const nodePairs = Object.keys(tree.nodes).map(id => [id, query.node(id).toSerializedNode()]);
    const serializedNodesJSON = JSON.stringify(fromEntries(nodePairs));
    const saveData = {
      rootNodeId: tree.rootNodeId,
      nodes: serializedNodesJSON,
    };
    // save to your database
    localStorage.setItem("clipBoard", JSON.stringify(saveData));
  }, [query]);

  // add templates where you want
  const handleAdd = useCallback(async () => {
    let active = query.getEvent("selected").first();

    if (!active) active = ROOT_NODE;
    const id = active;
    // get the template from your database

    const pasties = await checkIfHtmlInClipboard();
    if (pasties) {
      const editorComponents = {
        Background,
        Container,
        Text,
        OnlyFormElement,
        Form,
        FormElement,
        Button,
        Video,
        Image,
        Embed,
        Divider,
      };

      const toNode = (data, parent = ROOT_NODE) => {
        if (!data.type) return;

        const result = {
          data: {
            type: editorComponents[data.type],
            props: data.props,
          },
        };

        let freoshNode = null;

        try {
          freoshNode = query.parseFreshNode(result).toNode();

          actions.add(freoshNode, parent);
        } catch (e) {
          console.error(e);
        }

        if (!freoshNode) return null;

        if (data.children) {
          data.children.forEach(child => {
            toNode(child, freoshNode.id);
          });
        }

        return freoshNode;
      };

      const data = await GetHtmlToComponent(pasties);

      if (data.result) {
      }
    }
  }, [actions, getCloneTree, query]);

  // Handle double-click to reset tab to main tab
  const handleDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      // Only handle double-clicks on components (not empty areas)
      const target = event.target as HTMLElement;
      const nodeId = target.closest("[node-id]")?.getAttribute("node-id");

      if (nodeId) {
        // Reset the active tab to empty string, which will trigger useDefaultTab to set it to the first tab
        setTimeout(() => setActiveTab(""), 600);
      }
    },
    [setActiveTab]
  );

  const handleBodyKeyDown = event => {
    if (event.key === "Escape") {
      if (preview) {
        event.preventDefault();
        // Save viewport scroll position before toggling
        const viewport = document.getElementById("viewport");
        const scrollTop = viewport?.scrollTop ?? 0;
        const scrollLeft = viewport?.scrollLeft ?? 0;

        actions.setOptions(options => {
          // selectNode(ROOT_NODE);
          options.enabled = !enabled;

          setPreview(false);
          setEnabled(true);

          setTimeout(() => {
            if (!lastActive) return;
            const node = query.node(lastActive).get();
            if (node) actions.selectNode(lastActive);
          }, 100);
        });

        // Restore scroll position after layout settles
        requestAnimationFrame(() => {
          if (viewport) {
            viewport.scrollTop = scrollTop;
            viewport.scrollLeft = scrollLeft;
          }
        });
      }
    }
  };

  const handleKeyDown = event => {
    // Don't handle keyboard shortcuts when user is typing in an input field
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.contentEditable === "true"
    ) {
      return;
    }

    const charCode = String.fromCharCode(event.which).toLowerCase();

    handleBodyKeyDown(event);
    // copy
    if ((event.ctrlKey || event.metaKey) && charCode === "c") {
      if (window.getSelection()?.toString()) return;
      event.preventDefault();

      try {
        handleSaveTemplate();
      } catch (e) {
        console.error(e);
      }

      return;
    }

    // paste
    if ((event.ctrlKey || event.metaKey) && charCode === "v") {
      event.preventDefault();

      // if we get position of mouse over selected div we can order better..
      // var elements = Array.from(document.querySelectorAll(":hover"));

      handleAdd();

      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();

      try {
        const active = query.getEvent("selected").first();
        if (active) {
          // Get the background node (first child of ROOT_NODE)
          const rootNode = query.node(ROOT_NODE).get();
          const backgroundNodeId = rootNode?.data?.nodes?.[0];

          if (backgroundNodeId) {
            actions.selectNode(backgroundNodeId);
          }
        }
      } catch (e) {
        console.error(e);
      }

      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();

      try {
        const active = query.getEvent("selected").first();
        const theNode = query.node(active).get();
        const parentNode = query.node(theNode.data.parent).get();
        const indexToAdd = parentNode.data.nodes.indexOf(active);
        let index = indexToAdd + 1;

        if (index + 1 > parentNode.data.nodes.length) index = 0;

        const ee = query.node(parentNode.data.nodes[index]).get();
        const theNewNode = query.node(ee.id).get();

        actions.selectNode(theNewNode.id);
      } catch (e) {
        console.error(e);
      }

      return;
    }

    if (event.which === 8) {
      try {
        event.preventDefault();
        deleteSelectedNode();
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && charCode === "s") {
      try {
        event.preventDefault();
        SaveToServer(query.serialize(), true, settings, setSettings);
        setUnsavedChanged(false);
      } catch (e) {
        console.error(e);
      }

      return;
    }

    if ((event.ctrlKey || event.metaKey) && charCode === "z") {
      try {
        event.preventDefault();
        canUndo && actions?.history?.undo();
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if ((event.ctrlKey || event.metaKey) && charCode === "y") {
      try {
        event.preventDefault();
        canRedo && actions?.history?.redo();
      } catch (e) {
        console.error(e);
      }
    }
  };

  // No sidebar padding needed — Toolbar is now an in-flow flex child.
  // #viewport gets flex-1 so it fills the remaining width naturally.

  const deviceClasses = {
    mobile: [
      "mx-auto flex z-2 transition overflow-hidden shrink-0 p-[6px] rounded-[44px] bg-[#1a1a1a] border-[3px] border-[#2a2a2a] shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_20px_60px_-10px_rgba(0,0,0,0.5),0_0_40px_-5px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05)] relative",
      "w-full h-full flex overflow-auto rounded-[38px] relative bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    ],

    desktop: [
      enabled
        ? "flex h-full overflow-hidden flex-row w-full w-full absolute top-0 left-0 right-0 bottom-0"
        : "",
      enabled
        ? `w-full h-full overflow-auto ${viewMode === "component" ? "mt-[49px]" : ""} `
        : "w-full h-full overflow-auto",
    ],
  };

  // Bezel: 6px padding + 3px border on each side
  const bezelX = (6 + 3) * 2; // 18px total horizontal
  const bezelY = (6 + 3) * 2; // 18px total vertical

  const deviceStyles =
    device && view === "mobile"
      ? {
        width: `${deviceDimensions.width + bezelX}px`,
        height: `${deviceDimensions.height + bezelY}px`,
        zoom: deviceZoom,
        "--device-zoom-inverse": 1 / deviceZoom,
      } as React.CSSProperties
      : {};

  const desktopOuter = enabled ? "flex h-full overflow-hidden flex-row flex-1 min-w-0" : "flex h-full flex-row min-w-0 w-full";
  const desktopInner = enabled
    ? "flex-1 min-w-0 relative scrollbar-light bg-background overflow-y-auto overflow-x-hidden"
    : "w-full h-full overflow-auto relative";

  let viewClasses = {
    mobile: [
      `flex overflow-hidden flex-row mx-auto w-${enabled ? "[380px]" : "full"} h-full `,
      enabled
        ? "w-full rounded-lg overflow-y-auto overflow-x-hidden scrollbar-light bg-background relative"
        : "w-full h-full overflow-auto relative",
    ],

    desktop: [desktopOuter, desktopInner],
  };

  viewClasses.sm = getEditorTabletCanvasClasses(enabled, EDITOR_CANVAS_BREAKPOINT_PX.sm);

  ["md", "lg", "xl", "2xl"].forEach(bp => {
    const px = EDITOR_CANVAS_BREAKPOINT_PX[bp];
    viewClasses[bp] = getEditorWidthOnlyCanvasClasses(enabled, desktopOuter, desktopInner, px);
  });

  if (device) {
    viewClasses = deviceClasses;
  }

  const activeClass = viewClasses[view] ?? viewClasses.desktop;

  useEffect(() => {
    document.addEventListener("keydown", handleBodyKeyDown);
    return () => {
      document.removeEventListener("keydown", handleBodyKeyDown);
    };
  }, []);

  return (
    <>
      <ViewportMeta />

      {/* Main layout container */}
      <div
        className={`flex h-full overflow-hidden flex-1 min-w-0 w-full ${
          (device && view === "mobile") || isEditorCanvasBreakpointView(view)
            ? "items-center justify-center bg-muted/50"
            : "flex-row"
        }`}
        data-container={true}
      >
        {/* Preview mode: "Edit" button */}
        {!enabled && !screenshot && (
          <FloatingWidget
            storageKey="preview-edit"
            defaultCorner={sideBarLeft ? "top-left" : "top-right"}
          >
            <Tooltip content="Edit" placement="bottom" arrow={false}>
              <button
                className="btn cursor-pointer select-none rounded-full bg-primary p-4 text-2xl text-primary-foreground shadow-lg"
                aria-label="Edit page"
                onClick={() => {
                  // Save viewport scroll position before toggling
                  const viewport = document.getElementById("viewport");
                  const scrollTop = viewport?.scrollTop ?? 0;
                  const scrollLeft = viewport?.scrollLeft ?? 0;

                  setOptions(options => {
                    options.enabled = true;
                    setPreview(false);
                    setTimeout(() => {
                      if (!lastActive) return;
                      const node = query.node(lastActive).get();
                      if (node) actions.selectNode(lastActive);
                    }, 0);
                  });

                  // Restore scroll position after layout settles
                  requestAnimationFrame(() => {
                    if (viewport) {
                      viewport.scrollTop = scrollTop;
                      viewport.scrollLeft = scrollLeft;
                    }
                  });
                }}
              >
                <TbCode />
              </button>
            </Tooltip>
          </FloatingWidget>
        )}

        {/* Offline indicator */}
        {enabled && !online && <DeviceOffline />}

        {/* Component Editor Tabs - absolute positioned above viewport, after sidebar */}
        {enabled && (
          <div
            className={`absolute top-0 ${sideBarOpen && sideBarLeft ? "left-[360px]" : "left-0"} right-0 z-40 ${viewMode === "component" ? "" : "hidden"}`}
          >
            <ComponentEditorTabs />
          </div>
        )}

        {/* Device Selector & Zoom - shown above device preview in mobile view */}
        {enabled && device && view === "mobile" && (
          <div
            className={`absolute top-4 ${sideBarOpen && sideBarLeft ? "left-[360px]" : "left-0"} right-0 z-50`}
          >
            <div className="mx-auto flex w-fit items-center gap-4 rounded-lg bg-muted/95 px-4 py-2 shadow-lg backdrop-blur-sm">
              <DeviceSelector onClose={() => setDevice(false)} />
              <div className="h-4 w-px bg-border" />
              <DeviceZoom />
            </div>
          </div>
        )}

        {/* Viewport container */}
        <div className={`${activeClass[0]} w-full`} style={deviceStyles}>
          {/* Dynamic Island - overlays on screen content */}
          {device && view === "mobile" && (
            <div className="absolute top-[14px] left-0 right-0 z-[60] flex justify-center pointer-events-none">
              <div className="h-[30px] w-[105px] rounded-full bg-[#0a0a0a]" />
            </div>
          )}
          <div
            id="viewport"
            role="main"
            onKeyDown={handleKeyDown}
            onDoubleClick={handleDoubleClick}
            data-isolated={!!isolated}
            tabIndex={0}
            className={`${activeClass[1]} w-full${classDarkEdit ? " dark" : ""}`}
            ref={(ref: any) => connectors.select(connectors.hover(ref, null), null)}
            style={
              viewMode === "component" && !device && !preview ? { marginTop: "49px" } : undefined
            }
          >
            {children}
          </div>
          {/* Home Indicator - overlays on screen content */}
          {device && view === "mobile" && (
            <div className="absolute bottom-[14px] left-0 right-0 z-[60] flex justify-center pointer-events-none">
              <div className="h-[5px] w-[120px] rounded-full bg-foreground/30" />
            </div>
          )}
        </div>

        {/* External scrollbar for mobile device preview */}
        {device && view === "mobile" && enabled && (
          <DeviceScrollbar deviceWidth={deviceDimensions.width + bezelX} deviceHeight={deviceDimensions.height + bezelY} deviceZoom={deviceZoom} sideBarOpen={sideBarOpen} sideBarLeft={sideBarLeft} />
        )}


        {/* Portal target for node tools in device mode — sits outside the zoomed/clipped device frame */}
        {device && view === "mobile" && (
          <div id="device-tools-portal" className="pointer-events-none absolute inset-0 z-[100]" />
        )}

        {/* SVG overlay for measurement lines */}
        {enabled && (
          <svg
            id="measurement-lines-svg"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              zIndex: 9997,
            }}
          />
        )}
      </div>

      {/* Minimum size overlay */}
      {enabled && <MinimumSizeOverlay />}
    </>
  );
};
