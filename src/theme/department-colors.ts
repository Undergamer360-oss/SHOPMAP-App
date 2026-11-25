import type { ThemeName } from '@/theme/tokens';

/**
 * Uber-like monochrome department colours. The palette is deliberately black,
 * white and grey; department ids only shift the grey slightly so shelves stay
 * distinguishable without introducing brand colours into the map.
 */
function grey(value: number) {
  const channel = Math.max(0, Math.min(255, Math.round(value)));
  const hex = channel.toString(16).padStart(2, '0');
  return `#${hex}${hex}${hex}`;
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
  const step = departmentId % 5;

  if (theme === 'dark') {
    return {
      fill: grey(32 + step * 6),
      stroke: grey(238 - step * 10),
      wash: grey(16 + step * 3),
    };
  }

  return {
    fill: grey(232 - step * 9),
    stroke: grey(34 + step * 9),
    wash: grey(250 - step * 3),
  };
}
