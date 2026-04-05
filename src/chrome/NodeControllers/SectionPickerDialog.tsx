// @ts-nocheck
import { Element, useEditor } from "@craftjs/core";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { MdClose, MdSearch } from "react-icons/md";
import { TbLayoutGridAdd } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { ComponentsAtom } from "utils/lib";
import { useSectionTemplates } from "../../utils/useSectionTemplates";
import { ComponentPreview } from "./Tools/ComponentPreview";

// Convert JSON structure to React Element
const buildElementFromStructure = (
  structure: any,
  key?: string,
  isPreview: boolean = false,
  resolver?: any
): any => {
  // Resolve the component from the globalThis-locked resolver. This is safe across
  // Next.js Fast Refresh because the resolver is locked to globalThis on first load.
  const Component = resolver ? resolver[structure.type] : null;
  if (!Component) {
    console.warn(`[SectionPicker] Unknown component type: ${structure.type} — skipping`);
    return null;
  }

  const previewPrefix = isPreview ? "preview-" : "";
  const uniqueKey = `${previewPrefix}${key || "root"}`;

  const children = structure.children?.map((child: any, index: number) =>
    buildElementFromStructure(child, `${uniqueKey}-${index}`, isPreview, resolver)
  );

  // Reduce padding for preview mode
  const props = isPreview ? {
    ...structure.props,
    className: structure.props.className?.replace(/py-\d+/g, 'py-2').replace(/p-\d+/g, 'p-2') || undefined
  } : structure.props;

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

// Convert JSON templates to usable format
const convertTemplates = (categoryId: string, resolver: any, templateData: any) => {
  const templates = templateData?.templates?.[categoryId] || [];
  return templates.map(template => ({
    id: template.slug || template.id,
    name: template.name,
    element: buildElementFromStructure(template.structure, template.slug || template.id, false, resolver),
    structure: template.structure,
  }));
};

// Search across all templates
const searchTemplates = (searchQuery: string, resolver: any, templateData: any, categories: any[]) => {
  if (!searchQuery.trim()) return [];

  const allTemplates = [];
  Object.entries(templateData?.templates || {}).forEach(([categoryId, templates]: any) => {
    templates.forEach(template => {
      if (template.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        allTemplates.push({
          id: template.slug || template.id,
          name: template.name,
          categoryId,
          categoryName: categories.find(c => c.id === categoryId)?.name || categoryId,
          element: buildElementFromStructure(template.structure, template.slug || template.id, false, resolver),
          structure: template.structure,
        });
      }
    });
  });
  return allTemplates;
};

interface SectionPickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (element: any) => void;
}

export const SectionPickerDialog = ({
  isOpen,
  onClose,
  onSelectSection,
}: SectionPickerDialogProps) => {
  const { query, actions } = useEditor();
  const components = useAtomValue(ComponentsAtom);
  const { data: templateData, isLoading } = useSectionTemplates();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);
  const dialogRef = useRef(null);

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

  const baseCategories = useMemo(() => [
    { id: "all", name: "All" },
    { id: "my-sections", name: "My Blocks" },
    ...(templateData?.categories || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
  ], [templateData]);

  // Show/hide category based on whether there are custom sections
  const categories = useMemo(() => {
    if (customSections.length === 0) {
      return baseCategories.filter(c => c.id !== "my-sections");
    }
    return baseCategories;
  }, [customSections, baseCategories]);

  useEffect(() => {
    const handleClickOutside = event => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = event => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const templates = useMemo(() => {
    const resolver = query.getOptions().resolver;

    if (isSearchMode && searchQuery.trim()) {
      const builtInTemplates = searchTemplates(searchQuery, resolver, templateData, categories);
      const matchingCustom = customSections.filter(section =>
        section.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      return [...matchingCustom, ...builtInTemplates];
    }

    if (selectedCategory === "my-sections") {
      return customSections;
    }

    if (selectedCategory === "all") {
      const allTemplates = [];
      categories.forEach(category => {
        if (category.id !== "all" && category.id !== "my-sections") {
          const categoryTemplates = convertTemplates(category.id, resolver, templateData);
          allTemplates.push(...categoryTemplates);
        }
      });
      return [...customSections, ...allTemplates];
    }

    return convertTemplates(selectedCategory, resolver, templateData);
  }, [selectedCategory, isSearchMode, searchQuery, customSections, categories, templateData]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setIsSearchMode(query.trim().length > 0);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsSearchMode(false);
    setSearchQuery("");
  };

  // Don't render on server-side
  if (typeof window === "undefined") {
    return null;
  }

  return ReactDOM.createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-100 flex items-center justify-center bg-background/75 backdrop-blur-sm"
          style={{ pointerEvents: "auto" }}
        >
          <motion.div
            ref={dialogRef}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="flex h-[80vh] w-[33vw] max-w-md flex-col overflow-hidden rounded-lg border border-border bg-background shadow-2xl"
            style={{
              willChange: "transform",
              backfaceVisibility: "hidden",
              WebkitFontSmoothing: "antialiased",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-accent px-6 py-4 text-accent-foreground">
              <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                <TbLayoutGridAdd className="size-7" />
                Add Section
              </h2>
              <button
                onClick={onClose}
                className="text-muted-foreground transition-colors hover:text-muted-foreground"
                aria-label="Close"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left sidebar - Categories */}
              <div className="flex w-64 flex-col border-r border-border bg-muted text-muted-foreground">
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className={`w-full rounded-lg px-4 py-2 text-left transition-colors ${selectedCategory === category.id && !isSearchMode
                          ? "bg-primary font-medium text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                          }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar - Bottom of sidebar */}
                <div className="border-t border-border p-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background py-2 pl-8 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <MdSearch
                      className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={16}
                    />
                  </div>
                </div>
              </div>

              {/* Right content - Templates */}
              <div className="flex-1 overflow-y-auto p-6">
                <div
                  key={isSearchMode ? `search-${searchQuery}` : selectedCategory}
                  className="grid grid-cols-1 gap-6"
                >
                  {templates.map((template, templateIndex) => (
                    <motion.button
                      key={`${isSearchMode ? "search" : selectedCategory}-${template.isCustom ? "custom" : "builtin"}-${template.id}-${templateIndex}`}
                      //   whileHover={{ scale: 1.1 }}
                      //    whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        if (template.isCustom) {
                          // For custom sections, get the serialized node and reconstruct
                          try {
                            const masterNode = query.node(template.rootNodeId).get();
                            if (masterNode) {
                              // Get the component registry
                              const componentRegistry = query.getOptions().resolver;

                              // Recursively build React elements for children
                              const uniquePrefix = `section-${Date.now()}`;
                              const buildElement = (nodeId, index = 0) => {
                                const node = query.node(nodeId).get();
                                if (!node) return null;

                                const serializedNode = query.node(nodeId).toSerializedNode();
                                const typeName =
                                  typeof serializedNode.type === "string"
                                    ? serializedNode.type
                                    : serializedNode.type?.resolvedName || "Container";

                                // Resolve from the live (globalThis-locked) resolver
                                const liveResolver = query.getOptions().resolver;
                                const Comp = liveResolver?.[typeName] ?? typeName;

                                const children = node.data.nodes
                                  .map((childId, childIndex) => buildElement(childId, childIndex))
                                  .filter(Boolean);

                                return (
                                  <Element
                                    key={`${uniquePrefix}-${index}`}
                                    canvas={serializedNode.props.canvas}
                                    is={Comp}
                                    {...serializedNode.props}
                                  >
                                    {children}
                                  </Element>
                                );
                              };

                              const freshElement = buildElement(template.rootNodeId);
                              onSelectSection(freshElement);
                            }
                          } catch (e) {
                            console.error("Error creating custom section:", e);
                          }
                        } else {
                          onSelectSection(template.element);
                        }
                        onClose();
                      }}
                      className="group relative overflow-hidden rounded-lg border-2 border-border bg-card text-card-foreground shadow-sm transition-all hover:border-primary hover:shadow-md"
                      style={{
                        willChange: "transform",
                        backfaceVisibility: "hidden",
                        WebkitFontSmoothing: "antialiased",
                      }}
                    >
                      {/* Preview */}
                      {template.isCustom ? (
                        // Preview for custom sections - use ComponentPreview
                        <>
                          <ComponentPreview
                            component={buildComponentFromNode(template.rootNodeId, query)}
                            scale={0.2}
                            resolver={query.getOptions().resolver}
                          />
                          {/* Custom Section Badge */}
                          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-primary-foreground shadow-sm">
                            <TbLayoutGridAdd className="size-3" />
                            <span className="text-xs font-medium">Custom</span>
                          </div>
                        </>
                      ) : (
                        // Preview for built-in templates - use ComponentPreview
                        <ComponentPreview 
                          component={template.structure} 
                          scale={0.2} 
                          resolver={query.getOptions().resolver}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>

                {templates.length === 0 && (
                  <div className="flex h-64 items-center justify-center">
                    <p className="text-lg text-muted-foreground">
                      {isSearchMode
                        ? `No templates found for "${searchQuery}"`
                        : "No templates available for this category yet."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
