// Public entry point. Everything users can import is re-exported here; anything not listed is internal.

export { SpatialNavigation, DEFAULT_KEY_MAP } from './core/SpatialNavigation.js';
export type * from './core/types.js';
export {
  createSpatialNavigation,
  useSpatialNavigation,
  type SpatialNavigationContext,
  type SpatialNavigationPluginOptions,
} from './vue/plugin.js';
export { useFocusable, type UseFocusableOptions } from './vue/useFocusable.js';
export { Focusable } from './vue/Focusable.js';
