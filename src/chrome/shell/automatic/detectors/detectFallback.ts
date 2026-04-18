/**
 * Detector: catch-all. Always returns a plainContainer intent so the orchestrator
 * guarantees every Automatic drop at least gets renamed off "Automatic".
 *
 * Must stay LAST in the pipeline.
 */

import type { Detector } from "../automaticIntent";

export const detectFallback: Detector = ctx => ({
  kind: "plainContainer",
  parentId: ctx.parentId,
});
