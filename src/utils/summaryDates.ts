const DAY_MS = 24 * 60 * 60 * 1000;

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

const formatThaiDate = (date) =>
  new Intl.DateTimeFormat('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);

const isSameCalendarDay = (left, right) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

export const getSummaryDateLabel = (items = [], limit = items.length) => {
  const dates = (Array.isArray(items) ? items : [])
    .slice(0, limit)
    .map((item) => item?.created_at || item?.createdAt)
    .map((value) => new Date(value))
    .filter(isValidDate)
    .sort((a, b) => b.getTime() - a.getTime());

  if (dates.length === 0) return '';

  const latest = dates[0];
  const earliest = dates[dates.length - 1];

  if (isSameCalendarDay(latest, earliest)) {
    return `ข้อมูล ณ วันที่ ${formatThaiDate(latest)}`;
  }

  const diffDays = Math.round((latest.getTime() - earliest.getTime()) / DAY_MS);
  const rangeLabel = `${formatThaiDate(earliest)} - ${formatThaiDate(latest)}`;

  if (diffDays <= 2) {
    return `สรุปจากข้อมูลช่วง ${rangeLabel}`;
  }

  return `ครอบคลุมข้อมูลช่วง ${rangeLabel}`;
};
