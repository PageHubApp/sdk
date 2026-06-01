/**
 * `ph.component.*` — saved-component creation.
 */
import type { CommandDef } from "../../types";

export const COMPONENT_COMMANDS: CommandDef[] = [
  {
    id: "ph.component.createReusable",
    title: "Save as reusable component",
    category: "Edit",
    run: () => {
      // Lazy-import to avoid a runtime TDZ cycle (useCreateComponent.tsx
      // pulls Container/Text which transitively reach the component resolver).
      void import("../../../chrome/hooks/useCreateComponent").then(m => {
        m.createReusableComponentRun();
      });
    },
  },
];
