export type Direction = 'up' | 'down' | 'left' | 'right';
export type Action = Direction | 'enter' | 'back';
export type NodeId = string;

/** Subset of DOMRect the engine needs, so tests and custom layouts can provide plain objects. */
export interface Rect {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** `true` loops both axes. */
export type Loop = boolean | 'horizontal' | 'vertical';

/** `true` traps focus in every direction; an array traps only the listed directions. */
export type Boundary = boolean | Direction[];

/**
 * A node in the focus tree. A node with navigable children is a container and forwards
 * focus to one of them; otherwise it is a leaf and receives focus itself.
 * Properties are read on every use, so getters are fine (and that's how the Vue layer keeps them reactive).
 */
export interface FocusNode {
  id: NodeId;
  parentId: NodeId | null;
  getElement?: () => Element | null | undefined;
  /** `false` removes this node and its whole subtree from navigation. Default `true`. */
  focusable?: boolean;
  boundary?: Boundary;
  loop?: Loop;
  /** Re-entering this container focuses the child that was focused last. Default `true`. */
  rememberLastFocus?: boolean;
  preferredChildId?: NodeId;
  onFocus?: () => void;
  onBlur?: () => void;
  /** Fires when this node or any descendant gains / loses focus (like CSS `:focus-within`). */
  onFocusWithinChange?: (within: boolean) => void;
  /** Called on the focused node only. */
  onEnter?: (event?: Event) => void;
  /** Bubbles from the focused node up; the first node that defines it handles the key. */
  onBack?: (event?: KeyboardEvent) => void;
  /** Bubbles from the focused node up before navigating; return `false` to cancel the move. */
  onArrow?: (direction: Direction, event?: KeyboardEvent) => boolean | void;
  /** Focus tried to leave this container in `direction` and found nothing inside it. */
  onBoundary?: (direction: Direction) => void;
}

/** Keys are matched against `KeyboardEvent.key`. */
export type KeyMap = Record<Action, string[]>;

export interface SpatialNavigationOptions {
  /** Merged over the defaults per action. */
  keyMap?: Partial<KeyMap>;
  /** Passed to `element.scrollIntoView` on every focus change; `false` disables. */
  scrollIntoView?: ScrollIntoViewOptions | false;
}

export type FocusListener = (focusedId: NodeId | null, previousId: NodeId | null) => void;
