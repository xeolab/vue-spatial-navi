import { createSpatialNavigation } from '@xeolab/vue-spatial-navi';
import { createApp } from 'vue';
import App from './App.vue';
import './gamepad';
import './style.css';

createApp(App)
  .use(
    createSpatialNavigation({
      pointer: true,
      scrollIntoView: { block: 'nearest', inline: 'nearest', behavior: 'smooth' },
      // WASD as well as arrows, to show keyMap merging.
      keyMap: {
        up: ['ArrowUp', 'w'],
        down: ['ArrowDown', 's'],
        left: ['ArrowLeft', 'a'],
        right: ['ArrowRight', 'd'],
      },
    }),
  )
  .mount('#app');
