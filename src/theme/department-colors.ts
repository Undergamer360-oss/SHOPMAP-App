import type { ThemeName } from '@/theme/tokens';

/**
 * Departments get a colour derived from their id, so no palette needs to be
 * maintained by hand and every department stays visually distinct.
 */
const GOLDEN_ANGLE = 137.508;

function hueFor(departmentId: number) {
  return (departmentId * GOLDEN_ANGLE + 168) % 360;
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100;
  const l = lightness / 100;
  const k = (n: number) => (n + hue / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));

  const toHex = (value: number) =>
    Math.round(255 * value)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(channel(0))}${toHex(channel(8))}${toHex(channel(4))}`;
}

export type DepartmentColor = {
  /** Shelf fill. */
  fill: string;
  /** Border, labels and highlight. */
  stroke: string;
  /** Soft wash used for department zones. */
  wash: string;
};

export function departmentColor(departmentId: number, theme: ThemeName): DepartmentColor {
  const hue = hueFor(departmentId);

  if (theme === 'dark') {
    return {
      fill: hslToHex(hue, 38, 30),
      stroke: hslToHex(hue, 62, 66),
      wash: hslToHex(hue, 40, 18),
    };
  }

  return {
    fill: hslToHex(hue, 46, 74),
    stroke: hslToHex(hue, 52, 38),
    wash: hslToHex(hue, 52, 93),
  };
}
