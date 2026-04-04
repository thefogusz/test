import { useEffect, useMemo } from 'react';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  FEATURE_LABELS,
  FEATURE_HINTS,
  PLAN_DEFINITIONS,
  type MeteredFeature,
  type PlanId,
} from '../config/pricingPlans';
import { usePersistentState } from './usePersistentState';

type DailyUsageSnapshot = {
  dateKey: string;
  feed: number;
  search: number;
  generate: number;
};

const getLocalDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createEmptyUsage = (dateKey = getLocalDateKey()): DailyUsageSnapshot => ({
  dateKey,
  feed: 0,
  search: 0,
  generate: 0,
});

const deserializeDailyUsage = (storedValue: string, fallbackValue: DailyUsageSnapshot) => {
  try {
    const parsed = JSON.parse(storedValue);
    return {
      dateKey: typeof parsed?.dateKey === 'string' ? parsed.dateKey : fallbackValue.dateKey,
      feed: Math.max(0, Number(parsed?.feed) || 0),
      search: Math.max(0, Number(parsed?.search) || 0),
      generate: Math.max(0, Number(parsed?.generate) || 0),
    };
  } catch {
    return fallbackValue;
  }
};

const normalizeUsageForToday = (usage: DailyUsageSnapshot) => {
  const todayKey = getLocalDateKey();
  if (usage?.dateKey === todayKey) return usage;
  return createEmptyUsage(todayKey);
};

export const usePricingPlan = () => {
  const [activePlanId, setActivePlanId] = usePersistentState<PlanId>(
    STORAGE_KEYS.activePlan,
    'free',
  );
  const [dailyUsage, setDailyUsage] = usePersistentState<DailyUsageSnapshot>(
    STORAGE_KEYS.dailyUsage,
    () => createEmptyUsage(),
    {
      deserialize: deserializeDailyUsage,
    },
  );

  const normalizedPlanId = activePlanId in PLAN_DEFINITIONS ? activePlanId : 'free';
  const currentPlan = PLAN_DEFINITIONS[normalizedPlanId];
  const usageForToday = useMemo(() => normalizeUsageForToday(dailyUsage), [dailyUsage]);

  useEffect(() => {
    if (usageForToday.dateKey !== dailyUsage.dateKey) {
      setDailyUsage(usageForToday);
    }
  }, [dailyUsage.dateKey, setDailyUsage, usageForToday]);

  const remainingUsage = {
    feed: Number.isFinite(currentPlan.usage.feed)
      ? Math.max(0, currentPlan.usage.feed - usageForToday.feed)
      : Number.POSITIVE_INFINITY,
    search: Number.isFinite(currentPlan.usage.search)
      ? Math.max(0, currentPlan.usage.search - usageForToday.search)
      : Number.POSITIVE_INFINITY,
    generate: Number.isFinite(currentPlan.usage.generate)
      ? Math.max(0, currentPlan.usage.generate - usageForToday.generate)
      : Number.POSITIVE_INFINITY,
  };

  const consumeUsage = (feature: MeteredFeature) => {
    const nextUsage = normalizeUsageForToday(dailyUsage);
    const limit = currentPlan.usage[feature];
    const used = nextUsage[feature];

    if (Number.isFinite(limit) && used >= limit) {
      return {
        ok: false,
        message:
          normalizedPlanId === 'free'
            ? `${FEATURE_LABELS[feature]} ของแพ็ก Free ครบแล้ววันนี้ ลองอัปเกรดเป็น Plus เพื่อใช้งานต่อ`
            : `ใช้ ${FEATURE_LABELS[feature]} ครบโควตาของแพ็ก Plus แล้วสำหรับวันนี้`,
        hint: FEATURE_HINTS[feature],
      };
    }

    const updatedUsage = {
      ...nextUsage,
      [feature]: used + 1,
    };
    setDailyUsage(updatedUsage);

    return {
      ok: true,
      remaining: Math.max(0, limit - updatedUsage[feature]),
      hint: FEATURE_HINTS[feature],
    };
  };

  const resetDailyUsage = () => {
    setDailyUsage(createEmptyUsage());
  };

  return {
    activePlanId: normalizedPlanId,
    currentPlan,
    dailyUsage: usageForToday,
    remainingUsage,
    setActivePlanId,
    consumeUsage,
    resetDailyUsage,
  };
};
