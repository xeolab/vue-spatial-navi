import type { Direction, Rect } from './types.js';

/** Sub-pixel slack so rounding and focus-scale transforms don't hide neighbours. */
const EPSILON = 0.5;

/** A rect rotated so `direction` points towards +start/+end and the cross axis is cs..ce. */
interface Projected {
  start: number;
  end: number;
  cs: number;
  ce: number;
}

function project(r: Rect, direction: Direction): Projected {
  switch (direction) {
    case 'right':
      return { start: r.left, end: r.right, cs: r.top, ce: r.bottom };
    case 'left':
      return { start: -r.right, end: -r.left, cs: r.top, ce: r.bottom };
    case 'down':
      return { start: r.top, end: r.bottom, cs: r.left, ce: r.right };
    case 'up':
      return { start: -r.bottom, end: -r.top, cs: r.left, ce: r.right };
  }
}

export function isHorizontal(direction: Direction) {
  return direction === 'left' || direction === 'right';
}

/** Both edges are further along `direction`, so a slightly overlapping (e.g. scaled) neighbour still counts. */
export function isInDirection(origin: Rect, target: Rect, direction: Direction) {
  const o = project(origin, direction);
  const t = project(target, direction);
  return t.start > o.start + EPSILON && t.end > o.end + EPSILON;
}

/** Overlaps the origin on the cross axis, i.e. same row (left/right) or column (up/down). */
export function isInBeam(origin: Rect, target: Rect, direction: Direction) {
  const o = project(origin, direction);
  const t = project(target, direction);
  return t.cs < o.ce && t.ce > o.cs;
}

interface Metrics {
  /** Overlaps the origin on the cross axis (same row / column). */
  inBeam: boolean;
  /** Distance from the origin's far edge to the candidate's near edge. */
  gap: number;
  /** Distance from the origin's far edge to the candidate's far edge. */
  farGap: number;
  weighted: number;
  centerOffset: number;
}

function measure(origin: Rect, target: Rect, direction: Direction): Metrics {
  const o = project(origin, direction);
  const t = project(target, direction);
  const gap = Math.max(0, t.start - o.end);
  const crossGap = Math.max(0, t.cs - o.ce, o.cs - t.ce);
  return {
    inBeam: crossGap === 0,
    gap,
    farGap: t.end - o.end,
    weighted: gap + crossGap * 2,
    centerOffset: Math.abs((t.cs + t.ce) / 2 - (o.cs + o.ce) / 2),
  };
}

/**
 * Same rule as Android's FocusFinder: a candidate in the origin's row / column beats one outside it,
 * except vertically when the outside one lies entirely before it (e.g. a short section right below a
 * corner button vs. a full-width row further down). Otherwise: weighted distance, then centre alignment,
 * then the earlier candidate (registration ≈ DOM order).
 */
function isBetter(a: Metrics, b: Metrics, direction: Direction) {
  if (a.inBeam !== b.inBeam) {
    const [beam, other] = a.inBeam ? [a, b] : [b, a];
    const beamWins = isHorizontal(direction) || beam.gap < other.farGap;
    return beamWins === (a === beam);
  }
  // Sub-pixel differences (scale transforms, fractional layout) count as ties, so ties keep DOM order.
  if (Math.abs(a.weighted - b.weighted) > EPSILON) return a.weighted < b.weighted;
  return a.centerOffset < b.centerOffset - EPSILON;
}

function compare(a: number[], b: number[]) {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

export function pickBest<T extends { rect: Rect }>(
  origin: Rect,
  candidates: T[],
  direction: Direction,
  filter = true,
): T | undefined {
  let best: T | undefined;
  let bestMetrics: Metrics | undefined;
  for (const c of candidates) {
    if (filter && !isInDirection(origin, c.rect, direction)) continue;
    const m = measure(origin, c.rect, direction);
    if (!bestMetrics || isBetter(m, bestMetrics, direction)) [best, bestMetrics] = [c, m];
  }
  return best;
}

/** Top-most, then left-most (right-most when `rtl`). Used when there is no origin to measure from. */
export function pickFirst<T extends { rect: Rect }>(candidates: T[], rtl = false): T | undefined {
  const key = (r: Rect) => [r.top, rtl ? -r.right : r.left];
  return candidates.reduce<T | undefined>(
    (best, c) => (!best || compare(key(c.rect), key(best.rect)) < 0 ? c : best),
    undefined,
  );
}

/** A zero-width origin just before the opposite edge of `rects`, keeping the cross extent, for wrap-around. */
export function wrapOrigin(origin: Rect, rects: Rect[], direction: Direction): Rect {
  switch (direction) {
    case 'right': {
      const x = Math.min(...rects.map((r) => r.left)) - 1;
      return { ...origin, left: x, right: x };
    }
    case 'left': {
      const x = Math.max(...rects.map((r) => r.right)) + 1;
      return { ...origin, left: x, right: x };
    }
    case 'down': {
      const y = Math.min(...rects.map((r) => r.top)) - 1;
      return { ...origin, top: y, bottom: y };
    }
    case 'up': {
      const y = Math.max(...rects.map((r) => r.bottom)) + 1;
      return { ...origin, top: y, bottom: y };
    }
  }
}

export function union(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  return {
    top: Math.min(...rects.map((r) => r.top)),
    left: Math.min(...rects.map((r) => r.left)),
    bottom: Math.max(...rects.map((r) => r.bottom)),
    right: Math.max(...rects.map((r) => r.right)),
  };
}
