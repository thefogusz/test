const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

const hexToRgb = (color: string) => {
  const normalized = String(color || '').trim().replace('#', '');

  if (!/^[0-9a-f]{3}([0-9a-f]{3})?$/i.test(normalized)) return null;

  const hex = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized;

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
};

const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) =>
  `#${[r, g, b].map((channel) => clampChannel(channel).toString(16).padStart(2, '0')).join('')}`;

const mixWithWhite = (color: string, amount: number) => {
  const rgb = hexToRgb(color);

  if (!rgb) return '#ffffff';

  return rgbToHex({
    r: rgb.r + (255 - rgb.r) * amount,
    g: rgb.g + (255 - rgb.g) * amount,
    b: rgb.b + (255 - rgb.b) * amount,
  });
};

export const getListTitleTextStyle = (color?: string) => {
  const baseColor = String(color || '').trim();

  if (!baseColor) return undefined;

  const gradient = hexToRgb(baseColor)
    ? `linear-gradient(135deg, ${mixWithWhite(baseColor, 0.82)} 0%, ${mixWithWhite(baseColor, 0.32)} 48%, ${baseColor} 100%)`
    : `linear-gradient(135deg, #ffffff 0%, ${baseColor} 100%)`;

  return {
    background: gradient,
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  };
};
