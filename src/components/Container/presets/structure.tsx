import React from "react";
import { Element } from "@craftjs/core";
import { Container } from "../Container";

export function buildSectionChildren() {
  return [
    <Element
      key="content"
      canvas
      is={Container}
      custom={{ displayName: "Content" }}
      canDelete={true}
      canEditName={true}
      className="gap-space-md max-w-page mx-auto flex w-full flex-col"
    />,
  ];
}
