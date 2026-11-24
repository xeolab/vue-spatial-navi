import { reactive } from 'vue';

export interface Game {
  id: number;
  title: string;
  genre: string;
  hue: number;
  hours: number;
  installed: boolean;
  favorite: boolean;
  /** Days since last played. */
  lastPlayed: number;
  achievements: { total: number; unlocked: number };
}

// All titles are made up for the demo.
const TITLES = [
  '星海拾荒者',
  '雾港侦探社',
  '铁轨与蒸汽',
  '深渊回声',
  '纸鸢远行',
  '霓虹赛道',
  '极夜灯塔',
  '方块王国',
  '林间邮差',
  '量子棋局',
  '熔岩工坊',
  '云端花园',
  '午夜列车',
  '沙丘信使',
  '机械心脏',
  '白昼猎手',
  '迷宫厨房',
  '雪原驿站',
  '潮汐之歌',
  '齿轮学院',
  '失落星图',
  '风暴前线',
  '竹林剑影',
  '回声小镇',
];
const GENRES = ['冒险', '解谜', '竞速', '策略', '模拟', '动作', '角色扮演', '平台跳跃'];

export const games = reactive<Game[]>(
  TITLES.map((title, i) => ({
    id: i,
    title,
    genre: GENRES[i % GENRES.length],
    hue: (i * 47) % 360,
    hours: ((i * 37) % 140) + 3,
    installed: i % 3 !== 2,
    favorite: i % 5 === 0,
    lastPlayed: i < 8 ? i : 20 + i * 3,
    achievements: { total: 24 + ((i * 7) % 24), unlocked: (i * 11) % 24 },
  })),
);

export const FILTERS = [
  { id: 'recent', label: '最近游玩', test: (g: Game) => g.lastPlayed < 14 },
  { id: 'all', label: '全部游戏', test: () => true },
  { id: 'favorite', label: '收藏', test: (g: Game) => g.favorite },
  { id: 'installed', label: '已安装', test: (g: Game) => g.installed },
  { id: 'none', label: '待更新', test: () => false }, // always empty: shows a non-focusable empty grid
] as const;
export type FilterId = (typeof FILTERS)[number]['id'];

export const settings = reactive({ volume: 60, brightness: 100, dnd: false });

export const FRIENDS = [
  { name: '晨星', status: '游戏中 · 霓虹赛道', online: true },
  { name: '阿岚', status: '在线', online: true },
  { name: 'Kiko', status: '离开 · 15 分钟', online: true },
  { name: '老周', status: '离线 · 3 天前', online: false },
];
