/** Mutable registry of DOM roots for proximity hover (single document listener). */
const targets = new Map<string, HTMLElement>();

export function registerProximityTarget(id: string, el: HTMLElement): void {
  targets.set(id, el);
}

export function unregisterProximityTarget(id: string): void {
  targets.delete(id);
}

export function forEachProximityTarget(
  fn: (id: string, dom: HTMLElement) => void,
): void {
  for (const [id, dom] of targets) {
    fn(id, dom);
  }
}

export function getProximityTarget(id: string): HTMLElement | undefined {
  return targets.get(id);
}

export function getProximityTargetCount(): number {
  return targets.size;
}
