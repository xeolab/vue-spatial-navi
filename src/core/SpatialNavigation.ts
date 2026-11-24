import { isHorizontal, isInBeam, pickBest, pickFirst, union, wrapOrigin } from './geometry.js';
import type {
  Action,
  Direction,
  FocusListener,
  FocusNode,
  KeyMap,
  NodeId,
  Rect,
  SpatialNavigationOptions,
} from './types.js';

export const DEFAULT_KEY_MAP: KeyMap = {
  up: ['ArrowUp'],
  down: ['ArrowDown'],
  left: ['ArrowLeft'],
  right: ['ArrowRight'],
  enter: ['Enter'],
  back: ['Escape', 'Backspace', 'BrowserBack'],
};

type Candidate = { id: NodeId; rect: Rect };

export class SpatialNavigation {
  private nodes = new Map<NodeId, FocusNode>();
  /** Children in registration order; `null` is the implicit root. */
  private children = new Map<NodeId | null, NodeId[]>();
  private lastFocused = new Map<NodeId | null, NodeId>();
  private listeners = new Set<FocusListener>();
  /** Focused leaf first, then its ancestors. */
  private path: NodeId[] = [];
  private restoreScheduled = false;
  private keyMap: KeyMap;
  private scrollOptions: ScrollIntoViewOptions | false;
  paused = false;

  constructor(options: SpatialNavigationOptions = {}) {
    this.keyMap = { ...DEFAULT_KEY_MAP, ...options.keyMap };
    this.scrollOptions = options.scrollIntoView ?? { block: 'nearest', inline: 'nearest' };
  }

  get focusedId(): NodeId | null {
    return this.path[0] ?? null;
  }

  has(id: NodeId) {
    return this.nodes.has(id);
  }

  isFocusWithin(id: NodeId) {
    return this.path.includes(id);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
  }

  subscribe(listener: FocusListener) {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  }

  register(node: FocusNode) {
    if (this.nodes.has(node.id)) {
      console.warn(
        `[spatial-navigation] Duplicate node id "${node.id}", the old node is replaced.`,
      );
      this.unregister(node.id);
    }
    this.nodes.set(node.id, node);
    const siblings = this.children.get(node.parentId) ?? [];
    siblings.push(node.id);
    this.children.set(node.parentId, siblings);
  }

  unregister(id: NodeId) {
    const node = this.nodes.get(id);
    if (!node) return;
    this.nodes.delete(id);
    const siblings = this.children.get(node.parentId);
    siblings?.splice(siblings.indexOf(id), 1);
    this.lastFocused.delete(id);
    if (this.lastFocused.get(node.parentId) === id) this.lastFocused.delete(node.parentId);
    if (this.path.includes(id)) this.scheduleRestore();
  }

  /**
   * Focus a node (containers forward to their remembered / preferred / first child).
   * With no id, focuses the first navigable node in the tree. Returns whether a node got focus.
   */
  focus(id?: NodeId | null): boolean {
    if (id != null && !this.isNavigable(id)) return false;
    const leaf = this.resolve(id ?? null);
    if (leaf === null) return false;
    this.applyFocus(leaf);
    return true;
  }

  /** Move focus one step. Returns whether focus moved. */
  navigate(direction: Direction, event?: KeyboardEvent): boolean {
    const focused = this.focusedId;
    if (focused === null || !this.nodes.has(focused)) return this.focus();

    for (const id of this.path) {
      if (this.nodes.get(id)?.onArrow?.(direction, event) === false) return false;
    }

    // The leaf's rect is the origin at every level, so e.g. leaving a sidebar lands on the row beside the item.
    const origin = this.getRect(focused);
    if (!origin) return false;

    let current = focused;
    for (;;) {
      const { parentId } = this.nodes.get(current)!;
      const parent = parentId === null ? undefined : this.nodes.get(parentId);
      const siblings = this.candidates(parentId).filter((c) => c.id !== current);

      let target: Candidate | undefined;
      if (siblings.length && parent && loops(parent, direction)) {
        // Looping: stay in this row / column, wrapping at its end, before jumping diagonally to another one.
        const inBeam = siblings.filter((c) => isInBeam(origin, c.rect, direction));
        const wrapped = wrapOrigin(
          origin,
          siblings.map((c) => c.rect),
          direction,
        );
        target =
          pickBest(origin, inBeam, direction) ??
          pickBest(wrapped, inBeam, direction) ??
          pickBest(origin, siblings, direction) ??
          pickBest(wrapped, siblings, direction);
      } else {
        target = pickBest(origin, siblings, direction);
      }
      if (target) {
        this.applyFocus(this.resolve(target.id, origin, direction)!);
        return true;
      }

      if (!parent) return false;
      parent.onBoundary?.(direction);
      if (traps(parent, direction)) return false;
      current = parent.id;
    }
  }

  /** Returns whether the event was consumed (and `preventDefault` was called). */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (this.paused) return false;
    const action = this.matchAction(event);
    if (!action) return false;

    if (action === 'enter') {
      const node = this.focusedId === null ? undefined : this.nodes.get(this.focusedId);
      if (!node?.onEnter) return false;
      event.preventDefault();
      node.onEnter(event);
      return true;
    }

    if (action === 'back') {
      const node = this.path.map((id) => this.nodes.get(id)).find((n) => n?.onBack);
      if (!node) return false;
      event.preventDefault();
      node.onBack!(event);
      return true;
    }

    // Arrows are always consumed so the page doesn't scroll underneath the UI.
    event.preventDefault();
    this.navigate(action, event);
    return true;
  }

  /** Whether `id` has navigable children (i.e. acts as a container right now). */
  isContainer(id: NodeId) {
    return this.candidates(id).length > 0;
  }

  private matchAction(event: KeyboardEvent): Action | undefined {
    return (Object.keys(this.keyMap) as Action[]).find((action) =>
      this.keyMap[action].includes(event.key),
    );
  }

  private isNavigable(id: NodeId) {
    return this.nodes.get(id)?.focusable !== false && this.getRect(id) !== null;
  }

  private candidates(parentId: NodeId | null): Candidate[] {
    const result: Candidate[] = [];
    for (const id of this.children.get(parentId) ?? []) {
      if (this.nodes.get(id)?.focusable === false) continue;
      const rect = this.getRect(id);
      if (rect) result.push({ id, rect });
    }
    return result;
  }

  /**
   * Element rect; for element-less or zero-size (`display: contents`) nodes, the union of the children.
   * `null` = hidden.
   */
  private getRect(id: NodeId): Rect | null {
    const r = this.nodes.get(id)?.getElement?.()?.getBoundingClientRect();
    // Copy out: DOMRect fields are prototype getters and would vanish in `{ ...rect }`.
    if (r && (r.width || r.height))
      return { top: r.top, right: r.right, bottom: r.bottom, left: r.left };
    return union(this.candidates(id).map((c) => c.rect));
  }

  /** Walk down from `id` (or the root) to the leaf that should receive focus. */
  private resolve(id: NodeId | null, origin?: Rect, direction?: Direction): NodeId | null {
    const kids = this.candidates(id);
    if (!kids.length) return id;
    const node = id === null ? undefined : this.nodes.get(id);
    const remembered = node?.rememberLastFocus === false ? undefined : this.lastFocused.get(id);
    const next =
      kids.find((c) => c.id === remembered) ??
      kids.find((c) => c.id === node?.preferredChildId) ??
      (origin && direction
        ? pickBest(origin, kids, direction, false)
        : pickFirst(kids, this.isRtl(id)))!;
    return this.resolve(next.id, origin, direction);
  }

  /**
   * Nearest `dir` attribute on the container's element, falling back to `<html dir>` for
   * element-less containers and the root. Only decides where "first" is: arrow keys are physical
   * (right = visually right) in both directions, as in browsers.
   */
  private isRtl(id: NodeId | null) {
    const el = id === null ? undefined : this.nodes.get(id)?.getElement?.();
    const dirEl = el?.closest('[dir]') ?? globalThis.document?.documentElement;
    return dirEl?.getAttribute('dir')?.toLowerCase() === 'rtl';
  }

  private applyFocus(leaf: NodeId) {
    const previous = this.focusedId;
    if (leaf === previous) return;

    const oldPath = this.path;
    const newPath: NodeId[] = [];
    for (let id: NodeId | null = leaf; id !== null; id = this.nodes.get(id)!.parentId)
      newPath.push(id);
    this.path = newPath;
    newPath.forEach((id) => this.lastFocused.set(this.nodes.get(id)!.parentId, id));

    // Nodes in the old path may already be unregistered; `?.` skips them.
    if (previous !== null) this.nodes.get(previous)?.onBlur?.();
    for (const id of oldPath) {
      if (!newPath.includes(id)) this.nodes.get(id)?.onFocusWithinChange?.(false);
    }
    for (const id of newPath) {
      if (!oldPath.includes(id)) this.nodes.get(id)?.onFocusWithinChange?.(true);
    }
    const node = this.nodes.get(leaf)!;
    node.onFocus?.();
    if (this.scrollOptions) node.getElement?.()?.scrollIntoView?.(this.scrollOptions);
    this.listeners.forEach((fn) => fn(leaf, previous));
  }

  /**
   * Deferred so that unmounting a whole list (one unregister per item) refocuses once,
   * after the framework has finished patching, instead of hopping through dying siblings.
   */
  private scheduleRestore() {
    if (this.restoreScheduled) return;
    this.restoreScheduled = true;
    queueMicrotask(() => {
      this.restoreScheduled = false;
      if (this.focusedId !== null && this.nodes.has(this.focusedId)) return;
      const previous = this.focusedId;
      const survivor = this.path.find((id) => this.nodes.has(id));
      // Nearest surviving ancestor first, then anywhere in the tree.
      if ((survivor !== undefined && this.focus(survivor)) || this.focus()) return;
      for (const id of this.path) this.nodes.get(id)?.onFocusWithinChange?.(false);
      this.path = [];
      this.listeners.forEach((fn) => fn(null, previous));
    });
  }
}

function loops(node: FocusNode, direction: Direction) {
  const { loop } = node;
  return loop === true || loop === (isHorizontal(direction) ? 'horizontal' : 'vertical');
}

function traps(node: FocusNode, direction: Direction) {
  const { boundary } = node;
  return boundary === true || (Array.isArray(boundary) && boundary.includes(direction));
}
