<script setup lang="ts">
import { Focusable, useSpatialNavigation } from '@xeolab/vue-spatial-navi';
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { log } from '../../log';
import GameCover from './GameCover.vue';
import GameDetail from './GameDetail.vue';
import GameRunning from './GameRunning.vue';
import QuickMenu from './QuickMenu.vue';
import { FILTERS, games, settings, type FilterId, type Game } from './store';

const { engine } = useSpatialNavigation();

const filter = ref<FilterId>('recent');
const ambient = ref(games[0].hue);
const library = computed(() => games.filter(FILTERS.find((f) => f.id === filter.value)!.test));
const recent = computed(() => [...games].sort((a, b) => a.lastPlayed - b.lastPlayed).slice(0, 3));
const recommended = computed(() => games.filter((g) => !g.installed).slice(0, 8));
const newest = computed(() => [...games].reverse().slice(0, 12));

type Handle = { focus: () => boolean };
const sections = {
  continue: ref<Handle>(),
  recommended: ref<Handle>(),
  newest: ref<Handle>(),
  grid: ref<Handle>(),
};

// Overlays remember where focus came from (the auto-generated id of whatever was focused) and send it back on close.
// The card may be gone by then (installed → leaves "未安装"; unfavourited → leaves "收藏"), so also keep its section.
const detail = shallowRef<{ game: Game; from: string; section?: Handle } | null>(null);
const running = shallowRef<Game | null>(null);
const quick = shallowRef<{ from: string | null } | null>(null);

function openDetail(game: Game, from: string, section: keyof typeof sections) {
  detail.value = { game, from, section: sections[section].value };
}
function closeDetail() {
  const { from, section } = detail.value!;
  detail.value = null;
  nextTick(() => engine.focus(from) || section?.focus());
}
function toggleQuick() {
  if (running.value) return;
  if (quick.value) return closeQuick();
  quick.value = { from: engine.focusedId };
}
function closeQuick() {
  const { from } = quick.value!;
  quick.value = null;
  nextTick(() => from && engine.focus(from));
}
function exitToMenu() {
  quick.value = null;
  detail.value = null;
  nextTick(() => engine.focus('sidebar'));
}

// "M" (or the gamepad's Start button, see demo/gamepad.ts) opens the quick menu from anywhere on this page.
const onKey = (e: KeyboardEvent) => (e.key === 'm' || e.key === 'M') && toggleQuick();
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div
    class="library"
    :style="{ '--ambient': ambient, filter: `brightness(${settings.brightness}%)` }"
  >
    <header class="topbar">
      <h1>游戏库</h1>
      <span class="legend">Ⓐ / Enter 选择 · Ⓑ / Esc 返回 · ☰ / M 快捷菜单 · 支持手柄</span>
      <Focusable as="button" class="pill" @enter="toggleQuick">☰ 快捷菜单</Focusable>
    </header>

    <section>
      <h2>继续游戏</h2>
      <!-- Irregular layout: one large tile beside two stacked ones; navigation follows the geometry. -->
      <Focusable :ref="sections.continue" class="continue">
        <GameCover
          v-for="(g, i) in recent"
          :key="g.id"
          :game="g"
          :variant="i === 0 ? 'feature' : 'landscape'"
          :class="i === 0 ? 'big' : ''"
          @open="(g, id) => openDetail(g, id, 'continue')"
          @focus="ambient = $event.hue"
        />
      </Focusable>
    </section>

    <Focusable :ref="sections.recommended" as="section" class="shelf">
      <h2>为你推荐 <small>未安装</small></h2>
      <div class="track">
        <GameCover
          v-for="g in recommended"
          :key="g.id"
          :game="g"
          variant="landscape"
          @open="(g, id) => openDetail(g, id, 'recommended')"
          @focus="ambient = $event.hue"
        />
      </div>
    </Focusable>

    <Focusable :ref="sections.newest" as="section" class="shelf">
      <h2>最近添加</h2>
      <div class="track">
        <GameCover
          v-for="g in newest"
          :key="g.id"
          :game="g"
          @open="(g, id) => openDetail(g, id, 'newest')"
          @focus="ambient = $event.hue"
        />
      </div>
    </Focusable>

    <section>
      <!-- boundary on left/right only: the chip row doesn't fling focus to the far top bar; up/down still leave. -->
      <!-- preferred: chips filter on focus, so entering the row must keep the current filter. -->
      <Focusable
        class="filters"
        :boundary="['left', 'right']"
        :preferred-child-id="`filter-${filter}`"
      >
        <Focusable
          v-for="f in FILTERS"
          :id="`filter-${f.id}`"
          :key="f.id"
          as="button"
          class="chip"
          :class="{ active: filter === f.id }"
          @focus="filter = f.id"
        >
          {{ f.label }} <small>{{ games.filter(f.test).length }}</small>
        </Focusable>
      </Focusable>
      <!-- An empty grid must not take focus itself, so focusable follows the result count. -->
      <Focusable :ref="sections.grid" class="grid" :focusable="library.length > 0">
        <GameCover
          v-for="g in library"
          :key="g.id"
          :game="g"
          @open="(g, id) => openDetail(g, id, 'grid')"
          @focus="ambient = $event.hue"
        />
        <p v-if="!library.length" class="empty">这里还没有游戏。焦点会跳过这个空区域。</p>
      </Focusable>
    </section>

    <!-- Teleported: the brightness filter on .library would otherwise become the containing block of these fixed layers.
         Teleport keeps the component tree, so they are still children of the content node. -->
    <Teleport to="body">
      <GameDetail
        v-if="detail"
        :game-id="detail.game.id"
        @close="closeDetail"
        @play="((running = detail.game), log(`启动 ${detail.game.title}`))"
      />
      <QuickMenu v-if="quick" @close="closeQuick" @exit="exitToMenu" />
      <GameRunning v-if="running" :game="running" @exit="((running = null), log('退出游戏'))" />
    </Teleport>
  </div>
</template>

<style scoped>
.library {
  --ambient: 200;
  margin: -32px -40px -64px;
  padding: 28px 40px 64px;
  min-block-size: 100%;
  background:
    radial-gradient(1200px 500px at 70% -10%, hsl(var(--ambient) 60% 30% / 0.45), transparent 70%),
    #0b0d12;
  transition: background 0.6s;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-block-end: 20px;
}
.topbar h1 {
  margin: 0;
  font-size: 28px;
}
.legend {
  color: #fff7;
  font-size: 13px;
  margin-inline-start: auto;
}
.pill {
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid #ffffff33;
  background: #ffffff0d;
  cursor: pointer;
}
.pill[data-focused] {
  background: #fff;
  color: #111;
}
h2 {
  font-size: 17px;
  margin: 24px 0 12px;
}
h2 small {
  color: #fff7;
  font-weight: 400;
  font-size: 13px;
  margin-inline-start: 8px;
}
.continue {
  display: grid;
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 140px 140px;
  gap: 16px;
  max-inline-size: 980px;
}
.continue .big {
  grid-row: span 2;
}
.continue :deep(.landscape) {
  inline-size: 100%;
}
.track {
  display: flex;
  gap: 16px;
  overflow-x: hidden;
  padding: 14px 24px;
  margin: -14px -24px;
  scroll-padding: 0 24px;
}
.filters {
  display: flex;
  gap: 10px;
  margin: 28px 0 16px;
}
.chip {
  padding: 8px 16px;
  border-radius: 999px;
  border: 0;
  background: #ffffff12;
  color: #fffb;
  cursor: pointer;
}
.chip small {
  opacity: 0.6;
  margin-inline-start: 4px;
}
.chip.active {
  background: #ffffff2a;
  color: #fff;
}
.chip[data-focused] {
  background: #fff;
  color: #111;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, 150px);
  gap: 20px 16px;
  min-block-size: 120px;
}
.empty {
  grid-column: 1 / -1;
  color: #fff7;
}
</style>
