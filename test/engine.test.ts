import { describe, expect, it, vi } from 'vitest';
import { grid, key, setup } from './helpers';

const tick = () => new Promise<void>((r) => queueMicrotask(r));

describe('basic navigation', () => {
  it('moves around a flat grid and stops at the edges', () => {
    const { nav, add } = setup();
    grid(add, null, 3, 3);
    nav.focus('11');
    expect(nav.navigate('right')).toBe(true);
    expect(nav.focusedId).toBe('12');
    expect(nav.navigate('right')).toBe(false);
    expect(nav.focusedId).toBe('12');
    nav.navigate('down');
    expect(nav.focusedId).toBe('22');
    nav.navigate('left');
    nav.navigate('left');
    expect(nav.focusedId).toBe('20');
    nav.navigate('up');
    expect(nav.focusedId).toBe('10');
  });

  it('focuses the top-left node when navigating with nothing focused', () => {
    const { nav, add } = setup();
    grid(add, null, 2, 2);
    expect(nav.navigate('down')).toBe(true);
    expect(nav.focusedId).toBe('00');
  });

  it('skips disabled and hidden nodes, including disabled subtrees', () => {
    const { nav, add } = setup();
    add('a', null, [0, 0, 100, 100]);
    add('disabled', null, [110, 0, 100, 100], { focusable: false });
    add('hidden', null, [220, 0, 0, 0]);
    add('box', null, [330, 0, 300, 100], { focusable: false });
    add('inBox', 'box', [330, 0, 100, 100]);
    add('d', null, [700, 0, 100, 100]);
    nav.focus('a');
    nav.navigate('right');
    expect(nav.focusedId).toBe('d');
    expect(nav.focus('disabled')).toBe(false);
  });

  it('focus() returns false for unknown ids', () => {
    const { nav } = setup();
    expect(nav.focus('nope')).toBe(false);
    expect(nav.focus()).toBe(false);
  });
});

describe('containers', () => {
  /** Sidebar with 3 items on the left, content with 2 rows of 3 items on the right. */
  function layout(extra: { content?: object; row1?: object } = {}) {
    const s = setup();
    const { add } = s;
    add('sidebar', null, [0, 0, 100, 300]);
    grid(add, 'sidebar', 3, 1, { prefix: 'm' });
    add('content', null, [200, 0, 400, 300], extra.content);
    add('row0', 'content', [200, 0, 400, 100]);
    grid(add, 'row0', 1, 3, { prefix: 'a', x: 200 });
    add('row1', 'content', [200, 110, 400, 100], extra.row1);
    grid(add, 'row1', 1, 3, { prefix: 'b', x: 200, y: 110 });
    return s;
  }

  it('focusing a container forwards to its top-left leaf', () => {
    const { nav } = layout();
    nav.focus('content');
    expect(nav.focusedId).toBe('a00');
    expect(nav.isFocusWithin('row0')).toBe(true);
    expect(nav.isFocusWithin('content')).toBe(true);
    expect(nav.isFocusWithin('sidebar')).toBe(false);
  });

  it('bubbles up and enters the sibling container next to the focused item', () => {
    const { nav } = layout();
    nav.focus('m10'); // second sidebar item, aligned with row1
    nav.navigate('right');
    expect(nav.focusedId).toBe('b00');
  });

  it('remembers the last focused child when re-entering', () => {
    const { nav } = layout();
    nav.focus('b02');
    nav.focus('m00');
    nav.navigate('right'); // would land on a00 spatially, but content remembers row1/b02
    expect(nav.focusedId).toBe('b02');
  });

  it('rememberLastFocus: false re-picks spatially', () => {
    const { nav } = layout({
      content: { rememberLastFocus: false },
      row1: { rememberLastFocus: false },
    });
    nav.focus('b02');
    nav.focus('m00');
    nav.navigate('right');
    expect(nav.focusedId).toBe('a00');
  });

  it('preferredChildId wins over spatial choice', () => {
    const { nav } = layout({ row1: { preferredChildId: 'b01' } });
    nav.focus('row1');
    expect(nav.focusedId).toBe('b01');
  });

  it('calls onBoundary on each container focus leaves', () => {
    const row0Boundary = vi.fn();
    const contentBoundary = vi.fn();
    const { nav, add } = setup();
    add('content', null, [0, 0, 400, 300], { onBoundary: contentBoundary });
    add('row0', 'content', [0, 0, 400, 100], { onBoundary: row0Boundary });
    grid(add, 'row0', 1, 3);
    nav.focus('02');
    nav.navigate('right');
    expect(row0Boundary).toHaveBeenCalledWith('right');
    expect(contentBoundary).toHaveBeenCalledWith('right');
  });

  it('boundary: true traps focus', () => {
    const { nav } = layout({ content: { boundary: true } });
    nav.focus('a00');
    expect(nav.navigate('left')).toBe(false);
    expect(nav.focusedId).toBe('a00');
  });

  it('boundary as a list traps only those directions', () => {
    const { nav, add } = setup();
    add('left', null, [0, 0, 100, 100]);
    add('box', null, [110, 0, 100, 100], { boundary: ['right'] });
    add('inner', 'box', [110, 0, 100, 100]);
    add('right', null, [220, 0, 100, 100]);
    nav.focus('inner');
    nav.navigate('right');
    expect(nav.focusedId).toBe('inner');
    nav.navigate('left');
    expect(nav.focusedId).toBe('left');
  });

  it('element-less containers use the union of their children', () => {
    const { nav, add } = setup();
    add('a', null, [0, 0, 100, 100]);
    add('group', null); // no element
    add('g1', 'group', [200, 0, 100, 100]);
    add('g2', 'group', [310, 0, 100, 100]);
    nav.focus('a');
    nav.navigate('right');
    expect(nav.focusedId).toBe('g1');
  });

  it('zero-size containers (display: contents) are measured by their children', () => {
    const { nav, add } = setup();
    add('a', null, [0, 0, 100, 100]);
    add('contents', null, [0, 0, 0, 0]);
    add('c1', 'contents', [200, 0, 100, 100]);
    nav.focus('a');
    nav.navigate('right');
    expect(nav.focusedId).toBe('c1');
  });

  it('a container whose children are all disabled is focused itself', () => {
    const { nav, add } = setup();
    add('row', null, [0, 0, 100, 100]);
    add('x', 'row', [0, 0, 50, 50], { focusable: false });
    nav.focus('row');
    expect(nav.focusedId).toBe('row');
  });
});

describe('loop', () => {
  it('wraps along the looping axis only', () => {
    const { nav, add } = setup();
    add('row', null, [0, 0, 400, 100], { loop: 'horizontal' });
    grid(add, 'row', 1, 3);
    nav.focus('02');
    nav.navigate('right');
    expect(nav.focusedId).toBe('00');
    nav.navigate('left');
    expect(nav.focusedId).toBe('02');
    expect(nav.navigate('down')).toBe(false);
  });

  it('wraps within a short last row instead of jumping diagonally to the row above', () => {
    const { nav, add } = setup();
    add('g', null, [0, 0, 400, 300], { loop: 'horizontal' });
    grid(add, 'g', 1, 3); // 00 01 02
    add('10', 'g', [0, 110, 100, 100]); // short last row: 10 11
    add('11', 'g', [110, 110, 100, 100]);
    nav.focus('11');
    nav.navigate('right'); // 02 is to the right (and above); the row should wrap instead
    expect(nav.focusedId).toBe('10');
  });

  it('without loop, a diagonal neighbour is still reachable', () => {
    const { nav, add } = setup();
    grid(add, null, 1, 3);
    add('10', null, [0, 110, 100, 100]);
    add('11', null, [110, 110, 100, 100]);
    nav.focus('11');
    nav.navigate('right');
    expect(nav.focusedId).toBe('02');
  });

  it('loop: true wraps a grid within the same row / column', () => {
    const { nav, add } = setup();
    add('g', null, [0, 0, 400, 400], { loop: true });
    grid(add, 'g', 3, 3);
    nav.focus('12');
    nav.navigate('right');
    expect(nav.focusedId).toBe('10');
    nav.focus('21');
    nav.navigate('down');
    expect(nav.focusedId).toBe('01');
  });
});

describe('callbacks', () => {
  it('fires blur / focus-within / focus in order and notifies subscribers', () => {
    const calls: string[] = [];
    const { nav, add } = setup();
    const track = (id: string) => ({
      onFocus: () => calls.push(`${id}:focus`),
      onBlur: () => calls.push(`${id}:blur`),
      onFocusWithinChange: (v: boolean) => calls.push(`${id}:within=${v}`),
    });
    add('p', null, [0, 0, 300, 100], track('p'));
    add('a', 'p', [0, 0, 100, 100], track('a'));
    add('q', null, [0, 200, 300, 100], track('q'));
    add('b', 'q', [0, 200, 100, 100], track('b'));
    const listener = vi.fn();
    nav.subscribe(listener);

    nav.focus('a');
    expect(calls).toEqual(['a:within=true', 'p:within=true', 'a:focus']);
    calls.length = 0;
    nav.navigate('down');
    expect(calls).toEqual([
      'a:blur',
      'a:within=false',
      'p:within=false',
      'b:within=true',
      'q:within=true',
      'b:focus',
    ]);
    expect(listener).toHaveBeenLastCalledWith('b', 'a');
  });

  it('onArrow returning false on the node or an ancestor cancels the move', () => {
    const { nav, add } = setup();
    const onArrow = vi.fn(() => false);
    add('row', null, [0, 0, 400, 100], { onArrow });
    grid(add, 'row', 1, 3);
    nav.focus('00');
    expect(nav.navigate('right')).toBe(false);
    expect(onArrow).toHaveBeenCalledWith('right', undefined);
    expect(nav.focusedId).toBe('00');
  });

  it('scrolls the focused element into view', () => {
    const { nav, add } = setup({ scrollIntoView: { block: 'center' } });
    const node = add('a', null, [0, 0, 10, 10]);
    nav.focus('a');
    expect(node.getElement!()!.scrollIntoView).toHaveBeenCalledWith({ block: 'center' });
  });
});

describe('handleKeyDown', () => {
  it('maps arrows to navigation and prevents default scrolling', () => {
    const { nav, add } = setup();
    grid(add, null, 1, 2);
    nav.focus('00');
    const e = key('ArrowRight');
    expect(nav.handleKeyDown(e)).toBe(true);
    expect(e.defaultPrevented).toBe(true);
    expect(nav.focusedId).toBe('01');
  });

  it('enter goes to the focused node only', () => {
    const { nav, add } = setup();
    const parentEnter = vi.fn();
    const childEnter = vi.fn();
    add('p', null, [0, 0, 100, 100], { onEnter: parentEnter });
    add('c', 'p', [0, 0, 50, 50], { onEnter: childEnter });
    nav.focus('c');
    nav.handleKeyDown(key('Enter'));
    expect(childEnter).toHaveBeenCalledOnce();
    expect(parentEnter).not.toHaveBeenCalled();
  });

  it('back bubbles to the nearest handler; unhandled back is left to the browser', () => {
    const { nav, add } = setup();
    const onBack = vi.fn();
    add('page', null, [0, 0, 100, 100], { onBack });
    add('item', 'page', [0, 0, 50, 50]);
    add('other', null, [200, 0, 50, 50]);
    nav.focus('item');
    nav.handleKeyDown(key('Escape'));
    expect(onBack).toHaveBeenCalledOnce();

    nav.focus('other');
    const e = key('Escape');
    expect(nav.handleKeyDown(e)).toBe(false);
    expect(e.defaultPrevented).toBe(false);
  });

  it('supports custom key maps', () => {
    const { nav, add } = setup({ keyMap: { right: ['d'], back: ['q'] } });
    const onBack = vi.fn();
    add('p', null, [0, 0, 300, 100], { onBack });
    grid(add, 'p', 1, 2);
    nav.focus('00');
    nav.handleKeyDown(key('d'));
    expect(nav.focusedId).toBe('01');
    nav.handleKeyDown(key('q'));
    expect(onBack).toHaveBeenCalledOnce();
    expect(nav.handleKeyDown(key('ArrowLeft'))).toBe(true); // untouched defaults still work
  });

  it('ignores keys while paused', () => {
    const { nav, add } = setup();
    grid(add, null, 1, 2);
    nav.focus('00');
    nav.pause();
    expect(nav.handleKeyDown(key('ArrowRight'))).toBe(false);
    nav.resume();
    nav.handleKeyDown(key('ArrowRight'));
    expect(nav.focusedId).toBe('01');
  });
});

describe('unregister', () => {
  it('moves focus to the nearest surviving ancestor after removal', async () => {
    const { nav, add } = setup();
    add('row', null, [0, 0, 400, 100]);
    grid(add, 'row', 1, 3);
    nav.focus('02');
    nav.unregister('02');
    await tick();
    expect(nav.focusedId).toBe('00');
  });

  it('falls back to anything focusable when the whole branch is gone', async () => {
    const { nav, add } = setup();
    add('row', null, [0, 0, 400, 100]);
    add('a', 'row', [0, 0, 100, 100]);
    add('other', null, [0, 200, 100, 100]);
    nav.focus('a');
    nav.unregister('a');
    nav.unregister('row');
    await tick();
    expect(nav.focusedId).toBe('other');
  });

  it('clears focus and notifies when nothing is left', async () => {
    const { nav, add } = setup();
    add('a', null, [0, 0, 100, 100]);
    nav.focus('a');
    const listener = vi.fn();
    nav.subscribe(listener);
    nav.unregister('a');
    await tick();
    expect(nav.focusedId).toBeNull();
    expect(listener).toHaveBeenCalledWith(null, 'a');
  });

  it('forgets a removed child as the remembered one', () => {
    const { nav, add } = setup();
    add('row', null, [0, 0, 400, 100]);
    grid(add, 'row', 1, 3);
    add('other', null, [0, 200, 100, 100]);
    nav.focus('02');
    nav.focus('other');
    nav.unregister('02');
    nav.focus('row');
    expect(nav.focusedId).toBe('00');
  });

  it('warns and replaces on duplicate ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { nav, add } = setup();
    add('a', null, [0, 0, 10, 10]);
    add('a', null, [20, 0, 10, 10]);
    expect(warn).toHaveBeenCalled();
    nav.focus('a');
    expect(nav.focusedId).toBe('a');
    warn.mockRestore();
  });
});
