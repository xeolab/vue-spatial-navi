import { inject, shallowRef, type App, type InjectionKey, type Ref } from 'vue';
import { SpatialNavigation } from '../core/SpatialNavigation.js';
import type { NodeId, SpatialNavigationOptions } from '../core/types.js';

export interface SpatialNavigationPluginOptions extends SpatialNavigationOptions {
  /** Where to listen for `keydown`. Default `window`; `null` = don't listen (call `engine.handleKeyDown` yourself). */
  target?: EventTarget | null;
  /** Hovering a node focuses it and clicking it triggers `onEnter` (mouse). Default `false`. */
  pointer?: boolean;
}

export interface SpatialNavigationContext {
  engine: SpatialNavigation;
  focusedId: Readonly<Ref<NodeId | null>>;
  pointer: boolean;
}

export const NAVIGATION_KEY: InjectionKey<SpatialNavigationContext> = Symbol('spatial-navigation');
export const PARENT_KEY: InjectionKey<NodeId> = Symbol('spatial-navigation-parent');

export function createSpatialNavigation(options: SpatialNavigationPluginOptions = {}) {
  const engine = new SpatialNavigation(options);
  const focusedId = shallowRef(engine.focusedId);
  engine.subscribe((id) => (focusedId.value = id));
  const context: SpatialNavigationContext = { engine, focusedId, pointer: !!options.pointer };

  return {
    ...context,
    install(app: App) {
      app.provide(NAVIGATION_KEY, context);
      const target = options.target === undefined ? globalThis.window : options.target;
      if (!target) return;
      const onKeyDown = (e: Event) => engine.handleKeyDown(e as KeyboardEvent);
      target.addEventListener('keydown', onKeyDown);
      app.onUnmount(() => target.removeEventListener('keydown', onKeyDown));
    },
  };
}

export function useSpatialNavigation(): SpatialNavigationContext {
  const context = inject(NAVIGATION_KEY, null);
  if (!context) {
    throw new Error(
      '[spatial-navigation] Plugin not installed. Call app.use(createSpatialNavigation()).',
    );
  }
  return context;
}
