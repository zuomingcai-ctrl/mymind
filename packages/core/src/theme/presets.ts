import type { Theme } from '../model/types.js';

export const BUILTIN_THEMES: Theme[] = [
  {
    id: 'default',
    name: '默认',
    colors: {
      background: '#ffffff',
      centralTopic: { shape: 'rounded', fillColor: '#4A90D9', fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { shape: 'rounded', fillColor: '#E8F4FD', borderColor: '#4A90D9', fontSize: 14 },
      subTopic: { shape: 'rounded', fillColor: '#ffffff', borderColor: '#cccccc', fontSize: 12 },
      floatingTopic: { shape: 'rounded', fillColor: '#FFF9E6', borderColor: '#F5A623', fontSize: 12 },
      branchColors: ['#4A90D9', '#7ED321', '#F5A623', '#BD10E0', '#50E3C2'],
    },
    edge: { lineType: 'curve', color: '#999999', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  },
  {
    id: 'dark',
    name: '深色',
    colors: {
      background: '#1e1e1e',
      centralTopic: { shape: 'rounded', fillColor: '#BB86FC', fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { shape: 'rounded', fillColor: '#2d2d2d', borderColor: '#BB86FC', fontColor: '#e0e0e0', fontSize: 14 },
      subTopic: { shape: 'rounded', fillColor: '#252525', borderColor: '#555555', fontColor: '#cccccc', fontSize: 12 },
      floatingTopic: { shape: 'rounded', fillColor: '#333333', borderColor: '#BB86FC', fontSize: 12 },
      branchColors: ['#BB86FC', '#03DAC6', '#CF6679', '#3700B3', '#018786'],
    },
    edge: { lineType: 'curve', color: '#666666', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  },
  {
    id: 'fresh',
    name: '清新',
    colors: {
      background: '#f5faf5',
      centralTopic: { shape: 'ellipse', fillColor: '#43A047', fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { shape: 'rounded', fillColor: '#E8F5E9', borderColor: '#43A047', fontSize: 14 },
      subTopic: { shape: 'rounded', fillColor: '#ffffff', borderColor: '#A5D6A7', fontSize: 12 },
      floatingTopic: { shape: 'rounded', fillColor: '#FFFDE7', borderColor: '#FBC02D', fontSize: 12 },
      branchColors: ['#43A047', '#00897B', '#1E88E5', '#8E24AA', '#FB8C00'],
    },
    edge: { lineType: 'curve', color: '#81C784', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  },
  {
    id: 'business',
    name: '商务',
    colors: {
      background: '#f8f9fa',
      centralTopic: { shape: 'rectangle', fillColor: '#2C3E50', fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { shape: 'rectangle', fillColor: '#ECF0F1', borderColor: '#2C3E50', fontSize: 14 },
      subTopic: { shape: 'rectangle', fillColor: '#ffffff', borderColor: '#BDC3C7', fontSize: 12 },
      floatingTopic: { shape: 'rectangle', fillColor: '#FEF9E7', borderColor: '#F39C12', fontSize: 12 },
      branchColors: ['#2C3E50', '#3498DB', '#E74C3C', '#27AE60', '#9B59B6'],
    },
    edge: { lineType: 'polyline', color: '#95A5A6', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  },
  {
    id: 'warm',
    name: '暖色',
    colors: {
      background: '#FFF8F0',
      centralTopic: { shape: 'ellipse', fillColor: '#E67E22', fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { shape: 'rounded', fillColor: '#FDEBD0', borderColor: '#E67E22', fontSize: 14 },
      subTopic: { shape: 'rounded', fillColor: '#ffffff', borderColor: '#F5CBA7', fontSize: 12 },
      floatingTopic: { shape: 'rounded', fillColor: '#FEF5E7', borderColor: '#D35400', fontSize: 12 },
      branchColors: ['#E67E22', '#E74C3C', '#F39C12', '#D35400', '#C0392B'],
    },
    edge: { lineType: 'curve', color: '#E59866', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  },
  {
    id: 'ocean',
    name: '海洋',
    colors: {
      background: '#EBF5FB',
      centralTopic: { shape: 'rounded', fillColor: '#1A5276', fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { shape: 'rounded', fillColor: '#D4E6F1', borderColor: '#1A5276', fontSize: 14 },
      subTopic: { shape: 'rounded', fillColor: '#ffffff', borderColor: '#85C1E9', fontSize: 12 },
      floatingTopic: { shape: 'rounded', fillColor: '#E8F8F5', borderColor: '#148F77', fontSize: 12 },
      branchColors: ['#1A5276', '#148F77', '#2E86C1', '#17A589', '#5DADE2'],
    },
    edge: { lineType: 'curve', color: '#5DADE2', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  },
  {
    id: 'lavender',
    name: '薰衣草',
    colors: {
      background: '#F5EEF8',
      centralTopic: { shape: 'ellipse', fillColor: '#8E44AD', fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { shape: 'rounded', fillColor: '#E8DAEF', borderColor: '#8E44AD', fontSize: 14 },
      subTopic: { shape: 'rounded', fillColor: '#ffffff', borderColor: '#C39BD3', fontSize: 12 },
      floatingTopic: { shape: 'rounded', fillColor: '#F4ECF7', borderColor: '#9B59B6', fontSize: 12 },
      branchColors: ['#8E44AD', '#9B59B6', '#BB8FCE', '#7D3C98', '#A569BD'],
    },
    edge: { lineType: 'curve', color: '#BB8FCE', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  },
  {
    id: 'mono',
    name: '单色',
    colors: {
      background: '#ffffff',
      centralTopic: { shape: 'rectangle', fillColor: '#333333', fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { shape: 'rectangle', fillColor: '#f0f0f0', borderColor: '#333333', fontSize: 14 },
      subTopic: { shape: 'rectangle', fillColor: '#ffffff', borderColor: '#cccccc', fontSize: 12 },
      floatingTopic: { shape: 'rectangle', fillColor: '#fafafa', borderColor: '#666666', fontSize: 12 },
      branchColors: ['#333333', '#666666', '#999999', '#bbbbbb', '#555555'],
    },
    edge: { lineType: 'straight', color: '#999999', width: 1, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  },
  {
    id: 'hand-drawn',
    name: '手绘',
    colors: {
      background: '#FFFEF7',
      centralTopic: { shape: 'rounded', fillColor: '#FFE082', borderColor: '#5D4037', fontSize: 16 },
      mainTopic: { shape: 'rounded', fillColor: '#FFF9C4', borderColor: '#795548', fontSize: 14 },
      subTopic: { shape: 'rounded', fillColor: '#ffffff', borderColor: '#A1887F', fontSize: 12 },
      floatingTopic: { shape: 'rounded', fillColor: '#FFECB3', borderColor: '#FF8F00', fontSize: 12 },
      branchColors: ['#FF8F00', '#F4511E', '#7CB342', '#039BE5', '#8E24AA'],
    },
    edge: { lineType: 'curve', color: '#795548', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'Comic Sans MS, cursive',
    handDrawn: true,
  },
  {
    id: 'night-blue',
    name: '午夜蓝',
    colors: {
      background: '#0D1B2A',
      centralTopic: { shape: 'rounded', fillColor: '#778DA9', fontColor: '#ffffff', fontSize: 16 },
      mainTopic: { shape: 'rounded', fillColor: '#1B263B', borderColor: '#778DA9', fontColor: '#E0E1DD', fontSize: 14 },
      subTopic: { shape: 'rounded', fillColor: '#1B263B', borderColor: '#415A77', fontColor: '#E0E1DD', fontSize: 12 },
      floatingTopic: { shape: 'rounded', fillColor: '#1B263B', borderColor: '#778DA9', fontSize: 12 },
      branchColors: ['#778DA9', '#415A77', '#E0E1DD', '#1B263B', '#0D1B2A'],
    },
    edge: { lineType: 'curve', color: '#415A77', width: 2, arrowStart: false, arrowEnd: false },
    fontFamily: 'sans-serif',
    handDrawn: false,
  },
];

export function listThemes(): Theme[] {
  return [...BUILTIN_THEMES];
}

/** Builtin-only lookup; prefer `getTheme` from `./custom.js` for custom themes. */
export function getBuiltinTheme(id: string): Theme {
  return BUILTIN_THEMES.find((t) => t.id === id) ?? BUILTIN_THEMES[0]!;
}
