import { describe, expect, it } from 'vitest';
import { isInDirection, pickBest, pickFirst, union, wrapOrigin } from '../src/core/geometry';
import { rect } from './helpers';

const origin = rect(100, 100, 100, 100);

describe('isInDirection', () => {
  it('accepts candidates strictly on the side of the direction', () => {
    expect(isInDirection(origin, rect(210, 100, 100, 100), 'right')).toBe(true);
    expect(isInDirection(origin, rect(-10, 100, 100, 100), 'left')).toBe(true);
    expect(isInDirection(origin, rect(100, 210, 100, 100), 'down')).toBe(true);
    expect(isInDirection(origin, rect(100, -10, 100, 100), 'up')).toBe(true);
    expect(isInDirection(origin, rect(210, 100, 100, 100), 'left')).toBe(false);
  });

  it('accepts a neighbour overlapped by a scaled-up origin', () => {
    const scaled = rect(90, 90, 120, 120); // origin at scale(1.2)
    expect(isInDirection(scaled, rect(205, 100, 100, 100), 'right')).toBe(true);
  });

  it('rejects a candidate that contains the origin', () => {
    expect(isInDirection(origin, rect(0, 0, 500, 500), 'right')).toBe(false);
  });
});

describe('pickBest', () => {
  const c = (id: string, ...box: [number, number, number, number]) => ({ id, rect: rect(...box) });

  it('prefers a candidate in the same row over a nearer diagonal one', () => {
    const best = pickBest(
      origin,
      [c('diag', 210, 220, 100, 100), c('row', 400, 100, 100, 100)],
      'right',
    );
    expect(best?.id).toBe('row');
  });

  it('vertically, a candidate entirely before an in-line one wins (corner button above a narrow section)', () => {
    const corner = rect(900, 0, 100, 40);
    const section = c('section', 0, 60, 800, 200); // not below the button, but entirely above the row
    const row = c('row', 0, 300, 1000, 150); // full width, so in line with the button
    expect(pickBest(corner, [row, section], 'down')?.id).toBe('section');
  });

  it('vertically, the in-line candidate still wins when the other one is not entirely before it', () => {
    const corner = rect(900, 0, 100, 40);
    const tall = c('tall', 0, 60, 800, 400); // extends past the row's top edge
    const row = c('row', 0, 300, 1000, 150);
    expect(pickBest(corner, [tall, row], 'down')?.id).toBe('row');
  });

  it('prefers the nearest along the direction', () => {
    const best = pickBest(
      origin,
      [c('far', 500, 100, 100, 100), c('near', 210, 100, 100, 100)],
      'right',
    );
    expect(best?.id).toBe('near');
  });

  it('breaks ties by cross-axis centre alignment', () => {
    const best = pickBest(
      origin,
      [c('off', 40, 210, 100, 100), c('aligned', 110, 210, 100, 100)],
      'down',
    );
    expect(best?.id).toBe('aligned');
  });

  it('treats sub-pixel differences as ties and keeps the earlier candidate', () => {
    // A tall tile beside two stacked ones: both are 78px off-centre, give or take float noise.
    const tall = { top: 119.12, bottom: 432.88, left: 0, right: 901.936 };
    const top = c('top', 898.656, 127.99997, 300, 140); // 78.00003 off-centre
    const bottom = c('bottom', 898.656, 284, 300, 140); // 78 off-centre
    expect(pickBest(tall, [top, bottom], 'right')?.id).toBe('top');
  });

  it('returns undefined when nothing lies in the direction', () => {
    expect(pickBest(origin, [c('left', 0, 100, 50, 50)], 'right')).toBeUndefined();
  });
});

it('pickFirst picks top-most then left-most', () => {
  const items = [
    { id: 'b', rect: rect(100, 0, 10, 10) },
    { id: 'c', rect: rect(0, 50, 10, 10) },
    { id: 'a', rect: rect(0, 0, 10, 10) },
  ];
  expect(pickFirst(items)?.id).toBe('a');
});

it('wrapOrigin moves the origin just before the opposite edge', () => {
  const rects = [rect(0, 0, 10, 10), rect(20, 0, 10, 10)];
  expect(wrapOrigin(origin, rects, 'right')).toMatchObject({ left: -1, right: -1, top: 100 });
  expect(wrapOrigin(origin, rects, 'left')).toMatchObject({ left: 31, right: 31 });
  expect(wrapOrigin(origin, rects, 'down')).toMatchObject({ top: -1, bottom: -1, left: 100 });
  expect(wrapOrigin(origin, rects, 'up')).toMatchObject({ top: 11, bottom: 11 });
});

it('union spans all rects', () => {
  expect(union([rect(0, 0, 10, 10), rect(50, 20, 10, 10)])).toEqual({
    top: 0,
    left: 0,
    bottom: 30,
    right: 60,
  });
  expect(union([])).toBeNull();
});

it('pickFirst picks top-most then right-most in RTL', () => {
  const items = [
    { id: 'left', rect: rect(0, 0, 10, 10) },
    { id: 'right', rect: rect(100, 0, 10, 10) },
    { id: 'lower', rect: rect(200, 50, 10, 10) },
  ];
  expect(pickFirst(items, true)?.id).toBe('right');
});
