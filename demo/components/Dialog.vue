<script setup lang="ts">
import { Focusable, useSpatialNavigation } from '@xeolab/vue-spatial-navi';
import { onMounted } from 'vue';
import { log } from '../log';

const emit = defineEmits<{ close: [] }>();
const { engine } = useSpatialNavigation();

// Children mount first, so the dialog's buttons are already registered here.
onMounted(() => engine.focus('dialog'));

function close(reason: string) {
  log(`弹窗关闭：${reason}`);
  emit('close');
}
</script>

<template>
  <div class="overlay">
    <Focusable
      id="dialog"
      class="dialog"
      boundary
      preferred-child-id="dialog-ok"
      @back="close('返回键')"
    >
      <h2>弹窗</h2>
      <p>
        <code>boundary</code> 把焦点限制在弹窗内；<code>@back</code> 关闭弹窗；关闭后用
        <code>engine.focus()</code> 把焦点送回原处。
      </p>
      <div class="dialog-actions">
        <Focusable as="button" class="btn" @enter="close('取消')">取消</Focusable>
        <Focusable id="dialog-ok" as="button" class="btn primary" @enter="close('确定')"
          >确定</Focusable
        >
      </div>
    </Focusable>
  </div>
</template>
