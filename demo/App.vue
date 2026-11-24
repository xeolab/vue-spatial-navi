<script setup lang="ts">
import { Focusable, useSpatialNavigation } from '@xeolab/vue-spatial-navi';
import { nextTick, onMounted, ref } from 'vue';
import Dialog from './components/Dialog.vue';
import GridPage from './components/GridPage.vue';
import HomePage from './components/HomePage.vue';
import LibraryPage from './components/library/LibraryPage.vue';
import { endDirection, rtl, toggleDir } from './dir';
import { log, logs } from './log';

const { engine, focusedId } = useSpatialNavigation();

const pages = [
  { id: 'home', label: '首页' },
  { id: 'grid', label: '网格' },
  { id: 'library', label: '游戏库' },
] as const;
const page = ref<(typeof pages)[number]['id']>('home');
const dialogOpen = ref(false);

onMounted(() => engine.focus('hero-play'));

// Move towards the content rather than focus('content'): with an origin, focus lands next to the menu item.
function enterContent() {
  engine.navigate(endDirection());
}

function closeDialog() {
  dialogOpen.value = false;
  // The dialog's nodes are gone after the next render; send focus back where it came from.
  nextTick(() => engine.focus('hero-play'));
}
</script>

<template>
  <div class="app">
    <Focusable id="sidebar" as="nav" class="sidebar">
      <div class="logo">Vue Spatial Navi</div>
      <Focusable
        v-for="p in pages"
        :id="`menu-${p.id}`"
        :key="p.id"
        as="button"
        class="menu-item"
        :class="{ active: page === p.id }"
        @focus="page = p.id"
        @enter="enterContent"
      >
        {{ p.label }}
      </Focusable>
      <Focusable
        as="button"
        class="menu-item dir-toggle"
        @enter="(toggleDir(), log(`dir=${rtl ? 'rtl' : 'ltr'}`))"
      >
        方向：{{ rtl ? 'RTL' : 'LTR' }}
      </Focusable>
    </Focusable>

    <Focusable
      id="content"
      as="main"
      class="content"
      @back="(engine.focus('sidebar'), log('back → 回到侧边栏'))"
    >
      <HomePage v-if="page === 'home'" @play="dialogOpen = true" />
      <GridPage v-else-if="page === 'grid'" />
      <LibraryPage v-else />
    </Focusable>

    <footer class="status">
      <span>焦点：<b>{{ focusedId ?? '—' }}</b></span>
      <span class="hint"
        >方向键 / WASD 移动 · Enter 确认 · Esc / Backspace 返回 · 也可以用鼠标</span
      >
      <span class="logs">{{ logs.join('  ·  ') }}</span>
    </footer>

    <Dialog v-if="dialogOpen" @close="closeDialog" />
  </div>
</template>
