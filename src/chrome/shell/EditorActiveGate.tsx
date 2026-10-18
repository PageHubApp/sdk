import { useEditor } from "@craftjs/core";
import { useEffect, useRef } from "react";

import { useSDK } from "../../core/context";

/**
 * Turns Craft editing off while the host hides the editor
 * (`<PageHubProvider active={false}>`) and puts it back when it shows again.
 *
 * Off is the same state Preview uses, so every canvas handler, the selection
 * chrome and the body-portalled node overlays already know how to step aside.
 * The enabled state from before hiding is restored, so a page left in Preview
 * comes back in Preview. Anything that turns editing on while hidden (the
 * post-load enable in `useViewportSetupEffects`) is switched back off and
 * remembered for later.
 *
 * Renders nothing; mount it once inside Craft's `<Editor>`.
 */
export function EditorActiveGate() {
  const { active } = useSDK();
  const { actions, enabled } = useEditor(state => ({ enabled: state.options.enabled }));
  // Enabled state to restore on show; null while the editor is shown.
  const resume = useRef<boolean | null>(null);

  useEffect(() => {
    if (!active) {
      if (enabled) {
        resume.current = true;
        actions.setOptions(options => {
          options.enabled = false;
        });
      } else if (resume.current === null) {
        resume.current = false;
      }
      return;
    }
    if (resume.current === null) return;
    const restore = resume.current;
    resume.current = null;
    if (restore) {
      actions.setOptions(options => {
        options.enabled = true;
      });
    }
  }, [active, enabled, actions]);

  return null;
}
