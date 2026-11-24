import { mount } from '@vue/test-utils';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, ref } from 'vue';
import { createSpatialNavigation, Focusable, useFocusable, useSpatialNavigation } from '../src';
import { rect } from './helpers';

// jsdom has no layout: read rects from `data-rect="left,top,width,height"`.
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function (this: Element) {
    const [l, t, w, hgt] = (this.getAttribute('data-rect') ?? '0,0,0,0').split(',').map(Number);
    return rect(l, t, w, hgt) as DOMRect;
  };
});

const press = (key: string) =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
const flush = () => new Promise((r) => setTimeout(r));

let wrapper: ReturnType<typeof mount> | undefined;
afterEach(() => wrapper?.unmount());

function mountWith(component: object, pluginOptions = {}) {
  const nav = createSpatialNavigation(pluginOptions);
  wrapper = mount(component, { attachTo: document.body, global: { plugins: [nav] } });
  return { nav, wrapper };
}

const Row = defineComponent({
  props: {
    items: { type: Array as () => string[], required: true },
    y: { type: Number, default: 0 },
  },
  setup:
    (props, { attrs }) =>
    () =>
      h(Focusable, { ...attrs, 'data-rect': `0,${props.y},1000,100` }, () =>
        props.items.map((id, i) =>
          h(Focusable, { key: id, id, 'data-rect': `${i * 110},${props.y},100,100` }, () => id),
        ),
      ),
});

describe('<Focusable>', () => {
  it('navigates with the keyboard and reflects state as data attributes', async () => {
    const { nav, wrapper } = mountWith({
      render: () => [h(Row, { items: ['a', 'b'] }), h(Row, { items: ['c', 'd'], y: 200 })],
    });
    expect(nav.engine.focus('a')).toBe(true);
    press('ArrowRight');
    await nextTick();
    expect(nav.focusedId.value).toBe('b');
    expect(wrapper.find('#b').exists()).toBe(false); // ids are engine ids, not DOM ids
    const b = wrapper.findAll('[data-focused]');
    expect(b).toHaveLength(1);
    expect(b[0].text()).toBe('b');
    expect(wrapper.findAll('[data-focus-within]')).toHaveLength(2); // row + item

    press('ArrowDown');
    await nextTick();
    expect(nav.focusedId.value).toBe('d');
  });

  it('exposes slot props and calls @enter / @back / @arrow', async () => {
    const onEnter = vi.fn();
    const onBack = vi.fn();
    const onArrow = vi.fn(() => false);
    const { nav, wrapper } = mountWith({
      render: () =>
        h(Focusable, { id: 'page', onBack, 'data-rect': '0,0,500,500' }, () => [
          h(
            Focusable,
            { id: 'x', onEnter, onArrow, 'data-rect': '0,0,100,100' },
            {
              default: ({ focused }: { focused: boolean }) => (focused ? 'on' : 'off'),
            },
          ),
          h(Focusable, { id: 'y', 'data-rect': '110,0,100,100' }),
        ]),
    });
    nav.engine.focus('x');
    await nextTick();
    expect(wrapper.text()).toContain('on');

    press('Enter');
    press('Escape');
    press('ArrowRight');
    expect(onEnter).toHaveBeenCalledOnce();
    expect(onBack).toHaveBeenCalledOnce();
    expect(onArrow).toHaveBeenCalledWith('right', expect.any(KeyboardEvent));
    expect(nav.focusedId.value).toBe('x'); // @arrow returned false
  });

  it('reacts to prop changes (focusable)', async () => {
    const disabled = ref(false);
    const { nav } = mountWith({
      render: () => [
        h(Focusable, { id: 'a', 'data-rect': '0,0,100,100' }),
        h(Focusable, { id: 'b', focusable: !disabled.value, 'data-rect': '110,0,100,100' }),
        h(Focusable, { id: 'c', 'data-rect': '220,0,100,100' }),
      ],
    });
    nav.engine.focus('a');
    disabled.value = true;
    await nextTick();
    press('ArrowRight');
    expect(nav.focusedId.value).toBe('c');
  });

  it('restores focus when the focused node is unmounted', async () => {
    const items = ref(['a', 'b', 'c']);
    const { nav } = mountWith({ render: () => h(Row, { items: items.value }) });
    nav.engine.focus('c');
    items.value = ['a', 'b'];
    await flush();
    expect(nav.focusedId.value).toBe('a');
  });

  it('renders the `as` element', () => {
    const { wrapper } = mountWith({ render: () => h(Focusable, { as: 'button' }, () => 'Go') });
    expect(wrapper.find('button').text()).toBe('Go');
  });
});

describe('useFocusable', () => {
  it('works with a template ref on a component and exposes reactive state', async () => {
    const Card = defineComponent({
      props: { id: String, x: Number },
      setup(props) {
        const { el, focused, focusWithin } = useFocusable({ id: props.id });
        return () =>
          h(
            'div',
            { ref: el, 'data-rect': `${props.x},0,100,100` },
            `${focused.value}/${focusWithin.value}`,
          );
      },
    });
    const { nav, wrapper } = mountWith({
      render: () => [h(Card, { id: 'one', x: 0 }), h(Card, { id: 'two', x: 110 })],
    });
    nav.engine.focus('one');
    await nextTick();
    expect(wrapper.text()).toBe('true/truefalse/false');
  });

  it('throws a helpful error without the plugin', () => {
    const Bad = defineComponent({ setup: () => (useFocusable(), () => null) });
    const err = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => mount(Bad)).toThrow(/Plugin not installed/);
    err.mockRestore();
  });

  it('useSpatialNavigation exposes the engine and the focused id', async () => {
    let ctx: ReturnType<typeof useSpatialNavigation> | undefined;
    const { nav } = mountWith({
      setup: () => (
        (ctx = useSpatialNavigation()),
        () => h(Focusable, { id: 'a', 'data-rect': '0,0,1,1' })
      ),
    });
    expect(ctx!.engine).toBe(nav.engine);
    ctx!.engine.focus('a');
    expect(ctx!.focusedId.value).toBe('a');
  });
});

describe('RTL', () => {
  afterEach(() => document.documentElement.removeAttribute('dir'));

  it('focus() starts at the right-most item under <html dir="rtl">', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    const { nav } = mountWith({ render: () => h(Row, { items: ['a', 'b', 'c'] }) });
    nav.engine.focus();
    expect(nav.focusedId.value).toBe('c');
  });

  it('a dir attribute on <Focusable> scopes RTL to that region', () => {
    const { nav } = mountWith({
      render: () => [
        h(Row, { id: 'ltr', items: ['a', 'b'] }),
        h(Row, { id: 'rtl', dir: 'rtl', items: ['x', 'y'], y: 200 }),
      ],
    });
    nav.engine.focus('ltr');
    expect(nav.focusedId.value).toBe('a');
    nav.engine.focus('rtl');
    expect(nav.focusedId.value).toBe('y');
  });
});

describe('plugin options', () => {
  it('pointer: moving over a node focuses it, click triggers enter', async () => {
    const onEnter = vi.fn();
    const { nav, wrapper } = mountWith(
      {
        render: () => [
          h(Focusable, { id: 'a', 'data-rect': '0,0,100,100' }),
          h(Focusable, { id: 'b', class: 'b', onEnter, 'data-rect': '110,0,100,100' }),
        ],
      },
      { pointer: true },
    );
    await nextTick();
    await wrapper.find('.b').trigger('mousemove', { movementX: 0, movementY: 0 }); // synthetic, e.g. after scroll
    expect(nav.focusedId.value).toBeNull();
    await wrapper.find('.b').trigger('mousemove', { movementX: 3 });
    expect(nav.focusedId.value).toBe('b');
    await wrapper.find('.b').trigger('click');
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('target: null does not listen to window; listener is removed on unmount', () => {
    const { nav } = mountWith(
      { render: () => h(Focusable, { id: 'a', 'data-rect': '0,0,1,1' }) },
      { target: null },
    );
    press('ArrowRight');
    expect(nav.focusedId.value).toBeNull();

    const nav2 = mountWith({ render: () => h(Focusable, { id: 'z', 'data-rect': '0,0,1,1' }) }).nav;
    wrapper!.unmount();
    wrapper = undefined;
    const spy = vi.spyOn(nav2.engine, 'handleKeyDown');
    press('ArrowRight');
    expect(spy).not.toHaveBeenCalled();
  });
});
