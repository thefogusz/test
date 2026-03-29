import type { ContentTab } from '../types/domain';

export const AI_WORKSPACES = {
  langChain: {
    role: 'News Feed',
    title: 'สรุปข่าววันนี้',
    shortTitle: 'ข่าววันนี้',
    description: 'คัดและสรุปข่าวสำหรับหน้าข่าววันนี้',
  },
  langGraph: {
    role: 'Content AI',
    title: 'คอนเทนต์สตูดิโอ',
    shortTitle: 'คอนเทนต์',
    description: 'สร้างคอนเทนต์และค้นหาคอนเทนต์จากสัญญาณที่เกี่ยวข้อง',
  },
} as const;

export const CONTENT_TAB_LABELS: Record<ContentTab, string> = {
  search: 'ค้นหาคอนเทนต์',
  create: 'สร้างคอนเทนต์',
};
