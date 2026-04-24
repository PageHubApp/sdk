import { Element, useEditor } from "@craftjs/core";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { MdClose, MdSearch } from "react-icons/md";
import { TbLayoutGridAdd } from "react-icons/tb";
import { useAtomValue } from "@zedux/react";
import { ComponentsAtom } from "../../utils/lib";
import { useSectionTemplates } from "../../utils/useSectionTemplates";
import { buildCraftTreeFromStructure } from "../structure/buildCraftTreeFromStructure";
import { ComponentPreview } from "./node-tools/ComponentPreview";

/** Insert payload for built-in section presets (same tree builder as library toolbox). */
function buildTemplateElement(template: any, resolver: any) {
  const key = String(template.slug || template.id || "root");
  const el = buildCraftTreeFromStructure(template.structure, {
    mode: "toolbox",
    resolver,
    uniqueKey: key,
    isPreview: false,
    pendingBlockModifiers: template.modifiers,
  });
  if (!el) {
    console.warn(`[SectionPicker] Unknown or invalid structure for template "${key}" — skipping`);
  }
  return el;
}

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
    element: buildTemplateElement(template, resolver),
    structure: template.structure,
    modifiers: template.modifiers,
  }));
};

// Search across all templates
const searchTemplates = (
  searchQuery: string,
  resolver: any,
  templateData: any,
  categories: any[]
) => {
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
          element: buildTemplateElement(template, resolver),
          structure: template.structure,
          modifiers: template.modifiers,
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

  const baseCategories = useMemo(
    () => [
      { id: "all", name: "All" },
      { id: "my-sections", name: "My Blocks" },
      ...(templateData?.categories || []).sort((a: any, b: any) => (a.order || 0) - (b.order || 0)),
    ],
    [templateData]
  );

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
    <>
      {isOpen && (
        <div
          className="animate-backdrop-in bg-base-100/75 fixed inset-0 z-100 flex items-center justify-center backdrop-blur-sm"
          style={{ pointerEvents: "auto" }}
        >
          <div
            ref={dialogRef}
            className="pagehub-sdk-root ph-modal-surface-heavy flex h-[80vh] w-[33vw] max-w-md flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="border-base-300 bg-accent text-accent-content flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base-content flex items-center gap-2 text-2xl font-bold">
                <TbLayoutGridAdd className="size-7" />
                Add Section
              </h2>
              <button
                onClick={onClose}
                className="text-neutral-content hover:text-neutral-content transition-colors"
                aria-label="Close"
              >
                <MdClose size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Left sidebar - Categories */}
              <div className="border-base-300 bg-neutral text-neutral-content flex w-64 flex-col border-r">
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-1">
                    {categories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => handleCategorySelect(category.id)}
                        className={`w-full rounded-lg px-4 py-2 text-left transition-colors ${
                          selectedCategory === category.id && !isSearchMode
                            ? "bg-primary text-primary-content font-medium"
                            : "text-base-content hover:bg-neutral"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Search Bar - Bottom of sidebar */}
                <div className="border-base-300 border-t p-4">
                  <div className="input-wrapper input-hover relative">
                    <input
                      type="text"
                      placeholder="Search"
                      value={searchQuery}
                      onChange={e => handleSearch(e.target.value)}
                      className="input-plain-search pl-8"
                    />
                    <MdSearch
                      className="text-neutral-content pointer-events-none absolute top-1/2 left-2 z-10 -translate-y-1/2"
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
                    <button
                      key={`${isSearchMode ? "search" : selectedCategory}-${template.isCustom ? "custom" : "builtin"}-${template.id}-${templateIndex}`}
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
                      className="group border-base-300 bg-base-200 text-base-content hover:border-primary relative overflow-hidden rounded-lg border-2 shadow-sm hover:shadow-md"
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
                          <div className="bg-primary text-primary-content absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg px-2 py-1 shadow-sm">
                            <TbLayoutGridAdd className="size-3" />
                            <span className="text-xs font-medium">Custom</span>
                          </div>
                        </>
                      ) : (
                        // Preview for built-in templates - use ComponentPreview
                        <ComponentPreview
                          component={template.structure}
                          modifiers={template.modifiers}
                          slug={String(template.slug || template.id)}
                          scale={0.2}
                          resolver={query.getOptions().resolver}
                        />
                      )}
                    </button>
                  ))}
                </div>

                {templates.length === 0 && (
                  <div className="flex h-64 items-center justify-center">
                    <p className="text-neutral-content text-lg">
                      {isSearchMode
                        ? `No templates found for "${searchQuery}"`
                        : "No templates available for this category yet."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>,
    document.querySelector(".pagehub-sdk-root") || document.body
  );
};
