import { ref } from 'vue';
import type { Direction } from '@xeolab/vue-spatial-navi';

const html = document.documentElement;
if (new URLSearchParams(location.search).get('dir') === 'rtl') html.setAttribute('dir', 'rtl');

export const rtl = ref(html.getAttribute('dir') === 'rtl');
export function toggleDir() {
  rtl.value = !rtl.value;
  html.setAttribute('dir', rtl.value ? 'rtl' : 'ltr');
}
/** Arrow keys are physical: a row's "end" is on the left in RTL. */
export const endDirection = (): Direction => (rtl.value ? 'left' : 'right');
