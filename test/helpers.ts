import { vi } from 'vitest';
import { SpatialNavigation } from '../src/core/SpatialNavigation';
import type { FocusNode, NodeId, SpatialNavigationOptions } from '../src/core/types';

export const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

/** A stand-in Element whose layout is a fixed rect (jsdom has no layout engine). */
export function fakeEl(left: number, top: number, width: number, height: number) {
  const el = document.createElement('div');
  // A real DOMRect: its fields are prototype getters, which object spread silently drops.
  el.getBoundingClientRect = () => new DOMRect(left, top, width, height);
  el.scrollIntoView = vi.fn();
  return el;
}

type Box = [left: number, top: number, width: number, height: number];

/** Tiny tree builder: `add('a', null, [0, 0, 10, 10], { ...extra })`. Box omitted = element-less node. */
export function setup(options?: SpatialNavigationOptions) {
  const nav = new SpatialNavigation(options);
  const add = (id: NodeId, parentId: NodeId | null, box?: Box, extra: Partial<FocusNode> = {}) => {
    const el = box && fakeEl(...box);
    const node: FocusNode = { id, parentId, getElement: () => el, ...extra };
    nav.register(node);
    return node;
  };
  return { nav, add };
}

/** Lays out a rows×cols grid of 100×100 cells with 10px gaps, ids `${prefix}${r}${c}`. */
export function grid(
  add: ReturnType<typeof setup>['add'],
  parentId: NodeId | null,
  rows: number,
  cols: number,
  { prefix = '', x = 0, y = 0 } = {},
) {
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      add(`${prefix}${r}${c}`, parentId, [x + c * 110, y + r * 110, 100, 100]);
}

export const key = (k: string) => new KeyboardEvent('keydown', { key: k, cancelable: true });
