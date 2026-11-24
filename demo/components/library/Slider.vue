<script setup lang="ts">
import { useFocusable } from '@xeolab/vue-spatial-navi';
import { endDirection } from '../../dir';

const props = withDefaults(
  defineProps<{ label: string; min?: number; max?: number; step?: number }>(),
  {
    min: 0,
    max: 100,
    step: 10,
  },
);
const value = defineModel<number>({ required: true });

// Left/right adjust the value instead of moving focus (returning false cancels navigation);
// up/down fall through to normal navigation.
const { el, focused } = useFocusable({
  onArrow(direction) {
    if (direction === 'up' || direction === 'down') return;
    const delta = direction === endDirection() ? props.step : -props.step;
    value.value = Math.min(props.max, Math.max(props.min, value.value + delta));
    return false;
  },
});
</script>

<template>
  <div ref="el" class="slider" :class="{ focused }">
    <span>{{ label }}</span>
    <div class="bar">
      <div class="fill" :style="{ inlineSize: `${((value - min) / (max - min)) * 100}%` }" />
    </div>
    <b>{{ value }}</b>
  </div>
</template>

<style scoped>
.slider {
  display: grid;
  grid-template-columns: 56px 1fr 36px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
}
.slider.focused {
  background: #ffffff14;
  box-shadow: inset 0 0 0 2px #fff;
}
.bar {
  block-size: 6px;
  border-radius: 3px;
  background: #ffffff22;
  display: flex;
}
.fill {
  border-radius: 3px;
  background: #5ec8ff;
  transition: inline-size 0.12s;
}
.focused .fill {
  background: #fff;
}
b {
  text-align: end;
  font-variant-numeric: tabular-nums;
}
</style>
