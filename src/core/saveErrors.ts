/**
 * Save coordinator runtime errors.
 *
 * Extracted from `types.ts` — these are concrete classes (runtime), not types,
 * and live next to `saveCoordinator.ts` which throws/catches them. Re-exported
 * from `types/index.ts` so existing `import { SaveConflictError } from "../types"`
 * keeps resolving (and `instanceof` keeps narrowing — single class identity).
 */

import { PageHubError } from "../utils/errors";
import type { SaveResult } from "../types/save";

export class SaveConflictError extends PageHubError {
  constructor(
    public currentUpdatedAt: string,
    public reload: () => Promise<SaveResult>,
    public override: () => Promise<SaveResult>,
    public isDraft: boolean
  ) {
    super({ code: "SAVE_CONFLICT", message: "Save conflict" });
    this.name = "SaveConflictError";
  }
}

export class SaveEmptyError extends PageHubError {
  constructor() {
    super({
      code: "SAVE_EMPTY",
      message: "Nothing to save — editor canvas is empty or invalid",
    });
    this.name = "SaveEmptyError";
  }
}

export class SaveFailedError extends PageHubError {
  constructor(
    message: string,
    public status?: number,
    public cause?: unknown
  ) {
    super({ code: "SAVE_FAILED", message });
    this.name = "SaveFailedError";
  }
}
