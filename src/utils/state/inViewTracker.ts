/**
 * In-view state — "which section is on screen", written into the state
 * registry so rails, counters and step highlights can follow the reader with
 * the existing readers (`stateModifiers`, `{{state.*}}`, `state` conditions).
 *
 * A Container with `inViewState: { key, value }` joins the group `key`. While
 * it is the most-visible member of that group, the registry holds:
 *
 *   <key>          = value
 *   <key>:index    = 0-based position of `value` among the group's distinct
 *                    values, in document order
 *   <key>:number   = index + 1
 *   <key>:count    = how many distinct values the group has
 *
 * ONE implementation serves both runtimes. `createInViewTracker` and
 * `pickInViewWinner` are written to be self-contained (no imports, no closure
 * over module scope, plain syntax) because the static export inlines their
 * source via `Function.prototype.toString` — see
 * `render/static/runtime/inViewState.ts`. The React viewer calls them directly
 * (`components/Container/useContainerInViewState.ts`). Keep them that way:
 * anything they reference must be a parameter or a browser global.
 *
 * Spec: docs/sdk/in-view-state.md
 */

export interface InViewStateConfig {
  /** Group key. Colon-delimited by convention (`deck:step`); no `.` (it opens a JSON path in `{{state.*}}`). */
  key: string;
  /** What `key` holds while this section is the most visible one. */
  value: string;
}

export interface InViewMeasure {
  /** Visible height in px (0 when off screen). */
  visible: number;
  /** Element height in px. */
  height: number;
  /** Element top relative to the viewport, px. */
  top: number;
}

export type InViewWrite = (key: string, value: string) => void;

export interface InViewTracker {
  /** Join `el` to group `key` under `value`. Returns the leave function. */
  add: (el: Element, key: string, value: string) => () => void;
}

/** Valid prop → normalized config; anything else → null (prop ignored). */
export function normalizeInViewState(raw: unknown): InViewStateConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { key?: unknown; value?: unknown };
  if (typeof r.key !== "string" || !r.key.trim()) return null;
  if (r.value == null || (typeof r.value !== "string" && typeof r.value !== "number")) return null;
  const value = String(r.value);
  if (!value) return null;
  return { key: r.key.trim(), value };
}

/** True when any node in a serialized tree carries a usable `inViewState`. */
export function treeUsesInViewState(nodes: Record<string, any> | null | undefined): boolean {
  if (!nodes || typeof nodes !== "object") return false;
  for (const id in nodes) {
    if (normalizeInViewState(nodes[id]?.props?.inViewState)) return true;
  }
  return false;
}

/**
 * Pick the member that is "most on screen". Score = visible px divided by the
 * most of it that COULD be visible (`min(height, viewportHeight)`), so a short
 * section shown in full and a tall one filling the screen both score 1 — a
 * short last section can still win at the bottom of the page. Ties (within
 * 1%) go to the topmost. Returns -1 when nothing is visible, so the caller
 * keeps the previous winner instead of blanking the rail.
 *
 * Self-contained — inlined into the static runtime by source.
 */
export function pickInViewWinner(members: InViewMeasure[], viewportHeight: number): number {
  let best = -1;
  let bestScore = 0;
  for (let i = 0; i < members.length; i++) {
    let m = members[i];
    if (!m || !(m.visible > 0)) continue;
    let room = Math.min(m.height, viewportHeight);
    let score = room > 0 ? m.visible / room : 0;
    if (score <= 0) continue;
    if (
      best === -1 ||
      score > bestScore + 0.01 ||
      (Math.abs(score - bestScore) <= 0.01 && m.top < members[best].top)
    ) {
      best = i;
      bestScore = score;
    }
  }
  return best;
}

/**
 * One IntersectionObserver per group; on any crossing it re-measures the
 * group's intersecting members (exact rects, not the stale entry) and
 * publishes the winner. Writes only on change. Before the first observation
 * the group's first value (document order) is published so counters never
 * paint blank.
 *
 * Self-contained — inlined into the static runtime by source.
 */
export function createInViewTracker(
  pick: (members: InViewMeasure[], viewportHeight: number) => number,
  write: InViewWrite
): InViewTracker {
  let groups: Record<string, any> = {};
  let thresholds: number[] = [];
  for (let t = 0; t <= 20; t++) thresholds.push(t / 20);
  let hasIO = typeof IntersectionObserver !== "undefined";

  function emit(g: any, k: string, v: string) {
    if (g.last[k] === v) return;
    g.last[k] = v;
    write(k, v);
  }

  function publish(key: string) {
    let g = groups[key];
    if (!g) return;
    g.scheduled = false;
    g.members.sort(function (a: any, b: any) {
      if (a.el === b.el) return 0;
      // DOCUMENT_POSITION_FOLLOWING (4): b comes after a.
      return a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1;
    });
    let vh = window.innerHeight || document.documentElement.clientHeight || 0;
    let measures: InViewMeasure[] = [];
    let values: string[] = [];
    for (let i = 0; i < g.members.length; i++) {
      let m = g.members[i];
      if (values.indexOf(m.value) === -1) values.push(m.value);
      if (!m.on) {
        measures.push({ visible: 0, height: 0, top: 0 });
        continue;
      }
      let r = m.el.getBoundingClientRect();
      let visible = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      measures.push({ visible: visible, height: r.height, top: r.top });
    }
    let w = pick(measures, vh);
    let active = w >= 0 ? g.members[w].value : g.active;
    if (active == null || values.indexOf(active) === -1) active = values.length ? values[0] : null;
    g.active = active;
    emit(g, key + ":count", String(values.length));
    if (active == null) return;
    let idx = values.indexOf(active);
    emit(g, key + ":index", String(idx));
    emit(g, key + ":number", String(idx + 1));
    emit(g, key, active);
  }

  function schedule(key: string) {
    let g = groups[key];
    if (!g || g.scheduled) return;
    g.scheduled = true;
    let run = function () {
      publish(key);
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else setTimeout(run, 0);
  }

  function add(el: Element, key: string, value: string) {
    let g = groups[key];
    if (!g) {
      g = groups[key] = { members: [], last: {}, active: null, io: null, scheduled: false };
      if (hasIO) {
        g.io = new IntersectionObserver(
          function (entries) {
            for (let e = 0; e < entries.length; e++) {
              for (let j = 0; j < g.members.length; j++) {
                if (g.members[j].el === entries[e].target) g.members[j].on = entries[e].isIntersecting;
              }
            }
            publish(key);
          },
          { threshold: thresholds }
        );
      }
    }
    let member = { el: el, value: value, on: !hasIO };
    g.members.push(member);
    if (g.io) g.io.observe(el);
    schedule(key);
    return function leave() {
      let at = g.members.indexOf(member);
      if (at === -1) return;
      g.members.splice(at, 1);
      if (g.io) g.io.unobserve(el);
      if (!g.members.length) {
        if (g.io) g.io.disconnect();
        if (groups[key] === g) delete groups[key];
      } else {
        schedule(key);
      }
    };
  }

  return { add: add };
}
