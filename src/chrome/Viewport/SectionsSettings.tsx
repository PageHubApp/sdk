// @ts-nocheck
import { Element, useEditor } from "@craftjs/core";
import { useAtomValue } from "@zedux/react";
import { useSectionTemplates } from "../../utils/useSectionTemplates";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { SectionPickerDialogAtom } from "utils/atoms";
import { ComponentsAtom, HeaderMenuAtom } from "utils/lib";
import { useSetAtomState } from "../../utils/atoms";
import { useInsertTarget } from "../hooks/useInsertTarget";
import { ComponentPreview } from "../NodeControllers/Tools/ComponentPreview";
import { AutoHideScrollbar } from "../shared/layout";
import { AddElement } from "./Toolbox/lib";

// Convert JSON structure to React Element
const buildElementFromStructure = (
  structure: any,
  key?: string,
  isPreview: boolean = false,
  resolver?: any
): any => {
  // Resolve from globalThis-locked resolver — safe across Next.js Fast Refresh
  const Component = resolver ? resolver[structure.type] : null;
  if (!Component) {
    console.warn(`[SectionsSettings] Unknown component type: ${structure.type}`);
    return null;
  }

  const previewPrefix = isPreview ? "preview-" : "";
  const uniqueKey = `${previewPrefix}${key || "root"}`;

  const children = structure.children?.map((child: any, index: number) =>
    buildElementFromStructure(child, `${uniqueKey}-${index}`, isPreview, resolver)
  );

  // Reduce padding for preview mode
  const props = isPreview
    ? {
      ...structure.props,
      className:
        structure.props.className?.replace(/py-\d+/g, "py-2").replace(/p-\d+/g, "p-2") ||
        undefined,
    }
    : structure.props;

  return (
    <Element key={uniqueKey} canvas is={Component} {...props}>
      {children}
    </Element>
  );
};

// Helper function to build component structure from node
const buildComponentFromNode = (nodeId: string, query: any): any => {
  try {
    const node = query.node(nodeId).get();
    if (!node) return null;

    const serialized = query.node(nodeId).toSerializedNode();
    const typeName =
      typeof serialized.type === "string" ? serialized.type : serialized.type?.resolvedName;

    return {
      type: typeName || "Container",
      props: serialized.props,
      children: node.data.nodes
        .map((childId: string) => buildComponentFromNode(childId, query))
        .filter(Boolean),
    };
  } catch (e) {
    console.error("Error building component from node:", e);
    return null;
  }
};

// baseCategories and convertTemplates are now built inside the component
// so they can reference the live resolver from CraftJS.

// Render section tool component with drag and double-click functionality
const RenderSectionToolComponent = ({ template, isCustom = false }) => {
  const { actions, query } = useEditor();
  const {
    enabled,
    connectors: { create },
  } = useEditor(state => ({
    enabled: state.options.enabled,
  }));

  const setHeaderMenu = useSetAtomState(HeaderMenuAtom);
  const positionInfo = useAtomValue(SectionPickerDialogAtom);
  const setPositionInfo = useSetAtomState(SectionPickerDialogAtom);
  const [isDragging, setIsDragging] = useState(false);
  const { getTargetPageId } = useInsertTarget();

  const resolver = query.getOptions().resolver;

  // Memoize custom section preview to avoid re-running on every scroll/render.
  // Also guards against deleted nodes — buildComponentFromNode can throw if
  // the node was removed between renders.
  const customPreview = useMemo(() => {
    if (!isCustom || !template.rootNodeId) return null;
    try {
      return buildComponentFromNode(template.rootNodeId, query);
    } catch {
      return null;
    }
  }, [isCustom, template.rootNodeId, query]);

  // Create the tool element
  const tool = template.element || (
    <Element
      canvas
      is={Container}
      canDelete={true}
      canEditName={true}
      {...template.structure.props}
    />
  );

  // Handle double-click to add section
  const handleDoubleClick = () => {
    let element = null;

    // Build the element first
    if (isCustom) {
      // For custom sections, get the serialized node and reconstruct
      try {
        const masterNode = query.node(template.rootNodeId).get();
        if (masterNode) {
          const uniquePrefix = `section-${Date.now()}`;

          const buildElement = (nodeId, index = 0) => {
            const node = query.node(nodeId).get();
            if (!node) return null;

            const serializedNode = query.node(nodeId).toSerializedNode();
            const typeName =
              typeof serializedNode.type === "string"
                ? serializedNode.type
                : serializedNode.type?.resolvedName || "Container";

            const children = node.data.nodes
              .map((childId, childIndex) => buildElement(childId, childIndex))
              .filter(Boolean);

            return (
              <Element
                key={`${uniquePrefix}-${index}`}
                canvas={serializedNode.props.canvas}
                is={typeName}
                {...serializedNode.props}
              >
                {children}
              </Element>
            );
          };

          element = buildElement(template.rootNodeId);
        }
      } catch (e) {
        console.error("Error creating custom section:", e);
      }
    } else {
      // For built-in templates, build from structure
      element = buildElementFromStructure(template.structure, template.id, false);
    }

    if (!element) return;

    // Check if we have specific position info (from AddSectionNodeController)
    if (positionInfo.nodeId && positionInfo.parent) {
      // Use the specific position provided
      const parentNodeData = query.node(positionInfo.parent).get();
      const currentIndex = parentNodeData.data.nodes.indexOf(positionInfo.nodeId);
      const newIndex = positionInfo.position === "bottom" ? currentIndex + 1 : currentIndex;

      AddElement({
        element,
        actions,
        query,
        addTo: positionInfo.parent,
        index: newIndex,
      });

      // Clear position info after using it
      setPositionInfo({
        isOpen: false,
        nodeId: null,
        position: null,
        parent: null,
      });
    } else {
      // Fall back to auto-detection (e.g., when opened from header directly)
      const targetPageId = getTargetPageId();
      AddElement({
        element,
        actions,
        query,
        addTo: targetPageId,
      });
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.9 }}
      ref={(ref: any) => create(ref, tool)}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onDoubleClick={handleDoubleClick}
      style={{
        willChange: "transform",
        backfaceVisibility: "hidden",
        WebkitFontSmoothing: "antialiased",
      }}
      className="group relative cursor-pointer overflow-hidden rounded-lg border-2 border-border bg-card text-card-foreground shadow-sm transition-all hover:border-primary hover:shadow-md"
    >
      {/* Preview */}
      {isCustom ? (
        // Preview for custom sections - use ComponentPreview
        <>
          {customPreview && (
            <ComponentPreview
              component={customPreview}
              scale={0.2}
              resolver={resolver}
            />
          )}
          {/* Custom Section Badge */}
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-primary-foreground shadow-sm">
            <span className="text-xs font-medium">Custom</span>
          </div>
        </>
      ) : (
        // Preview for built-in templates - use ComponentPreview
        <ComponentPreview component={template.structure} scale={0.2} resolver={resolver} />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/10 opacity-0 transition-opacity group-hover:opacity-100" />

      {/* Section name overlay */}
      <div className="absolute inset-x-2 bottom-2 z-10 hidden">
        <div className="rounded bg-black/70 px-2 py-1 text-center text-xs text-white">
          {template.name}
        </div>
      </div>
    </motion.div>
  );
};

// Search across all templates (resolver threaded in from component)
const searchTemplates = (searchQuery: string, resolver: any, data: any) => {
  if (!searchQuery.trim()) return [];
  const allTemplates = [];
  Object.entries(data.templates || {}).forEach(([categoryId, templates]: any) => {
    (templates as any[]).forEach(template => {
      if (template.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        allTemplates.push({
          id: template.id,
          name: template.name,
          categoryId,
          categoryName: categoryId,
          element: buildElementFromStructure(template.structure, template.id, false, resolver),
          structure: template.structure,
        });
      }
    });
  });
  return allTemplates;
};

interface SectionsSettingsProps { }

export const SectionsSettings = ({ }: SectionsSettingsProps) => {
  const { query, actions } = useEditor();
  const { data: templateData } = useSectionTemplates();
  // Get the live CraftJS resolver so buildElementFromStructure can look up components
  const resolver = useMemo(() => {
    try { return (query as any).getOptions?.()?.resolver ?? {}; } catch { return {}; }
  }, [query]);

  // Build categories and convertTemplates inside the component referencing live data
  const baseCategories = useMemo(() => [
    { id: "all", name: "All" },
    { id: "my-sections", name: "My Blocks" },
    ...(templateData?.categories || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
  ], [templateData]);

  const convertTemplates = (categoryId: string) => {
    const templates = (templateData?.templates as any)?.[categoryId] || [];
    const category = (templateData?.categories || []).find((cat: any) => cat.id === categoryId);
    return templates.map((template: any) => ({
      id: template.slug || template.id,
      name: template.name,
      element: buildElementFromStructure(template.structure, template.slug || template.id, false, resolver),
      structure: template.structure,
      categoryId: categoryId,
      categoryOrder: category?.order || 0,
    }));
  };

  const components = useAtomValue(ComponentsAtom);
  const setHeaderMenu = useSetAtomState(HeaderMenuAtom);
  const [search, setSearch] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const focusRef = useRef(null);

  // Filter to only get sections
  const customSections = useMemo(() => {
    return components
      .filter(c => c.isSection)
      .map(component => ({
        id: component.rootNodeId,
        name: component.name,
        element: null, // Will be created from the master node when selected
        isCustom: true,
        rootNodeId: component.rootNodeId,
      }));
  }, [components]);

  // Show/hide category based on whether there are custom sections
  const categories = useMemo(() => {
    if (customSections.length === 0) {
      // No custom sections, exclude "My Sections" category
      return baseCategories.filter(c => c.id !== "my-sections");
    }
    return baseCategories;
  }, [customSections, baseCategories]);

  useEffect(() => {
    const time = setTimeout(() => focusRef?.current?.focus(), 50);
    return () => clearTimeout(time);
  }, [focusRef]);

  const templates = useMemo(() => {
    if (isSearchMode && search.trim()) {
      // Include custom sections in search
      const builtInTemplates = searchTemplates(search, resolver, templateData || { templates: {} });
      const matchingCustom = customSections.filter(section =>
        section.name.toLowerCase().includes(search.toLowerCase())
      );
      return [...matchingCustom, ...builtInTemplates];
    }

    // Show all templates in a flat list
    const allTemplates = [];

    // Add custom sections first
    allTemplates.push(...customSections);

    // Add all built-in templates
    categories.forEach(category => {
      if (category.id !== "all" && category.id !== "my-sections") {
        const categoryTemplates = convertTemplates(category.id);
        allTemplates.push(...categoryTemplates);
      }
    });

    return allTemplates;
  }, [isSearchMode, search, customSections, categories]);

  const handleSearch = (query: string) => {
    setSearch(query);
    setIsSearchMode(query.trim().length > 0);
  };

  const [activeCategory, setActiveCategory] = useState("all");

  const filteredTemplates = useMemo(() => {
    let result = templates;

    if (activeCategory === "my-sections") {
      result = result.filter((t: any) => t.isCustom);
    } else if (activeCategory !== "all") {
      result = result.filter((t: any) => t.categoryId === activeCategory);
    }

    if (isSearchMode && search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t: any) => t.name?.toLowerCase().includes(q));
    }

    return result;
  }, [templates, activeCategory, isSearchMode, search]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <form
        onSubmit={e => {
          handleSearch(e.target[0].value);
          e.preventDefault();
        }}
      >
        <div className="flex gap-1.5 p-3 pb-0">
          <input
            type="text"
            placeholder="Search Blocks"
            className="input-transparent"
            ref={focusRef}
            value={search}
            onChange={e => handleSearch(e.target.value)}
          />
        </div>
      </form>

      {/* Category pills */}
      <div
        className="flex gap-1.5 overflow-x-auto p-3 pb-2"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", msOverflowStyle: "none" }}
      >
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`cursor-pointer whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      <AutoHideScrollbar className="flex-1">
        <div className="grid w-full grid-cols-1 gap-3 p-3 pt-1">
          {filteredTemplates.map((template, templateIndex) => (
            <RenderSectionToolComponent
              key={`${template.isCustom ? "custom" : "builtin"}-${template.id}-${templateIndex}`}
              template={template}
              isCustom={template.isCustom}
            />
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="flex h-32 items-center justify-center p-6">
            <p className="text-muted-foreground">
              {isSearchMode ? `No sections found for "${search}"` : "No sections in this category."}
            </p>
          </div>
        )}
      </AutoHideScrollbar>
    </div>
  );
};
