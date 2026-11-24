# @xeolab/vue-spatial-navi

[English](README.md) | 简体中文

**[在线 demo](https://xeolab.github.io/vue-spatial-navi/)**：用方向键操作，或者接上手柄。

为 Vue 3 提供的空间导航（方向键导航）。适用于任何需要“只用方向键操作”的 Web 应用。

- **按实际布局寻找邻居**：基于元素的真实位置（`getBoundingClientRect`）计算方向上最近的节点，不需要手写行列或上下左右映射。
- **焦点树**：节点可以嵌套成容器，焦点先在同级之间移动，找不到再逐级冒泡，进入新容器时自动选出合适的子节点。
- **常见交互开箱即用**：记住上次焦点、首选子节点、循环、焦点边界（弹窗）、返回键冒泡、触边回调（无限加载）、禁用节点、隐藏节点自动跳过、焦点节点被卸载后自动恢复焦点。
- **两种写法**：`<Focusable>` 组件或 `useFocusable()` 组合式函数。
- **可选指针支持**：鼠标悬停聚焦、点击确认。
- **零运行时依赖**，核心引擎与 Vue 无关，约 3.7 kB（gzip）。

## 安装

```bash
npm install @xeolab/vue-spatial-navi
# 或 pnpm add / yarn add
```

需要 Vue `^3.5.0`。

## 快速开始

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
onMounted(() => engine.focus()); // 聚焦第一个可用节点
const open = (item: string) => console.log('打开', item);
</script>

<template>
  <Focusable as="nav" class="menu">
    <Focusable v-for="item in ['首页', '电影', '设置']" :key="item" as="button" @enter="open(item)">
      {{ item }}
    </Focusable>
  </Focusable>

  <Focusable as="section" class="row" loop="horizontal">
    <Focusable v-for="n in 10" :key="n" class="card" v-slot="{ focused }">
      卡片 {{ n }} <span v-if="focused">←</span>
    </Focusable>
  </Focusable>
</template>

<style>
/* 聚焦状态以 data 属性的形式出现在元素上 */
.card[data-focused] {
  outline: 3px solid orange;
  transform: scale(1.08);
}
.row[data-focus-within] h2 {
  color: orange;
}
</style>
```

## 核心概念

### 焦点树

每个 `<Focusable>` / `useFocusable()` 都会在引擎里注册一个节点，嵌套关系由组件树自动推断（provide / inject），与 DOM 结构无关。

- **叶子节点**：没有可导航子节点的节点，可以真正获得焦点。
- **容器节点**：有可导航子节点的节点。聚焦容器时，焦点会转交给它的某个子节点。

“可导航”是指：`focusable !== false`、祖先没有被禁用，并且元素有尺寸（`display: none`、`v-show="false"` 的节点会被自动跳过）。

### 导航算法

按下方向键时：

1. 从焦点节点开始向上，依次调用每个节点的 `onArrow`，任何一个返回 `false` 就取消这次移动。
2. 在**同级节点**中寻找该方向上最近的一个。判断依据是：
   - 必须整体位于该方向一侧（允许聚焦放大造成的少量重叠）；
   - 在交叉轴上与当前节点有重叠的（同一行 / 同一列）优先。上下移动时有一个例外：不重叠的候选如果整体都位于重叠候选之前，就由它胜出。比如角落里的按钮向下，会进入紧挨着的窄区域，而不是更远处的通栏。这条规则与 Android `FocusFinder` 相同；
   - 其次比较沿方向的距离，并惩罚交叉轴上的偏移；
   - 再比较中心对齐程度；
   - 仍然打平时（相差不到 0.5px，例如缩放带来的浮点误差），取 DOM 顺序靠前的节点。
3. 如果父容器开启了对应方向的 `loop`，规则会变成：先在同一行（同一列）里找，找不到就从这一行的另一端绕回，仍然找不到才考虑其他行。所以在最后一行不满的网格里，按右键会回到本行开头，而不是斜跳到上一行。
4. 仍找不到，则调用父容器的 `onBoundary(direction)`；如果父容器的 `boundary` 包含该方向，到此为止，否则把父容器当作当前节点，回到第 2 步继续向上冒泡。
5. 找到目标后，如果目标是容器，按以下顺序选择子节点，并一路向下直到叶子：
   1. 上次在该容器里聚焦的子节点（`rememberLastFocus`，默认开启）；
   2. `preferredChildId`；
   3. 与出发节点空间上最接近的子节点。

在每一层，用来比较距离的都是**最初那个叶子节点**的位置。所以从侧边栏第三项按右键，会进入与它水平对齐的那一行，而不是内容区的第一行。

调用 `engine.focus(id)` 聚焦容器时没有出发位置，第 3 种选择会改为最上方、且位于起始端的子节点：LTR 下是左上角，RTL 下是右上角，见 [RTL](#rtl)。

### 焦点恢复

如果当前焦点所在的节点被卸载（例如列表数据刷新），引擎会在当前渲染结束后把焦点交给**最近的仍然存在的祖先**，祖先会按上述规则选择子节点。如果整条链路都已不存在，就聚焦整棵树中的第一个可用节点。

## API

### `createSpatialNavigation(options?)`

创建 Vue 插件。

```ts
app.use(
  createSpatialNavigation({
    keyMap: { back: ['Escape'] },
    scrollIntoView: { block: 'center', inline: 'center', behavior: 'smooth' },
    pointer: true,
  }),
);
```

| 选项             | 类型                                | 默认值                                    | 说明                                                                             |
| ---------------- | ----------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------- |
| `keyMap`         | `Partial<Record<Action, string[]>>` | 见下                                      | 按动作覆盖按键，与 `event.key` 匹配                                              |
| `scrollIntoView` | `ScrollIntoViewOptions \| false`    | `{ block: 'nearest', inline: 'nearest' }` | 每次焦点变化时传给 `element.scrollIntoView`                                      |
| `target`         | `EventTarget \| null`               | `window`                                  | 在哪里监听 `keydown`。传 `null` 则不监听，由你自己调用 `engine.handleKeyDown(e)` |
| `pointer`        | `boolean`                           | `false`                                   | 鼠标在节点上移动时聚焦该节点，点击时触发 `onEnter`                               |

默认按键：

| 动作                             | 按键                                                 |
| -------------------------------- | ---------------------------------------------------- |
| `up` / `down` / `left` / `right` | `ArrowUp` / `ArrowDown` / `ArrowLeft` / `ArrowRight` |
| `enter`                          | `Enter`                                              |
| `back`                           | `Escape`、`Backspace`、`BrowserBack`                 |

返回值本身是插件，同时也带有 `engine` 和 `focusedId`，方便在组件外使用：

```ts
const nav = createSpatialNavigation();
app.use(nav);
nav.engine.focus('home');
```

### `useFocusable(options?)`

在组件的 `setup` 中注册一个节点。

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

**选项**（`MaybeRefOrGetter` 表示可以传值、ref 或 getter，引擎每次使用时读取最新值）：

| 选项                | 类型                                                      | 默认值   | 说明                                                                                              |
| ------------------- | --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `id`                | `string`                                                  | 自动生成 | 用于 `engine.focus(id)` 和 `preferredChildId`。创建后不可更改                                     |
| `focusable`         | `MaybeRefOrGetter<boolean>`                               | `true`   | `false` 时该节点及其整个子树都不可导航                                                            |
| `boundary`          | `MaybeRefOrGetter<boolean \| Direction[]>`                | `false`  | 焦点边界：`true` 表示四个方向都不能离开该容器，数组表示只限制列出的方向                           |
| `loop`              | `MaybeRefOrGetter<boolean \| 'horizontal' \| 'vertical'>` | `false`  | 到达容器边缘时从另一端绕回                                                                        |
| `rememberLastFocus` | `MaybeRefOrGetter<boolean>`                               | `true`   | 再次进入容器时回到上次聚焦的子节点                                                                |
| `preferredChildId`  | `MaybeRefOrGetter<string>`                                | —        | 首次进入容器时优先聚焦的子节点                                                                    |
| `onFocus`           | `() => void`                                              | —        | 本节点获得焦点                                                                                    |
| `onBlur`            | `() => void`                                              | —        | 本节点失去焦点                                                                                    |
| `onEnter`           | `(e?: Event) => void`                                     | —        | 本节点聚焦时按下确认键（只触发在焦点节点上，不冒泡）。开启 `pointer` 时点击也会触发               |
| `onBack`            | `(e?: KeyboardEvent) => void`                             | —        | 返回键，从焦点节点向上冒泡，**第一个**定义了它的节点处理。没有任何节点处理时不会 `preventDefault` |
| `onArrow`           | `(dir, e?) => boolean \| void`                            | —        | 方向键，从焦点节点向上冒泡，在导航之前调用，返回 `false` 取消这次移动                             |
| `onBoundary`        | `(dir) => void`                                           | —        | 焦点试图沿 `dir` 离开本容器，而容器内已经没有可去的节点                                           |

**返回值**：

| 字段          | 说明                                                                   |
| ------------- | ---------------------------------------------------------------------- |
| `el`          | 模板 ref，绑定到代表该节点的元素或组件上：`ref="el"`                   |
| `id`          | 节点 id                                                                |
| `focused`     | `Ref<boolean>`，本节点是否获得焦点                                     |
| `focusWithin` | `Ref<boolean>`，本节点或其后代是否获得焦点（类似 CSS `:focus-within`） |
| `focus()`     | 聚焦本节点，返回是否成功                                               |

`el` 可以不绑定：没有元素的容器会用子节点的并集作为自己的位置，适合不想多套一层 DOM 的场景。

### `<Focusable>`

`useFocusable` 的组件形式，参数与上表一一对应。

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
  播放
</Focusable>
```

- `as`：渲染的元素或组件，默认 `div`。
- 渲染出的元素上会带有 `data-focused` 和 `data-focus-within` 属性，可以直接用来写样式。
- 事件（`@focus` `@blur` `@enter` `@back` `@arrow` `@boundary`）在内部声明为函数 prop，所以 `@arrow` 的返回值能够传回引擎。
- 通过模板 ref 可以拿到 `{ id, focused, focusWithin, focus }`。

### `useSpatialNavigation()`

在组件中获取 `{ engine, focusedId, pointer }`。`focusedId` 是一个只读 ref，表示当前焦点节点的 id。

### `SpatialNavigation`（引擎）

引擎本身不依赖 Vue，也可以单独使用（例如接入其他框架，或在测试里直接驱动）。

| 成员                                | 说明                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| `focus(id?)`                        | 聚焦一个节点（容器会自动选择子节点）。不传 id 时聚焦整棵树中的第一个可用节点。返回是否成功 |
| `navigate(direction)`               | 手动向某个方向移动一步，返回是否移动成功                                                   |
| `handleKeyDown(event)`              | 处理一个键盘事件，返回是否被消费（被消费时会调用 `preventDefault`）                        |
| `focusedId`                         | 当前焦点节点 id                                                                            |
| `isFocusWithin(id)`                 | 某节点是否在当前焦点链路上                                                                 |
| `isContainer(id)`                   | 某节点当前是否有可导航的子节点                                                             |
| `pause()` / `resume()` / `paused`   | 暂停后 `handleKeyDown` 不做任何处理（例如播放视频时把按键交给播放器）                      |
| `subscribe(listener)`               | 监听焦点变化 `(focusedId, previousId) => void`，返回取消函数                               |
| `register(node)` / `unregister(id)` | 注册 / 注销节点，`FocusNode` 类型见 [src/core/types.ts](src/core/types.ts)                 |

## 常见场景

**初始焦点**：子组件会先于父组件挂载，所以在页面组件的 `onMounted` 里调用 `engine.focus(id)` 或 `focus()` 时，子节点都已经就绪。

**弹窗**：给弹窗容器加 `boundary` 把焦点锁在里面，用 `@back` 关闭；关闭后把焦点送回原来的位置。

```vue
<Focusable id="dialog" boundary preferred-child-id="ok" @back="close">
  <Focusable as="button" @enter="close">取消</Focusable>
  <Focusable as="button" id="ok" @enter="confirm">确定</Focusable>
</Focusable>
```

```ts
onMounted(() => engine.focus('dialog'));
function close() {
  open.value = false;
  nextTick(() => engine.focus('play-button'));
}
```

**返回键**：在页面根节点上写 `@back="router.back()"`，弹窗等内层节点上的 `@back` 会先拿到这个键。

**无限加载**：

```vue
<Focusable class="row" @boundary="(dir) => dir === 'right' && loadMore()">
```

加载完成后如果希望焦点直接移动到新内容上，可以 `await nextTick(); engine.navigate('right')`。

**禁用**：`:focusable="false"` 的节点会被跳过；禁用容器等于禁用它的整个子树。

**RTL 无限加载**：方向键是物理方向，RTL 下列表的末端在左边，所以判断条件要随方向变化：

```ts
const end = () => (document.documentElement.dir === 'rtl' ? 'left' : 'right');
```

**把按键交给其他组件**：`engine.pause()` 后引擎不再处理按键，`engine.resume()` 恢复。也可以传 `target: null`，自己决定何时调用 `engine.handleKeyDown(e)`。

## RTL

在 `<html dir="rtl">`（或局部元素上的 `dir="rtl"`）下可以直接使用，不需要额外配置。

- **方向键是物理方向**：按右键就去视觉上右边的节点，和浏览器的行为一致。镜像后的布局（例如侧边栏移到右侧）照样正确导航，循环也会绕回视觉上的另一端。
- **“第一个”跟随文档方向**：没有出发位置时（`engine.focus()`、第一次通过代码聚焦容器、焦点恢复），会选择最上方、位于起始端的子节点：LTR 是左上角，RTL 是右上角。
- **判断依据是 `dir` 属性**：取容器元素最近的带 `dir` 属性的祖先（包括容器自身），找不到时（例如容器没有绑定元素，或者是根节点）使用 `<html dir>`。所以同一页面里可以混排 LTR 和 RTL 区域，`<Focusable dir="rtl">` 只影响它自己的子树。`dir` 不区分大小写；`dir="auto"` 或没有设置时按 LTR 处理。
- **运行时切换**：修改 `dir` 后立即生效，引擎每次都会重新读取，不需要通知它。
- **需要业务代码注意**：`@arrow`、`@boundary`、`boundary` 等参数里的方向都是物理方向。比如无限加载在 RTL 下要判断 `'left'`，见 [常见场景](#常见场景)。

demo 中可以通过侧边栏底部的“方向”按钮切换，或者直接打开 `?dir=rtl`。

## 开发

```bash
pnpm install
pnpm dev          # 启动 demo（demo/ 目录，直接引用 src，修改即时生效）
pnpm test         # 单元测试 + 组件测试（Vitest + jsdom）
pnpm typecheck    # vue-tsc 类型检查
pnpm lint         # oxlint
pnpm format       # oxfmt
pnpm build        # 构建库到 dist/
pnpm build:demo   # 构建 demo 静态站点到 demo-dist/
```

面向用户的改动需要附带 changeset（`pnpm changeset`）。合入 `main` 后 CI 会开一个 “Version Packages” PR，合并它即发布到 npm。

目录结构：

```text
src/
  core/         与框架无关的引擎：类型、几何计算、SpatialNavigation
  vue/          Vue 绑定：插件、useFocusable、<Focusable>
test/           几何 / 引擎 / Vue 集成测试
demo/           示例应用：首页（横向列表、循环、无限加载、弹窗）、网格、游戏库（大屏模式风格的复杂场景，见下）
```

### demo：游戏库页面

侧边栏的“游戏库”页面模拟了一个大屏模式风格的游戏启动器（游戏名和图形都是虚构的），把多种导航难点集中在了一起：

| 场景                                      | 用到的能力                                                                                                            |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| “继续游戏”：一张大卡 + 两张上下叠放的小卡 | 不规则布局下的几何导航、打平时取 DOM 顺序                                                                             |
| 顶栏角落的按钮向下                        | 进入紧邻的窄区域，而不是远处的通栏                                                                                    |
| 筛选标签：获得焦点即切换筛选              | `preferredChildId` 进入时落在当前激活的筛选上；`boundary` 只限制左右方向                                              |
| 筛选结果为空的网格                        | 响应式 `focusable`，空网格不会被聚焦                                                                                  |
| 游戏详情层                                | `boundary` 焦点边界；`@back` 分层：内容区先返回标签，再关闭详情；关闭后焦点回到原卡片，卡片已不存在时回到所在分区     |
| 详情中的成就 / 截图 / 动态                | 获得焦点即切换的标签页、循环截图                                                                                      |
| 快捷菜单抽屉（M 键或手柄 Start）          | 打开前记录 `focusedId`，关闭后恢复；滑块用 `onArrow` 返回 `false` 截获左右键（RTL 下方向自动镜像）                    |
| 好友列表                                  | 嵌套容器（行内两个按钮），上下移动保持列；离线好友的“邀请”被禁用                                                      |
| 启动游戏                                  | `engine.pause()` / `resume()`：游戏运行期间方向键交给游戏自己处理                                                     |
| 手柄                                      | [demo/gamepad.ts](demo/gamepad.ts) 把标准手柄的十字键、左摇杆、A/B/Start 映射为键盘事件（带长按连发），库本身无需改动 |
| 亮度                                      | 快捷菜单里的滑块实时作用到页面                                                                                        |

整个页面没有为了导航手写 id，仅有的 id 用在“进入标签行时落在当前标签上”这一处。

## 已知限制

- 焦点节点在聚焦状态下变为 `focusable: false` 时，焦点不会自动移走，需要自行调用 `engine.focus()`。
- 焦点节点被卸载后，恢复焦点时不知道它原来的位置，因此祖先会选择“上次聚焦”的子节点，或者起始端最上方的子节点。
- 引擎不会调用 DOM 的 `element.focus()`。如果需要读屏器或原生焦点样式，请在 `@focus` 中自行处理。
- 按住方向键时会以系统的重复频率连续导航，目前没有内置节流。

## 许可证

[MIT](LICENSE)
