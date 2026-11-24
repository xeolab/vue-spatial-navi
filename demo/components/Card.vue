<script setup lang="ts">
// Built with the composable instead of <Focusable>, to show both APIs.
import { useFocusable } from '@xeolab/vue-spatial-navi';

const props = defineProps<{ title: string; hue: number; disabled?: boolean }>();
const emit = defineEmits<{ select: [] }>();

const { el, focused } = useFocusable({
  focusable: () => !props.disabled,
  onEnter: () => emit('select'),
});
</script>

<template>
  <div ref="el" class="card" :class="{ focused, disabled }" :style="{ '--hue': hue }">
    <span>{{ title }}</span>
    <small v-if="disabled">不可聚焦</small>
  </div>
</template>
