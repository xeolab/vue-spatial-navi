<script setup lang="ts">
import { Focusable } from '@xeolab/vue-spatial-navi';
import { onMounted, ref } from 'vue';
import { log } from '../../log';
import Slider from './Slider.vue';
import { FRIENDS, settings } from './store';

const emit = defineEmits<{ close: []; exit: [] }>();
const root = ref<{ focus: () => boolean }>();
onMounted(() => root.value?.focus());
</script>

<template>
  <div class="scrim" />
  <Focusable ref="root" as="aside" class="drawer" boundary @back="emit('close')">
    <h2>快捷菜单</h2>
    <Slider v-model="settings.volume" label="音量" />
    <Slider v-model="settings.brightness" label="亮度" :min="40" />
    <Focusable
      as="button"
      class="row-btn"
      @enter="((settings.dnd = !settings.dnd), log(settings.dnd ? '勿扰已开启' : '勿扰已关闭'))"
    >
      <span>勿扰模式</span><b :class="{ on: settings.dnd }">{{ settings.dnd ? '开' : '关' }}</b>
    </Focusable>

    <h3>好友 · {{ FRIENDS.filter((f) => f.online).length }} 在线</h3>
    <!-- Each friend is a nested container; up/down keeps the column you were in. -->
    <Focusable v-for="f in FRIENDS" :key="f.name" class="friend" :class="{ offline: !f.online }">
      <span class="avatar">{{ f.name[0] }}</span>
      <div class="who"><b>{{ f.name }}</b><small>{{ f.status }}</small></div>
      <Focusable as="button" class="mini" :focusable="f.online" @enter="log(`已邀请 ${f.name}`)"
        >邀请</Focusable
      >
      <Focusable as="button" class="mini" @enter="log(`给 ${f.name} 发消息`)">消息</Focusable>
    </Focusable>

    <Focusable class="power">
      <Focusable as="button" class="mini" @enter="emit('exit')">返回主菜单</Focusable>
      <Focusable as="button" class="mini" @enter="emit('close')">关闭</Focusable>
    </Focusable>
  </Focusable>
</template>

<style scoped>
.scrim {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: #0009;
}
.drawer {
  position: fixed;
  inset-block: 0;
  inset-inline-end: 0;
  z-index: 21;
  inline-size: 380px;
  overflow-y: auto;
  padding: 28px 20px;
  background: #14171f;
  border-inline-start: 1px solid #ffffff1a;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
h2 {
  margin: 0 0 12px;
}
h3 {
  margin: 20px 0 6px;
  font-size: 13px;
  color: #fff8;
  font-weight: 500;
}
.row-btn {
  display: flex;
  justify-content: space-between;
  padding: 12px 14px;
  border: 0;
  border-radius: 10px;
  background: none;
  cursor: pointer;
  text-align: start;
}
.row-btn b {
  color: #fff6;
}
.row-btn b.on {
  color: #3fb950;
}
.row-btn[data-focused] {
  background: #ffffff14;
  box-shadow: inset 0 0 0 2px #fff;
}
.friend {
  display: grid;
  grid-template-columns: 36px 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
}
.friend[data-focus-within] {
  background: #ffffff0d;
}
.friend.offline {
  opacity: 0.55;
}
.avatar {
  inline-size: 36px;
  block-size: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #5ec8ff33;
  font-weight: 700;
}
.who {
  display: grid;
}
.who small {
  color: #fff8;
  font-size: 12px;
}
.mini {
  padding: 6px 12px;
  border: 0;
  border-radius: 6px;
  background: #ffffff14;
  cursor: pointer;
  font-size: 13px;
}
.mini[data-focused] {
  background: #fff;
  color: #111;
}
.power {
  display: flex;
  gap: 10px;
  margin-block-start: auto;
  padding-block-start: 20px;
}
</style>
