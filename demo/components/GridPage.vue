<script setup lang="ts">
import { Focusable } from '@xeolab/vue-spatial-navi';
import { ref } from 'vue';
import { log } from '../log';

const loop = ref(true);
</script>

<template>
  <section class="hero">
    <h1>网格</h1>
    <p>不需要声明行列结构，引擎按元素的实际位置寻找最近的邻居。选项是响应式的，可以随时切换。</p>
    <Focusable class="hero-actions">
      <Focusable as="button" class="btn" @enter="loop = !loop"
        >循环：{{ loop ? '开' : '关' }}</Focusable
      >
    </Focusable>
  </section>
  <Focusable class="grid" :loop="loop">
    <Focusable
      v-for="n in 24"
      :key="n"
      class="tile"
      :class="{ wide: n % 7 === 1 }"
      @enter="log(`格子 ${n}`)"
    >
      {{ n }}
    </Focusable>
  </Focusable>
</template>
