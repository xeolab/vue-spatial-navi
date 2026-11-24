<script setup lang="ts">
import { Focusable } from '@xeolab/vue-spatial-navi';
import { computed, onMounted, ref } from 'vue';
import { log } from '../../log';
import { games } from './store';

const props = defineProps<{ gameId: number }>();
// Read from the store (not a prop object) since installing / favouriting changes it.
const game = computed(() => games.find((g) => g.id === props.gameId)!);
const emit = defineEmits<{ close: []; play: [] }>();

type Handle = { focus: () => boolean };
const root = ref<Handle>();
const tabsRef = ref<Handle>();
const tabs = ['成就', '截图', '动态'] as const;
const tab = ref<(typeof tabs)[number]>('成就');
const installing = ref(0);

const achievements = Array.from({ length: 12 }, (_, i) => ({
  name: [
    '初来乍到',
    '小有所成',
    '收藏家',
    '速通者',
    '完美主义',
    '夜猫子',
    '探险家',
    '无伤通关',
    '团队之星',
    '百折不挠',
    '隐藏结局',
    '全成就',
  ][i],
  unlocked: i < Math.round((12 * game.value.achievements.unlocked) / game.value.achievements.total),
}));
const selected = ref(achievements[0]);

// Children are registered before this runs, so the root can forward focus to its top-start child ("开始游戏").
onMounted(() => root.value?.focus());

function primary() {
  if (game.value.installed) return emit('play');
  if (installing.value) return;
  log(`开始安装 ${game.value.title}`);
  const timer = setInterval(() => {
    installing.value += 10;
    if (installing.value < 100) return;
    clearInterval(timer);
    installing.value = 0;
    game.value.installed = true;
    log(`${game.value.title} 安装完成`);
  }, 150);
}
</script>

<template>
  <!-- boundary: focus can't leave; @back on the root closes, @back on the panel first returns to the tabs. -->
  <Focusable ref="root" class="detail" :style="{ '--h': game.hue }" boundary @back="emit('close')">
    <header>
      <span class="glyph">{{ game.title[0] }}</span>
      <h1>{{ game.title }}</h1>
      <p>
        {{ game.genre }} · 已玩 {{ game.hours }} 小时 · 成就 {{ game.achievements.unlocked }}/{{
          game.achievements.total
        }}
      </p>
      <Focusable class="actions">
        <Focusable as="button" class="btn primary" @enter="primary">
          <template v-if="game.installed">▶ 开始游戏</template>
          <template v-else-if="installing">安装中 {{ installing }}%</template>
          <template v-else>⬇ 安装</template>
        </Focusable>
        <Focusable
          as="button"
          class="btn"
          @enter="((game.favorite = !game.favorite), log(game.favorite ? '已收藏' : '取消收藏'))"
        >
          {{ game.favorite ? '★ 已收藏' : '☆ 收藏' }}
        </Focusable>
        <Focusable as="button" class="btn" @enter="log('属性：本 demo 未实现')">⚙ 属性</Focusable>
      </Focusable>
    </header>

    <!-- Tabs switch on focus, so entering the row must land on the active tab, not the nearest one. -->
    <Focusable ref="tabsRef" class="tabs" :preferred-child-id="`detail-tab-${tab}`">
      <Focusable
        v-for="t in tabs"
        :id="`detail-tab-${t}`"
        :key="t"
        as="button"
        class="tab"
        :class="{ active: tab === t }"
        @focus="tab = t"
      >
        {{ t }}
      </Focusable>
    </Focusable>

    <Focusable class="panel" @back="tabsRef?.focus()">
      <div v-if="tab === '成就'" class="ach">
        <div class="ach-grid">
          <Focusable
            v-for="a in achievements"
            :key="a.name"
            class="ach-tile"
            :class="{ locked: !a.unlocked }"
            @focus="selected = a"
          >
            {{ a.unlocked ? '🏆' : '🔒' }}
          </Focusable>
        </div>
        <aside>
          <b>{{ selected.name }}</b>
          <p>{{ selected.unlocked ? '已于 3 天前解锁' : '尚未解锁：继续游玩以解锁该成就' }}</p>
        </aside>
      </div>

      <Focusable v-else-if="tab === '截图'" class="shots" loop="horizontal">
        <Focusable
          v-for="n in 8"
          :key="n"
          class="shot"
          :style="{ '--s': n * 25 }"
          @enter="log(`查看截图 ${n}`)"
        >
          #{{ n }}
        </Focusable>
      </Focusable>

      <div v-else class="news">
        <Focusable v-for="n in 4" :key="n" class="news-item" @enter="log(`打开动态 ${n}`)">
          <b>版本 1.{{ 5 - n }} 更新说明</b>
          <small>{{ n * 6 }} 天前 · 修复了若干问题并优化了性能</small>
        </Focusable>
      </div>
    </Focusable>
  </Focusable>
</template>

<style scoped>
.detail {
  position: fixed;
  inset: 0;
  z-index: 10;
  overflow-y: auto;
  padding: 48px 64px;
  background: linear-gradient(180deg, hsl(var(--h) 45% 22%), #0b0d12 55%);
}
header {
  position: relative;
  margin-block-end: 28px;
}
.glyph {
  position: absolute;
  inset-block-start: -40px;
  inset-inline-end: 0;
  font-size: 260px;
  font-weight: 900;
  opacity: 0.08;
}
h1 {
  font-size: 48px;
  margin: 0 0 6px;
  letter-spacing: -0.02em;
}
header p {
  color: #fffa;
  margin: 0 0 24px;
}
.actions,
.tabs {
  display: flex;
  gap: 12px;
}
.btn {
  padding: 12px 26px;
  border-radius: 8px;
  border: 0;
  background: #ffffff1c;
  cursor: pointer;
  transition: transform 0.15s;
}
.btn.primary {
  background: #3fb950;
  color: #fff;
  font-weight: 700;
  min-inline-size: 160px;
}
.btn[data-focused] {
  box-shadow: 0 0 0 3px #fff;
  transform: scale(1.05);
}
.tabs {
  border-block-end: 1px solid #ffffff22;
  margin-block-end: 20px;
}
.tab {
  padding: 10px 4px;
  margin-inline-end: 20px;
  border: 0;
  background: none;
  color: #fff8;
  cursor: pointer;
  border-block-end: 3px solid transparent;
}
.tab.active {
  color: #fff;
  border-color: #fff;
}
.tab[data-focused] {
  color: #111;
  background: #fff;
  border-radius: 6px 6px 0 0;
  padding-inline: 12px;
}
.ach {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 32px;
}
.ach-grid {
  display: grid;
  grid-template-columns: repeat(6, 72px);
  gap: 12px;
}
.ach-tile {
  block-size: 72px;
  border-radius: 10px;
  background: #ffffff14;
  display: grid;
  place-items: center;
  font-size: 28px;
  cursor: pointer;
}
.ach-tile.locked {
  opacity: 0.45;
}
.ach-tile[data-focused] {
  opacity: 1;
  box-shadow: 0 0 0 3px #fff;
  transform: scale(1.08);
}
aside p {
  color: #fff9;
}
.shots {
  display: flex;
  gap: 16px;
  overflow: hidden;
  padding: 8px;
  margin: -8px;
}
.shot {
  flex: none;
  inline-size: 320px;
  block-size: 180px;
  border-radius: 10px;
  display: grid;
  place-items: end start;
  padding: 12px;
  cursor: pointer;
  background: linear-gradient(
    120deg,
    hsl(calc(var(--h) + var(--s)) 50% 35%),
    hsl(calc(var(--h) + var(--s) + 90) 50% 15%)
  );
}
.shot[data-focused] {
  box-shadow: 0 0 0 3px #fff;
}
.news {
  display: grid;
  gap: 10px;
  max-inline-size: 720px;
}
.news-item {
  display: grid;
  gap: 4px;
  padding: 14px 18px;
  border-radius: 10px;
  background: #ffffff0d;
  cursor: pointer;
}
.news-item small {
  color: #fff8;
}
.news-item[data-focused] {
  background: #ffffff26;
  box-shadow: inset 0 0 0 2px #fff;
}
</style>
