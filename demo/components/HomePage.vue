<script setup lang="ts">
import { Focusable, useSpatialNavigation, type Direction } from '@xeolab/vue-spatial-navi';
import { nextTick, ref } from 'vue';
import { endDirection } from '../dir';
import { log } from '../log';
import Card from './Card.vue';

defineEmits<{ play: [] }>();

const { engine } = useSpatialNavigation();
const liked = ref(false);
const items = (prefix: string, n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${prefix}-${from + i}`,
    title: `${prefix} ${from + i + 1}`,
    hue: (from + i) * 37,
  }));

const infinite = ref(items('无限', 6));

async function loadMore(direction: Direction) {
  if (direction !== endDirection()) return;
  infinite.value.push(...items('无限', 6, infinite.value.length));
  log(`onBoundary(${direction}) → 加载到 ${infinite.value.length} 项`);
  await nextTick();
  engine.navigate(direction);
}
</script>

<template>
  <section class="hero">
    <h1>vue-spatial-navi</h1>
    <p>为只用方向键操作的 Web 应用准备的 Vue 3 空间导航。</p>
    <Focusable class="hero-actions">
      <Focusable id="hero-play" as="button" class="btn primary" @enter="$emit('play')"
        >▶ 打开弹窗</Focusable
      >
      <Focusable
        as="button"
        class="btn"
        @enter="((liked = !liked), log(liked ? '已收藏' : '取消收藏'))"
      >
        {{ liked ? '★ 已收藏' : '☆ 收藏' }}
      </Focusable>
    </Focusable>
  </section>

  <Focusable as="section" class="row">
    <h2>热门推荐 <small>普通横向列表，记住上次位置</small></h2>
    <div class="track">
      <Card
        v-for="c in items('推荐', 12)"
        :key="c.id"
        v-bind="c"
        @select="log(`选择了 ${c.title}`)"
      />
    </div>
  </Focusable>

  <Focusable as="section" class="row" loop="horizontal">
    <h2>循环 <small>loop="horizontal"：到头后回到另一端</small></h2>
    <div class="track">
      <Card
        v-for="c in items('循环', 6)"
        :key="c.id"
        v-bind="c"
        @select="log(`选择了 ${c.title}`)"
      />
    </div>
  </Focusable>

  <Focusable as="section" class="row" @boundary="loadMore">
    <h2>无限加载 <small>@boundary：到达末端后继续按方向键加载更多</small></h2>
    <div class="track">
      <Card v-for="c in infinite" :key="c.id" v-bind="c" @select="log(`选择了 ${c.title}`)" />
    </div>
  </Focusable>

  <Focusable as="section" class="row">
    <h2>禁用 <small>focusable=false 的节点会被跳过</small></h2>
    <div class="track">
      <Card
        v-for="(c, i) in items('卡片', 9)"
        :key="c.id"
        v-bind="c"
        :disabled="i % 3 === 1"
        @select="log(`选择了 ${c.title}`)"
      />
    </div>
  </Focusable>
</template>
