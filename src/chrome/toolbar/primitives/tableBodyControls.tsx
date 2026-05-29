import { useNode } from "@craftjs/core";
import React from "react";
import { TabBody } from "../Tab";
import { ToolbarSection } from "../ToolbarSection";
import { ToolbarWrapper } from "../ToolbarWrapper";
import { NoSettings } from "./componentConverters";

export const TableBodyStyleControl = ({ children, actions, activeTab, head, tab, query }) => {
  const { id } = useNode();
  const propValues = query.node(id).get().data.props;

  if (propValues.relation?.belongsTo) {
    if (propValues.relation?.relationType !== "style") {
      return <TBNoSettings query={query} actions={actions} id={id} />;
    }

    if (propValues.relation?.relationType === "style") {
      if (activeTab === head[0].title) {
        return tab;
      }

      return <TBNoSettings query={query} actions={actions} id={id} />;
    }
  }

  return children;
};

export const TBWrap = ({ head, children, unified = false, activeSection = "" }) => (
  <ToolbarWrapper head={head} unified={unified} activeSection={activeSection}>
    {children}
  </ToolbarWrapper>
);

export const TBNoSettings = ({ query, actions, id }) => (
  <TabBody>
    <ToolbarSection>
      <NoSettings query={query} actions={actions} id={id} />
    </ToolbarSection>
  </TabBody>
);
