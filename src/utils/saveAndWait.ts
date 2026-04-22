/**
 * Trigger an editor save and resolve once the host app dispatches the
 * `pagehub:saved` event. Used to ensure a `/build` page has been persisted
 * (and assigned a `_id` + URL) before performing operations that need a
 * saved page context — uploads, page creation, etc.
 *
 * The host app's `onChange`/save callback is responsible for actually
 * persisting and dispatching the event (see
 * `components/PageHubEditorIntegration.tsx`).
 */
export function saveAndWait(
  emitter: { emit: (event: string, payload?: unknown) => void },
  timeoutMs = 15000
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      window.removeEventListener("pagehub:saved", onSaved);
      window.removeEventListener("pagehub:save-failed", onFailed);
      clearTimeout(timer);
    };
    const onSaved = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onFailed = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Save failed"));
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Timed out waiting for save"));
    }, timeoutMs);
    window.addEventListener("pagehub:saved", onSaved);
    window.addEventListener("pagehub:save-failed", onFailed);
    emitter.emit("save", { isDraft: true });
  });
}
