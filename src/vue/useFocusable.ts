import {
  inject,
  onUnmounted,
  provide,
  shallowRef,
  toValue,
  watch,
  type ComponentPublicInstance,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue';
import type { Boundary, FocusNode, Loop, NodeId } from '../core/types.js';
import { PARENT_KEY, useSpatialNavigation } from './plugin.js';

export interface UseFocusableOptions extends Pick<
  FocusNode,
  'onFocus' | 'onBlur' | 'onEnter' | 'onBack' | 'onArrow' | 'onBoundary'
> {
  /** Stable id for `engine.focus(id)` / `preferredChildId`. Auto-generated when omitted. Not reactive. */
  id?: NodeId;
  focusable?: MaybeRefOrGetter<boolean | undefined>;
  boundary?: MaybeRefOrGetter<Boundary | undefined>;
  loop?: MaybeRefOrGetter<Loop | undefined>;
  rememberLastFocus?: MaybeRefOrGetter<boolean | undefined>;
  preferredChildId?: MaybeRefOrGetter<NodeId | undefined>;
}

let seq = 0;

export function useFocusable(options: UseFocusableOptions = {}) {
  const { engine, pointer } = useSpatialNavigation();
  const parentId = inject(PARENT_KEY, null);
  const id = options.id ?? `sn-${++seq}`;
  provide(PARENT_KEY, id);

  const el = shallowRef<Element | ComponentPublicInstance | null>(null);
  const focused = shallowRef(false);
  const focusWithin = shallowRef(false);
  const getElement = () => {
    const v = el.value;
    return v instanceof Element ? v : (v?.$el as Element | undefined);
  };

  // Getters keep the engine reading the latest option values without any syncing code.
  engine.register({
    id,
    parentId,
    getElement,
    get focusable() {
      return toValue(options.focusable);
    },
    get boundary() {
      return toValue(options.boundary);
    },
    get loop() {
      return toValue(options.loop);
    },
    get rememberLastFocus() {
      return toValue(options.rememberLastFocus);
    },
    get preferredChildId() {
      return toValue(options.preferredChildId);
    },
    get onEnter() {
      return options.onEnter;
    },
    get onBack() {
      return options.onBack;
    },
    get onArrow() {
      return options.onArrow;
    },
    get onBoundary() {
      return options.onBoundary;
    },
    onFocus() {
      focused.value = true;
      options.onFocus?.();
    },
    onBlur() {
      focused.value = false;
      options.onBlur?.();
    },
    onFocusWithinChange(within) {
      focusWithin.value = within;
    },
  });
  onUnmounted(() => engine.unregister(id));

  if (pointer) {
    // Only leaves react, otherwise hovering a row would also "focus" the row on the way in.
    // mousemove + movement check: a resting cursor must not steal focus when keyboard scrolling slides content under it.
    const onMove = (e: Event) => {
      const { movementX, movementY } = e as MouseEvent;
      if ((movementX || movementY) && !focused.value && !engine.isContainer(id)) engine.focus(id);
    };
    const onClick = (e: Event) => {
      if (engine.isContainer(id)) return;
      engine.focus(id);
      options.onEnter?.(e);
    };
    watch(getElement, (node, _, onCleanup) => {
      if (!node) return;
      node.addEventListener('mousemove', onMove);
      node.addEventListener('click', onClick);
      onCleanup(() => {
        node.removeEventListener('mousemove', onMove);
        node.removeEventListener('click', onClick);
      });
    });
  }

  return {
    /** Bind to the element (or component) that represents this node: `<div :ref="el">` / `ref="el"`. */
    el,
    id,
    focused: focused as Readonly<Ref<boolean>>,
    focusWithin: focusWithin as Readonly<Ref<boolean>>,
    focus: () => engine.focus(id),
  };
}
