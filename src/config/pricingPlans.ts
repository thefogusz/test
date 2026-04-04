export type PlanId = 'free' | 'plus' | 'admin';
export type MeteredFeature = 'feed' | 'search' | 'generate';
export type LimitedObject = 'watchlist' | 'postLists' | 'searchPresets';

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceLabel: string;
  headline: string;
  description: string;
  accent: string;
  usage: Record<MeteredFeature, number>;
  objects: Record<LimitedObject, number>;
  features: {
    unlimitedBookmarks: boolean;
    unlimitedDrafts: boolean;
    exportShare: boolean;
    premiumGenerateStudio: boolean;
  };
};

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    priceLabel: 'ใช้ฟรี',
    headline: 'ลองของจริงแบบไม่ลดคุณภาพ',
    description:
      'เหมาะกับผู้ใช้ใหม่ที่อยากเช็กสัญญาณประจำวันและทดลอง workflow หลักของ Foro',
    accent: '#9fb0c7',
    usage: {
      feed: 5,
      search: 1,
      generate: 1,
    },
    objects: {
      watchlist: 20,
      postLists: 3,
      searchPresets: 3,
    },
    features: {
      unlimitedBookmarks: true,
      unlimitedDrafts: true,
      exportShare: false,
      premiumGenerateStudio: true,
    },
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    priceLabel: '300 บาท / 1 เดือน',
    headline: 'สำหรับคนที่ใช้ Foro เป็นเครื่องมือทำงานทุกวัน',
    description:
      'เพิ่มปริมาณการใช้งานและพื้นที่จัดการงาน โดยยังคง workflow เต็มเหมือนกันทุกจุด',
    accent: '#7dd3fc',
    usage: {
      feed: 15,
      search: 5,
      generate: 5,
    },
    objects: {
      watchlist: 50,
      postLists: 10,
      searchPresets: 3,
    },
    features: {
      unlimitedBookmarks: true,
      unlimitedDrafts: true,
      exportShare: true,
      premiumGenerateStudio: true,
    },
  },
  admin: {
    id: 'admin',
    name: 'Admin',
    priceLabel: 'Internal mode',
    headline: 'สำหรับทดสอบระบบแบบไม่ติดลิมิต',
    description: 'โหมดสำหรับทีมภายใน ใช้ได้ไม่จำกัดเพื่อเทสระบบและ flow ต่างๆ',
    accent: '#fbbf24',
    usage: {
      feed: Number.POSITIVE_INFINITY,
      search: Number.POSITIVE_INFINITY,
      generate: Number.POSITIVE_INFINITY,
    },
    objects: {
      watchlist: Number.POSITIVE_INFINITY,
      postLists: Number.POSITIVE_INFINITY,
      searchPresets: 3,
    },
    features: {
      unlimitedBookmarks: true,
      unlimitedDrafts: true,
      exportShare: true,
      premiumGenerateStudio: true,
    },
  },
};

export const PLAN_ORDER: PlanId[] = ['free', 'plus'];

export const FEATURE_LABELS: Record<MeteredFeature, string> = {
  feed: 'Feed',
  search: 'Search',
  generate: 'Generate',
};

export const FEATURE_HINTS: Record<MeteredFeature, string> = {
  feed: 'นับเมื่อรีเฟรชฟีดหรือขอโหลด feed เพิ่ม',
  search: 'นับเฉพาะการเริ่ม search รอบใหม่',
  generate: 'นับเมื่อสร้างหรือ regenerate งานใหม่',
};

export const OBJECT_LABELS: Record<LimitedObject, string> = {
  watchlist: 'Watchlist',
  postLists: 'Post Lists',
  searchPresets: 'Search Presets',
};

export const getPlanDefinition = (planId: PlanId) =>
  PLAN_DEFINITIONS[planId] || PLAN_DEFINITIONS.free;

export const formatPlanLimit = (value: number) =>
  Number.isFinite(value) ? String(value) : 'Unlimited';
