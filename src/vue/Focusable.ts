// `<Focusable>` component: a thin template wrapper around `useFocusable` for use without a script block.

import { defineComponent, h, type PropType } from 'vue';
import type { Boundary, Direction, Loop } from '../core/types.js';
import { useFocusable } from './useFocusable.js';

/**
 * Template-friendly wrapper around `useFocusable`. Renders `as` (default `div`) with
 * `data-focused` / `data-focus-within` attributes and exposes `{ focused, focusWithin, focus }` to the slot.
 *
 * Event handlers are declared as props (`@enter` → `onEnter`) so their return values reach the engine,
 * e.g. `@arrow` returning `false` cancels the move.
 */
export const Focusable = defineComponent({
  name: 'Focusable',
  props: {
    as: { type: [String, Object] as PropType<string | object>, default: 'div' },
    id: String,
    focusable: { type: Boolean, default: true },
    boundary: { type: [Boolean, Array] as PropType<Boundary>, default: false },
    loop: { type: [Boolean, String] as PropType<Loop>, default: false },
    rememberLastFocus: { type: Boolean, default: true },
    preferredChildId: String,
    onFocus: Function as PropType<() => void>,
    onBlur: Function as PropType<() => void>,
    onEnter: Function as PropType<(event?: Event) => void>,
    onBack: Function as PropType<(event?: KeyboardEvent) => void>,
    onArrow: Function as PropType<(direction: Direction, event?: KeyboardEvent) => boolean | void>,
    onBoundary: Function as PropType<(direction: Direction) => void>,
  },
  setup(props, { slots, expose }) {
    // `props` is reactive and useFocusable reads options lazily, so changes reach the engine as-is.
    const { el, id, focused, focusWithin, focus } = useFocusable(props);
    expose({ id, focused, focusWithin, focus });
    return () =>
      h(
        props.as,
        {
          ref: el,
          'data-focused': focused.value || undefined,
          'data-focus-within': focusWithin.value || undefined,
        },
        slots.default?.({ focused: focused.value, focusWithin: focusWithin.value, focus }),
      );
  },
});
