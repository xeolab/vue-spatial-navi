<script setup lang="ts">
import { useFocusable } from '@xeolab/vue-spatial-navi';
import type { Game } from './store';

const props = defineProps<{ game: Game; variant?: 'portrait' | 'landscape' | 'feature' }>();
const emit = defineEmits<{ open: [game: Game, nodeId: string]; focus: [game: Game] }>();

// No hand-written id: the auto-generated one is passed up so the page can return focus here later.
const { el, id, focused } = useFocusable({
  onEnter: () => emit('open', props.game, id),
  onFocus: () => emit('focus', props.game),
});
</script>

<template>
  <div
    ref="el"
    class="cover"
    :class="[variant ?? 'portrait', { focused }]"
    :style="{ '--h': game.hue }"
  >
    <span class="glyph">{{ game.title[0] }}</span>
    <div class="meta">
      <b>{{ game.title }}</b>
      <small v-if="variant === 'feature'">{{ game.genre }} · 已玩 {{ game.hours }} 小时</small>
    </div>
    <span v-if="game.favorite" class="badge fav">★</span>
    <span v-if="!game.installed" class="badge cloud">☁</span>
  </div>
</template>

<style scoped>
.cover {
  position: relative;
  overflow: hidden;
  flex: none;
  border-radius: 10px;
  cursor: pointer;
  background:
    radial-gradient(circle at 30% 20%, hsl(var(--h) 80% 60% / 0.55), transparent 60%),
    linear-gradient(160deg, hsl(var(--h) 45% 28%), hsl(calc(var(--h) + 60) 50% 12%));
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}
.portrait {
  inline-size: 150px;
  block-size: 225px;
}
.landscape {
  inline-size: 300px;
  block-size: 140px;
}
.feature {
  inline-size: 100%;
  block-size: 100%;
}
.cover.focused {
  transform: scale(1.06);
  z-index: 1;
  box-shadow:
    0 0 0 3px #fff,
    0 18px 40px #000a;
}
.glyph {
  position: absolute;
  inset-block-start: 8%;
  inset-inline-start: 10%;
  font-size: 64px;
  font-weight: 900;
  opacity: 0.25;
}
.feature .glyph {
  font-size: 160px;
}
.meta {
  position: absolute;
  inset: auto 0 0;
  padding: 28px 12px 10px;
  background: linear-gradient(transparent, #000c);
  display: grid;
  gap: 2px;
}
.meta b {
  font-size: 14px;
}
.feature .meta b {
  font-size: 26px;
}
.meta small {
  color: #fffa;
}
.badge {
  position: absolute;
  inset-block-start: 8px;
  inline-size: 24px;
  block-size: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  background: #0008;
}
.fav {
  inset-inline-end: 8px;
  color: #ffd166;
}
.cloud {
  inset-inline-end: 36px;
}
</style>
