<script setup lang="ts">
import { useSpatialNavigation } from '@xeolab/vue-spatial-navi';
import { onMounted, onUnmounted, reactive } from 'vue';
import type { Game } from './store';

defineProps<{ game: Game }>();
const emit = defineEmits<{ exit: [] }>();
const { engine } = useSpatialNavigation();
const dot = reactive({ x: 50, y: 50 });

// While a "game" runs, navigation is paused and the game takes the keys itself.
const MOVES: Record<string, [number, number]> = {
  ArrowUp: [0, -5],
  ArrowDown: [0, 5],
  ArrowLeft: [-5, 0],
  ArrowRight: [5, 0],
};
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' || e.key === 'Backspace') return emit('exit');
  const move = MOVES[e.key];
  if (!move) return;
  e.preventDefault();
  dot.x = Math.min(95, Math.max(5, dot.x + move[0]));
  dot.y = Math.min(90, Math.max(10, dot.y + move[1]));
}
onMounted(() => {
  engine.pause();
  window.addEventListener('keydown', onKey);
});
onUnmounted(() => {
  window.removeEventListener('keydown', onKey);
  engine.resume();
});
</script>

<template>
  <div class="running" :style="{ '--h': game.hue }">
    <p>正在运行：<b>{{ game.title }}</b></p>
    <p class="hint">导航已暂停（engine.pause），方向键现在由“游戏”处理 · Esc / Ⓑ 退出</p>
    <div class="dot" :style="{ insetInlineStart: `${dot.x}%`, insetBlockStart: `${dot.y}%` }" />
  </div>
</template>

<style scoped>
.running {
  position: fixed;
  inset: 0;
  z-index: 30;
  background: radial-gradient(circle, hsl(var(--h) 50% 20%), #000);
  text-align: center;
  padding-block-start: 30vh;
}
.running b {
  font-size: 32px;
}
.hint {
  color: #fff8;
}
.dot {
  position: absolute;
  inline-size: 28px;
  block-size: 28px;
  margin: -14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 24px #fff;
  transition: inset 0.08s;
}
</style>
