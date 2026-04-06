import { NodeProvider, useEditor, useNode } from "@craftjs/core";
import { Accord } from "../../ToolbarStyle";
import { useGetNode } from "../../Tools/lib";
import { atom, useAtomState } from "@zedux/react";
import React from "react";
import { renderComponentSlots } from "../helpers";

export const SelectedContainerGroupAtom = atom("selectedcontainergroup_unified", "",);

export const SelectedNestedAccordionAtom = atom("selectednestedaccordion_unified", "",);

export const ContainerGroupMainTab = () => {
  const { id } = useNode();
  const { query } = useEditor();
  const [accordion, setAccordion] = useAtomState(SelectedContainerGroupAtom);
  const [nestedAccordion, setNestedAccordion] = useAtomState(SelectedNestedAccordionAtom);

  const childNodes = React.useMemo(() => {
    try {
      return query.node(id).get().data.nodes || [];
    } catch { return []; }
  }, [query, id]);

  const groupedComponents = React.useMemo(() => {
    const groups: { [type: string]: any[] } = {};
    childNodes.forEach((childId: string) => {
      try {
        const childNode = query.node(childId).get();
        const componentType = String(childNode.data.displayName || childNode.data.name || "");
        if (componentType) {
          if (!groups[componentType]) groups[componentType] = [];
          groups[componentType].push({ id: childId, type: componentType, props: childNode.data.props });
        }
      } catch {}
    });
    return groups;
  }, [childNodes, query]);

  return renderComponentSlots({
    Content: (
      <>
        {Object.entries(groupedComponents).map(([type, components]) => (
          <Accord
            key={type}
            prop={type}
            accordion={accordion}
            setAccordion={setAccordion}
            title={`${type}s (${components.length})`}
            className="group border-b border-border"
          >
            <div className="flex flex-col gap-3 bg-muted/40 p-3">
              {components.map((component: any, index: number) => (
                <Accord
                  key={component.id}
                  prop={`${type}-${index}`}
                  accordion={nestedAccordion}
                  setAccordion={setNestedAccordion}
                  title={`${type} ${index + 1}`}
                  className="group border-b border-border"
                >
                  <NodeProvider id={component.id}>
                    <div className="flex flex-col gap-3 bg-card p-3 text-card-foreground">
                      {React.createElement(
                        query.node(component.id).get()?.data?.related?.toolbar || (() => null)
                      )}
                    </div>
                  </NodeProvider>
                </Accord>
              ))}
            </div>
          </Accord>
        ))}
      </>
    ),
  });
};
