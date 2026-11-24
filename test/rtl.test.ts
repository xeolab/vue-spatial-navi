import { afterEach, describe, expect, it } from 'vitest';
import { grid, setup } from './helpers';

const tick = () => new Promise<void>((r) => queueMicrotask(r));
const html = document.documentElement;
afterEach(() => html.removeAttribute('dir'));

/** A 1×3 row; in RTL the visual start is the right-most cell ("02"). */
function row() {
  const s = setup();
  const container = s.add('row', null, [0, 0, 400, 100]);
  grid(s.add, 'row', 1, 3);
  return { ...s, container };
}

describe('RTL', () => {
  it('<html dir="rtl">: entering a container with no origin starts top-right', () => {
    html.setAttribute('dir', 'rtl');
    const { nav } = row();
    nav.focus('row');
    expect(nav.focusedId).toBe('02');
  });

  it('<html dir="rtl">: focus() with no id starts at the top-right of the whole tree', () => {
    html.setAttribute('dir', 'rtl');
    const { nav, add } = setup();
    grid(add, null, 2, 3);
    nav.focus();
    expect(nav.focusedId).toBe('02');
  });

  it('dir is case-insensitive', () => {
    html.setAttribute('dir', 'RTL');
    const { nav } = row();
    nav.focus('row');
    expect(nav.focusedId).toBe('02');
  });

  it('a dir attribute on the container wins over <html dir>', () => {
    const rtlRow = row();
    rtlRow.container.getElement!()!.setAttribute('dir', 'rtl');
    rtlRow.nav.focus('row');
    expect(rtlRow.nav.focusedId).toBe('02');

    html.setAttribute('dir', 'rtl');
    const ltrRow = row();
    ltrRow.container.getElement!()!.setAttribute('dir', 'ltr');
    ltrRow.nav.focus('row');
    expect(ltrRow.nav.focusedId).toBe('00');
  });

  it('inherits dir from an ancestor element in the document', () => {
    const section = document.createElement('section');
    section.setAttribute('dir', 'rtl');
    document.body.append(section);
    const { nav, container } = row();
    section.append(container.getElement!()!);
    nav.focus('row');
    expect(nav.focusedId).toBe('02');
    section.remove();
  });

  it('dir="auto" / no dir behaves as LTR', () => {
    html.setAttribute('dir', 'auto');
    const { nav } = row();
    nav.focus('row');
    expect(nav.focusedId).toBe('00');
  });

  it('focus restore after unmount lands on the RTL start', async () => {
    html.setAttribute('dir', 'rtl');
    const { nav } = row();
    nav.focus('00');
    nav.unregister('00');
    await tick();
    expect(nav.focusedId).toBe('02');
  });

  it('arrow keys stay physical in a mirrored layout (sidebar on the right)', () => {
    html.setAttribute('dir', 'rtl');
    const { nav, add } = setup();
    add('sidebar', null, [700, 0, 100, 300]);
    grid(add, 'sidebar', 3, 1, { prefix: 'm', x: 700 });
    add('content', null, [0, 0, 600, 300]);
    add('row0', 'content', [0, 0, 600, 100]);
    grid(add, 'row0', 1, 3, { prefix: 'a', x: 270 });
    add('row1', 'content', [0, 110, 600, 100]);
    grid(add, 'row1', 1, 3, { prefix: 'b', x: 270, y: 110 });

    nav.focus('m10'); // second menu item, aligned with row1
    nav.navigate('left'); // towards the content
    expect(nav.focusedId).toBe('b02'); // right-most of row1: nearest to the sidebar
    nav.navigate('left');
    expect(nav.focusedId).toBe('b01');
    nav.navigate('right');
    nav.navigate('right'); // back out to the sidebar
    expect(nav.focusedId).toBe('m10');
  });

  it('loop wraps to the visual opposite end in RTL', () => {
    html.setAttribute('dir', 'rtl');
    const { nav, add } = setup();
    add('row', null, [0, 0, 400, 100], { loop: 'horizontal' });
    grid(add, 'row', 1, 3);
    nav.focus('row'); // RTL start: 02
    nav.navigate('left');
    nav.navigate('left');
    expect(nav.focusedId).toBe('00');
    nav.navigate('left'); // past the visual end → wraps to the right-most
    expect(nav.focusedId).toBe('02');
  });
});
