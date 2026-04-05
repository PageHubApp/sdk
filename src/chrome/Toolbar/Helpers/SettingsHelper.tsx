// @ts-nocheck
import { useNode } from "@craftjs/core";
import React from "react";
import { TabBody } from "../Tab";
import { ToolbarSection } from "../ToolbarSection";
import { ToolbarWrapper } from "../ToolBarWrapper";
import { NoSettings } from "./CloneHelper";

export const TableBodyStyleControl = ({ children, actions, activeTab, head, tab, query }) => {
  const { id } = useNode();
  const propValues = query.node(id).get().data.props;

  if (propValues.belongsTo) {
    if (propValues.relationType !== "style") {
      return <TBNoSettings query={query} actions={actions} id={id} />;
    }

    if (propValues.relationType === "style") {
      if (activeTab === head[0].title) {
        return tab;
      }

      return <TBNoSettings query={query} actions={actions} id={id} />;
    }
  }

  return children;
};

export const TBWrap = ({ head, children, unified = false, activeSection = "" }) => (
  <React.Fragment>
    <ToolbarWrapper head={head} unified={unified} activeSection={activeSection}>
      {children}
    </ToolbarWrapper>
  </React.Fragment>
);

export const TBNoSettings = ({ query, actions, id }) => (
  <TabBody>
    <ToolbarSection>
      <NoSettings query={query} actions={actions} id={id} />
    </ToolbarSection>
  </TabBody>
);
