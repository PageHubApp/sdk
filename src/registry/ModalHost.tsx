/**
 * `<ModalHost>` — mounted once by the SDK provider tree. Subscribes to the
 * modals registry and renders every open instance, bottom→top, z-stacked.
 * Wraps each in the `<Modal>` shell unless the def opts out (`chrome: false`).
 */
import React, { Suspense, useSyncExternalStore } from "react";
import { useRegistries } from "./provider";
import type { ModalsRegistry } from "./modals";
import type { ContextRegistry } from "./context";
import { Modal } from "../chrome/floating/Modal";
import { OVERLAY_Z_MODAL } from "../chrome/popovers/overlayZIndex";
import { sdkLog } from "../utils/logger";

// Registry-anchored live counter (matches the slotTickSnapshot pattern in
// hooks.ts) so getSnapshot returns a primitive that flips on every open/close.
function modalTickSnapshot(modals: ModalsRegistry, context: ContextRegistry): number {
  const anchor = modals as unknown as { __phModalTick?: number };
  if (anchor.__phModalTick == null) {
    anchor.__phModalTick = 0;
    const bump = () => {
      anchor.__phModalTick = (anchor.__phModalTick ?? 0) + 1;
    };
    modals.subscribe(bump);
    context.subscribe(bump);
  }
  return anchor.__phModalTick ?? 0;
}

export function ModalHost() {
  const { modals, context } = useRegistries();
  const tick = useSyncExternalStore(
    onChange => {
      const u1 = modals.subscribe(onChange);
      const u2 = context.subscribe(onChange);
      return () => {
        u1();
        u2();
      };
    },
    () => modalTickSnapshot(modals, context),
    () => 0
  );
  void tick;

  const openList = modals.getOpen();
  if (openList.length === 0) return null;
  const app = context.getSnapshot();

  return (
    <>
      {openList.map((o, depth) => {
        const def = modals.getDef(o.id);
        if (!def) return null;
        const close = () => modals.close(o.id);
        const body = (() => {
          try {
            return def.render({ props: o.props, close, closeAll: modals.closeAll, app });
          } catch (err) {
            sdkLog.error(`[ph.ModalHost] render threw for "${o.id}":`, err);
            return null;
          }
        })();
        if (def.chrome === false) {
          // Host supplies its own overlay chrome — just portal-track + render.
          return (
            <Suspense key={o.id} fallback={null}>
              {body}
            </Suspense>
          );
        }
        return (
          <Suspense key={o.id} fallback={null}>
            <Modal
              id={`modal:${o.id}`}
              isOpen
              onClose={close}
              title={def.title}
              size={def.size}
              variant={def.variant}
              dismissable={def.dismissable}
              zIndex={def.zIndex ?? OVERLAY_Z_MODAL + depth}
            >
              {body}
            </Modal>
          </Suspense>
        );
      })}
    </>
  );
}
