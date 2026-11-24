# @xeolab/vue-spatial-navi

English | [简体中文](README.zh-CN.md)

**[Live demo](https://xeolab.github.io/vue-spatial-navi/)**: use the arrow keys, or plug in a gamepad.

Spatial navigation (arrow keys) for Vue 3. For web apps that have to be usable with directional keys alone.

- **Finds neighbours from the real layout**: the nearest node in a direction is computed from element positions (`getBoundingClientRect`). No hand-written rows, columns or up/down/left/right maps.
- **Focus tree**: nodes nest into containers. Focus moves between siblings first, bubbles up level by level when there is none, and picks a sensible child when entering a container.
- **Common interactions built in**: remembered focus, preferred child, looping, focus boundaries (dialogs), back-key bubbling, boundary callbacks (infinite loading), disabled nodes, hidden nodes skipped automatically, focus restored when the focused node unmounts, RTL.
- **Two styles**: a `<Focusable>` component or the `useFocusable()` composable.
- **Optional pointer support**: mouse hover to focus, click to select.
- **Zero runtime dependencies**, a framework-agnostic core, about 3.7 kB gzipped.

## Install

```bash
npm install @xeolab/vue-spatial-navi
# or pnpm add / yarn add
```

Requires Vue `^3.5.0`.

## Quick start

```ts
// main.ts
import { createApp } from 'vue';
import { createSpatialNavigation } from '@xeolab/vue-spatial-navi';
import App from './App.vue';

createApp(App).use(createSpatialNavigation()).mount('#app');
```

```vue
<!-- App.vue -->
<script setup lang="ts">
import { onMounted } from 'vue';
import { Focusable, useSpatialNavigation } from '@xeolab/vue-spatial-navi';

const { engine } = useSpatialNavigation();
onMounted(() => engine.focus()); // focus the first available node
const open = (item: string) => console.log('open', item);
</script>

<template>
  <Focusable as="nav" class="menu">
    <Focusable
      v-for="item in ['Home', 'Movies', 'Settings']"
      :key="item"
      as="button"
      @enter="open(item)"
    >
      {{ item }}
    </Focusable>
  </Focusable>

  <Focusable as="section" class="row" loop="horizontal">
    <Focusable v-for="n in 10" :key="n" class="card" v-slot="{ focused }">
      Card {{ n }} <span v-if="focused">←</span>
    </Focusable>
  </Focusable>
</template>

<style>
/* Focus state is exposed as data attributes on the element */
.card[data-focused] {
  outline: 3px solid orange;
  transform: scale(1.08);
}
.row[data-focus-within] h2 {
  color: orange;
}
</style>
```

## Concepts

### The focus tree

Every `<Focusable>` / `useFocusable()` registers a node with the engine. Nesting is inferred from the component tree (provide / inject), not from the DOM.

- **Leaf**: a node without navigable children. Leaves are what actually receive focus.
- **Container**: a node with navigable children. Focusing a container hands focus to one of its children.

"Navigable" means `focusable !== false`, no disabled ancestor, and an element with a size (`display: none` / `v-show="false"` nodes are skipped automatically).

### The navigation algorithm

When a direction key is pressed:

1. Starting at the focused node and going up, each node's `onArrow` is called; if any returns `false` the move is cancelled.
2. Among the **siblings**, the nearest one in that direction is chosen:
   - it must lie on that side as a whole (small overlaps from focus scaling are tolerated);
   - candidates overlapping the current node on the cross axis (same row / column) win. One exception, vertically: a candidate outside the row/column wins if it lies entirely before the overlapping one. For example, a corner button moving down enters the narrow section right below it rather than a full-width row further away. This is the same rule as Android's `FocusFinder`;
   - then distance along the direction, with a penalty for cross-axis offset;
   - then centre alignment;
   - remaining ties (under 0.5px, e.g. float noise from transforms) go to the node earlier in the DOM.
3. If the parent container has `loop` enabled for that axis, the search stays within the same row (column) first, wraps to the other end of that row when it runs out, and only then looks at other rows. So in a grid with a short last row, pressing right at the end goes back to the start of that row instead of jumping diagonally to the row above.
4. If nothing is found, the parent's `onBoundary(direction)` is called. If the parent's `boundary` covers that direction the search stops; otherwise the parent becomes the current node and step 2 repeats one level up.
5. If the target is a container, a child is picked in this order, all the way down to a leaf:
   1. the child focused last in that container (`rememberLastFocus`, on by default);
   2. `preferredChildId`;
   3. the child spatially closest to where navigation started.

At every level, distances are measured from the **original leaf's** position. So pressing right on the third sidebar item enters the row aligned with it, not the first row of the content.

When a container is focused with `engine.focus(id)` there is no origin, so option 3 becomes the top-most child on the start side: top-left in LTR, top-right in RTL (see [RTL](#rtl)).

### Focus restore

If the focused node unmounts (e.g. a list refreshes), once the current render has finished the engine hands focus to the **nearest surviving ancestor**, which picks a child using the rules above. If the whole chain is gone, the first available node in the tree is focused.

## API

### `createSpatialNavigation(options?)`

Creates the Vue plugin.

```ts
app.use(
  createSpatialNavigation({
    keyMap: { back: ['Escape'] },
    scrollIntoView: { block: 'center', inline: 'center', behavior: 'smooth' },
    pointer: true,
  }),
);
```

| Option           | Type                                | Default                                   | Description                                                                                   |
| ---------------- | ----------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `keyMap`         | `Partial<Record<Action, string[]>>` | see below                                 | Overrides keys per action. Matched against `event.key`                                        |
| `scrollIntoView` | `ScrollIntoViewOptions \| false`    | `{ block: 'nearest', inline: 'nearest' }` | Passed to `element.scrollIntoView` on every focus change                                      |
| `target`         | `EventTarget \| null`               | `window`                                  | Where to listen for `keydown`. `null` = don't listen; call `engine.handleKeyDown(e)` yourself |
| `pointer`        | `boolean`                           | `false`                                   | Moving the mouse over a node focuses it; clicking triggers `onEnter`                          |

Default keys:

| Action                           | Keys                                                 |
| -------------------------------- | ---------------------------------------------------- |
| `up` / `down` / `left` / `right` | `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` |
| `enter`                          | `Enter`                                              |
| `back`                           | `Escape`, `Backspace`, `BrowserBack`                 |

The return value is the plugin, and also carries `engine` and `focusedId` for use outside components:

```ts
const nav = createSpatialNavigation();
app.use(nav);
nav.engine.focus('home');
```

### `useFocusable(options?)`

Registers a node from a component's `setup`.

```vue
<script setup lang="ts">
import { useFocusable } from '@xeolab/vue-spatial-navi';

const props = defineProps<{ title: string; disabled?: boolean }>();
const emit = defineEmits<{ select: [] }>();

const { el, focused } = useFocusable({
  focusable: () => !props.disabled,
  onEnter: () => emit('select'),
});
</script>

<template>
  <div ref="el" class="card" :class="{ focused }">{{ title }}</div>
</template>
```

**Options** (`MaybeRefOrGetter` accepts a value, a ref or a getter; the engine reads the latest value every time):

| Option              | Type                                                      | Default        | Description                                                                                                               |
| ------------------- | --------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `id`                | `string`                                                  | auto-generated | For `engine.focus(id)` and `preferredChildId`. Cannot change after creation                                               |
| `focusable`         | `MaybeRefOrGetter<boolean>`                               | `true`         | `false` removes the node and its whole subtree from navigation                                                            |
| `boundary`          | `MaybeRefOrGetter<boolean \| Direction[]>`                | `false`        | Focus boundary: `true` keeps focus inside in all directions, an array only in the listed ones                             |
| `loop`              | `MaybeRefOrGetter<boolean \| 'horizontal' \| 'vertical'>` | `false`        | Wrap around at the container's edges                                                                                      |
| `rememberLastFocus` | `MaybeRefOrGetter<boolean>`                               | `true`         | Re-entering the container returns to the child focused last                                                               |
| `preferredChildId`  | `MaybeRefOrGetter<string>`                                | —              | Child to focus when entering the container for the first time                                                             |
| `onFocus`           | `() => void`                                              | —              | This node gained focus                                                                                                    |
| `onBlur`            | `() => void`                                              | —              | This node lost focus                                                                                                      |
| `onEnter`           | `(e?: Event) => void`                                     | —              | Enter pressed while this node is focused (focused node only, no bubbling). Also fires on click when `pointer` is on       |
| `onBack`            | `(e?: KeyboardEvent) => void`                             | —              | Back key; bubbles up from the focused node and the **first** node defining it handles it. Unhandled = no `preventDefault` |
| `onArrow`           | `(dir, e?) => boolean \| void`                            | —              | Direction key; bubbles up from the focused node before navigating. Return `false` to cancel the move                      |
| `onBoundary`        | `(dir) => void`                                           | —              | Focus tried to leave this container in `dir` and nothing inside was left to go to                                         |

**Returns**:

| Field         | Description                                                                         |
| ------------- | ----------------------------------------------------------------------------------- |
| `el`          | Template ref; bind it to the element or component representing the node: `ref="el"` |
| `id`          | Node id                                                                             |
| `focused`     | `Ref<boolean>`: this node has focus                                                 |
| `focusWithin` | `Ref<boolean>`: this node or a descendant has focus (like CSS `:focus-within`)      |
| `focus()`     | Focus this node; returns whether it worked                                          |

`el` is optional: a container without an element uses the union of its children as its position, for when you don't want an extra wrapper in the DOM.

### `<Focusable>`

The component form of `useFocusable`, with the same options as props.

```vue
<Focusable
  as="button"
  id="play"
  :focusable="!loading"
  @focus="preview(item)"
  @enter="play(item)"
  @arrow="(dir) => dir !== 'up'"
  v-slot="{ focused, focusWithin, focus }"
>
  Play
</Focusable>
```

- `as`: the element or component to render, `div` by default.
- The rendered element carries `data-focused` and `data-focus-within` attributes for styling.
- The events (`@focus` `@blur` `@enter` `@back` `@arrow` `@boundary`) are declared as function props internally, so the return value of `@arrow` reaches the engine.
- A template ref exposes `{ id, focused, focusWithin, focus }`.

### `useSpatialNavigation()`

Returns `{ engine, focusedId, pointer }` inside a component. `focusedId` is a read-only ref with the id of the focused node.

### `SpatialNavigation` (the engine)

The engine has no Vue dependency and can be used on its own (another framework, or driven directly in tests).

| Member                              | Description                                                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `focus(id?)`                        | Focus a node (containers pick a child). Without an id, focuses the first available node in the tree. Returns success |
| `navigate(direction)`               | Move one step in a direction; returns whether focus moved                                                            |
| `handleKeyDown(event)`              | Handle a keyboard event; returns whether it was consumed (consumed events get `preventDefault`)                      |
| `focusedId`                         | Id of the focused node                                                                                               |
| `isFocusWithin(id)`                 | Whether a node is on the current focus path                                                                          |
| `isContainer(id)`                   | Whether a node currently has navigable children                                                                      |
| `pause()` / `resume()` / `paused`   | While paused, `handleKeyDown` does nothing (e.g. hand the keys to a video player)                                    |
| `subscribe(listener)`               | Listen to focus changes `(focusedId, previousId) => void`; returns an unsubscribe function                           |
| `register(node)` / `unregister(id)` | Register / unregister nodes; see `FocusNode` in [src/core/types.ts](src/core/types.ts)                               |

## Recipes

**Initial focus**: children mount before their parent, so calling `engine.focus(id)` or `focus()` in a page component's `onMounted` finds all child nodes ready.

**Dialogs**: add `boundary` to keep focus inside, close on `@back`, and send focus back afterwards.

```vue
<Focusable id="dialog" boundary preferred-child-id="ok" @back="close">
  <Focusable as="button" @enter="close">Cancel</Focusable>
  <Focusable as="button" id="ok" @enter="confirm">OK</Focusable>
</Focusable>
```

```ts
onMounted(() => engine.focus('dialog'));
function close() {
  open.value = false;
  nextTick(() => engine.focus('play-button'));
}
```

**Back key**: put `@back="router.back()"` on the page root; inner nodes such as dialogs get the key first with their own `@back`.

**Infinite loading**:

```vue
<Focusable class="row" @boundary="(dir) => dir === 'right' && loadMore()">
```

To move straight onto the new items once they are loaded: `await nextTick(); engine.navigate('right')`.

**Disabling**: nodes with `:focusable="false"` are skipped; disabling a container disables its whole subtree.

**Infinite loading in RTL**: arrow keys are physical and a row ends on the left in RTL, so the check has to follow the direction:

```ts
const end = () => (document.documentElement.dir === 'rtl' ? 'left' : 'right');
```

**Handing keys to something else**: after `engine.pause()` the engine ignores keys until `engine.resume()`. Or pass `target: null` and decide yourself when to call `engine.handleKeyDown(e)`.

## RTL

Works under `<html dir="rtl">` (or `dir="rtl"` on any element) with no configuration.

- **Arrow keys are physical**: right goes to the node visually on the right, like in browsers. Mirrored layouts (e.g. the sidebar moving to the right) navigate correctly and loops wrap to the visual opposite end.
- **"First" follows the document direction**: without an origin (`engine.focus()`, first programmatic focus of a container, focus restore) the top-most child on the start side is chosen: top-left in LTR, top-right in RTL.
- **Decided by the `dir` attribute**: the nearest ancestor with a `dir` attribute of the container's element (including itself), falling back to `<html dir>` (e.g. for element-less containers and the root). LTR and RTL regions can be mixed on one page: `<Focusable dir="rtl">` only affects its own subtree. Case-insensitive; `dir="auto"` or no `dir` means LTR.
- **Runtime switching**: changing `dir` takes effect immediately; the engine re-reads it every time.
- **What your code must handle**: directions in `@arrow`, `@boundary`, `boundary` etc. are physical. E.g. infinite loading in RTL has to check `'left'` (see [Recipes](#recipes)).

In the demo, switch with the "方向" (direction) button at the bottom of the sidebar or open `?dir=rtl`.

## Development

```bash
pnpm install
pnpm dev          # demo (demo/, imports src/ directly with hot reload)
pnpm test         # unit + component tests (Vitest + jsdom)
pnpm typecheck    # vue-tsc
pnpm lint         # oxlint
pnpm format       # oxfmt
pnpm build        # library → dist/
pnpm build:demo   # static demo site → demo-dist/
```

User-facing changes need a changeset (`pnpm changeset`). On `main`, CI opens a "Version Packages" PR; merging it publishes to npm.

Layout:

```text
src/
  core/         framework-agnostic engine: types, geometry, SpatialNavigation
  vue/          Vue bindings: plugin, useFocusable, <Focusable>
test/           geometry / engine / Vue integration tests
demo/           Demo app: home (rows, loop, infinite loading, dialog), grid, game library (below)
```

### Demo: the game library page

The "游戏库" (game library) page in the demo's sidebar mimics a big-screen game launcher (all titles and artwork are made up) and packs many navigation problems into one screen. The demo UI text is in Chinese.

| Scenario                                                   | Capability used                                                                                                                                           |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Continue playing": one large tile beside two stacked ones | Geometric navigation in an irregular layout; ties resolved by DOM order                                                                                   |
| Moving down from the corner button in the top bar          | Enters the adjacent narrow section, not the far full-width row                                                                                            |
| Filter chips that switch the filter on focus               | `preferredChildId` lands on the active chip when entering; `boundary` limited to left / right                                                             |
| A filter with no results                                   | Reactive `focusable`: the empty grid is never focused                                                                                                     |
| Game detail layer                                          | `boundary`; layered `@back` (panel → tabs → close); on close focus returns to the card, or to its section if the card is gone                             |
| Achievements / screenshots / news inside the detail        | Tabs that switch on focus, looping screenshots                                                                                                            |
| Quick menu drawer (M key or gamepad Start)                 | Saves `focusedId` before opening and restores it after; sliders return `false` from `onArrow` to capture left / right (mirrored in RTL)                   |
| Friends list                                               | Nested containers (two buttons per row), column kept when moving up / down; the offline friend's "invite" is disabled                                     |
| Launching a game                                           | `engine.pause()` / `resume()`: the "game" handles the arrow keys while it runs                                                                            |
| Gamepad                                                    | [demo/gamepad.ts](demo/gamepad.ts) maps a standard gamepad's d-pad, left stick and A / B / Start to keyboard events (with key repeat); no library changes |
| Brightness                                                 | The quick menu slider applies to the page live                                                                                                            |

The page has no hand-written ids for navigation except one: landing on the active tab when entering a tab row.

## Known limitations

- If the focused node becomes `focusable: false` while focused, focus does not move away by itself; call `engine.focus()`.
- After the focused node unmounts, its former position is unknown, so the ancestor falls back to the last-focused child or the top-most child on the start side.
- The engine does not call DOM `element.focus()`. For screen readers or native focus styles, handle it in `@focus`.
- Holding a direction key navigates at the system's key-repeat rate; there is no built-in throttling.

## License

[MIT](LICENSE)
