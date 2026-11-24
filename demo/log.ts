import { ref } from 'vue';

export const logs = ref<string[]>([]);
export const log = (msg: string) => (logs.value = [msg, ...logs.value].slice(0, 5));
