/**
 * `ph.component.*` — saved-component creation.
 */
import { savedComponentsAllowed } from "../../../define/componentAllowlist";
import type { CommandDef } from "../../types";

export const COMPONENT_COMMANDS: CommandDef[] = [
  {
    id: "ph.component.createReusable",
    title: "Save as reusable component",
    category: "Edit",
    when: () => savedComponentsAllowed(),
    run: ctx => {
      // Lazy-import to avoid a runtime TDZ cycle (useCreateComponent.tsx
      // pulls Container/Text which transitively reach the component resolver).
      // At the host's cap the run refuses and says why, so it stays enabled:
      // a click from the empty state still gets the reason.
      void import("../../../chrome/hooks/useCreateComponent").then(m => {
        m.createReusableComponentRun({
          query: ctx.query,
          actions: ctx.actions,
          maxReusableComponents: ctx.features.maxReusableComponents,
        });
      });
    },
  },
];
