# Automatic smart-drop

Context-aware morph for nodes dropped from the `Automatic` toolbox tile. Detects where the node landed and rewrites it into the appropriate shape (Section with Content child, Content wrapper, Card, plain Container, etc.) inside a single undo step.

Shape mirrors `../spatial/` — ordered detector pipeline, first hit wins, discriminated-union intents, per-intent executor files.

## Files

```
automatic/
├── index.ts                    # Public exports
├── automaticIntent.ts          # AutomaticIntent union + MorphContext + Detector/Executor types
├── applyAutomaticMorph.ts      # Orchestrator — pipeline + dispatch
├── constants.ts                # className strings (SECTION_CLASSNAME, CARD_CLASSNAME, …)
├── helpers.ts                  # buildMorphContext, classNameContains, buildContentChildTree
├── detectors/                  # Ordered pipeline — first hit wins
│   ├── detectStructural.ts       # parent.type (page, section, header, footer, form)
│   ├── detectGrandparent.ts      # chained context (nested-in-section → Card)
│   └── detectFallback.ts         # always matches → plainContainer
└── executors/                  # One file per morph shape
    ├── morphToSection.ts
    ├── morphToContent.ts
    ├── morphToCard.ts
    └── morphToPlainContainer.ts
```

## How it fires

`applyAutomaticMorph` is called by `applySmartDefaultsForNewNode` in `../spatial/executeSpatialDrop.ts`, which itself is triggered by:

- Toolbox drag-drop (`executeSpatialDrop` fresh-drop branch)
- Right-click insert / double-click insert (`AddElement` in `../../viewport/toolbox/toolboxUtils.tsx`)

Both call sites wrap the flow with `createMergedActions` from `../spatial/mergedActions`, so `addNodeTree` + morph mutations land as one undo step.

## Adding a new morph

Three files, zero edits to unrelated code:

1. **Add an intent variant** to the union in `automaticIntent.ts`:
   ```ts
   | { kind: "hero"; parentId: string; theme?: "light" | "dark" }
   ```
2. **Write the executor** at `executors/morphToHero.ts`:
   ```ts
   export const morphToHero: Executor<{ kind: "hero"; parentId: string }> = (intent, batch, ctx) => {
     batch.setProp(ctx.nodeId, ...);
     batch.setCustom(ctx.nodeId, ...);
     // optional: batch.addNodeTree(childTree, ctx.nodeId);
   };
   ```
3. **Write / extend a detector** — either add a new detector file or extend an existing one:
   ```ts
   // detectors/detectDaisyUI.ts
   if (classNameContains(ctx.parentClassName, "hero-overlay")) {
     return { kind: "hero", parentId: ctx.parentId };
   }
   ```
4. **Wire both into `applyAutomaticMorph.ts`** — one import + one entry in `DETECTOR_PIPELINE` (if new detector) + one entry in `EXECUTORS`.

## Rules / invariants

- Detector returns `null` to defer to the next in the pipeline; returns an `AutomaticIntent` to commit.
- Executors mutate via the `MergedActions` batch — **never** `ctx.query` or the raw `actions` handle — to keep undo single-step.
- Context is built once in the orchestrator and passed read-only to every detector and executor. Don't re-query the tree for data already on `ctx`.
- Intent payloads carry per-morph data (theme, slot, variant). Shared state lives in the context.
- className strings live in `constants.ts`. No string literals inside executors.
- Token matching in detectors uses `classNameContains` (exact whitespace-split match) — never `String.includes` which would match substrings like `btn-outline` inside larger tokens.

## Debugging

Dev-only log fires on every matched morph:

```
[auto] matched { detector: "detectStructural", kind: "section" }
```

Build is silent in production (`process.env.NODE_ENV === "development"` gate).
