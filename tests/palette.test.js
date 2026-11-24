import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const { generate, roles, hexRgb, hexToOklch, oklchToHex } = createRequire(import.meta.url)('../palette.js');

// ---- WCAG contrast ---------------------------------------------------------------------------------------------
const linear = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const luminance = hex => { const [r, g, b] = hexRgb(hex).map(linear); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

// ---- accents to sweep ------------------------------------------------------------------------------------------
// Every 15 degrees of hue at dark/mid/light lightness and from near-gray to very saturated, plus colors people actually pick.
const sweep = [];
for (let H = 0; H < 360; H += 15)
  for (const L of [0.3, 0.5, 0.7, 0.9])
    for (const C of [0.02, 0.08, 0.15, 0.25]) sweep.push(oklchToHex({ L, C, H }));
const named = ['#000000', '#FFFFFF', '#808080', '#6181B8', '#2BAAC1', '#6AE3F9', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', '#E5484D', '#F5C542', '#8B5CF6', '#22C55E', '#FF69B4', '#F97316'];
const accents = [...new Set([...sweep, ...named])];

const HEX = /^#[0-9A-F]{6}$/;

describe('generate()', () => {
  it('returns six uppercase hex colors in VRChat slot order', () => {
    for (const accent of accents) {
      for (const tint of [false, true]) {
        const palette = generate(accent, tint);
        expect(palette).toHaveLength(6);
        palette.forEach(c => expect(c).toMatch(HEX));
      }
    }
  });

  it('is deterministic', () => {
    expect(generate('#6181b8', false)).toEqual(generate('#6181b8', false));
  });

  it('accepts lowercase input and treats it the same as uppercase', () => {
    expect(generate('#6181b8', false)).toEqual(generate('#6181B8', false));
  });

  it('keeps Background and Fonts neutral and constant unless tinting', () => {
    for (const accent of accents) {
      const [, , , bg, fn] = generate(accent, false);
      expect(bg).toBe('#1F232A');
      expect(fn).toBe('#F2F2F2');
    }
  });

  it('tinting changes only the Background slot', () => {
    for (const accent of ['#6181B8', '#E5484D', '#F5C542']) {
      const plain = generate(accent, false), tinted = generate(accent, true);
      expect(tinted[3]).not.toBe(plain[3]);
      expect([...tinted.slice(0, 3), ...tinted.slice(4)]).toEqual([...plain.slice(0, 3), ...plain.slice(4)]);
    }
  });

  it('produces neutral palettes for grays', () => {
    for (const gray of ['#000000', '#404040', '#808080', '#BBBBBB', '#FFFFFF']) {
      const [hl, ic, bt, , , st] = generate(gray, false);
      for (const c of [hl, ic, bt, st]) {
        const [r, g, b] = hexRgb(c);
        expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps the accent hue in the derived slots', () => {
    const { H } = hexToOklch('#6181B8');
    for (const c of generate('#6181B8', false).filter((_, i) => [0, 1, 2, 5].includes(i))) {
      const hue = hexToOklch(c).H;
      expect(Math.min(Math.abs(hue - H), 360 - Math.abs(hue - H))).toBeLessThan(12);
    }
  });

  it('orders the slots by lightness so the UI keeps its depth', () => {
    for (const accent of accents) {
      const [hl, ic, bt, bg, , st] = generate(accent, false).map(c => hexToOklch(c).L);
      expect(bg).toBeLessThan(bt + 0.1);   // Buttons is not meaningfully darker than Background
      expect(bt).toBeLessThan(hl);         // Buttons < Highlight < Icons < Subtext (gamut-clipped colors get a little slack)
      expect(hl).toBeLessThan(ic + 0.02);
      expect(ic).toBeLessThan(st + 0.1);
    }
  });
});

// ---- contrast across the whole sweep ---------------------------------------------------------------------------
// [label, minimum ratio, foreground role, background role]. Minimums sit just under what the sweep currently achieves, so
// they catch regressions; the lower ones (outlines, nav, active icon) are inherent to how the game draws those elements.
const checks = [
  ['body text on the window',        12,  'txt',      'win'],
  ['body text on a card',            10,  'txt',      'card'],
  ['menu icons on the window',       4.5, 'ic79',     'win'],
  ['top-bar icons on the top bar',   2.8, 'ic57',     'top'],
  ['card icons on a card',           6,   'ic',       'card'],
  ['small card labels on a card',    4.5, 'st75',     'card'],
  ['inactive nav labels on the tab', 3.5, 'navlabel', 'nav'],
  ['inactive nav icons on the tab',  3,   'navicon',  'nav'],
  ['active tab label',               5,   'actlabel', 'actbg'],
  ['active tab icon',                2.8, 'acticon',  'actbg'],
  ['hovered tab label',              2.8, 'hovlabel', 'hovbg'],
  ['hovered tab icon',               5,   'hovicon',  'hovbg'],
  ['selected menu outline',          1.7, 'hl80',     'win'],
  ['selected tile outline',          2.3, 'hl105',    'win'],
];

describe.each([false, true])('contrast across %i accent colors (tint=%s)'.replace('%i', accents.length), tint => {
  it.each(checks)('%s stays at least %s:1', (_label, minimum, fg, bg) => {
    const failures = [];
    for (const accent of accents) {
      const R = roles(generate(accent, tint));
      const ratio = contrast(R[fg], R[bg]);
      if (ratio < minimum) failures.push(`${accent} -> ${ratio.toFixed(2)}`);
    }
    expect(failures).toEqual([]);
  });
});

// ---- the model of how the game renders slot colors -------------------------------------------------------------
// Colors read from screenshots of VRChat with the given palette imported; `roles()` must reproduce them.
const close = (a, b, tolerance) => hexRgb(a).every((v, i) => Math.abs(v - hexRgb(b)[i]) <= tolerance);

describe('roles() against measured game renders', () => {
  const cases = [
    ['six distinct slot colors', ['#FFCC00', '#FF3366', '#204080', '#403020', '#99FF99', '#8000FF'], 6, {
      win: '#18120D', top: '#201710', panel: '#1B1511', card: '#12254F', nav: '#3D332D', txt: '#86DF86',
      st75: '#6000BF', ic57: '#931C3B', ic79: '#C92750', navicon: '#BB284D', navlabel: '#589558', sel: '#3A2D00', hovbg: '#A78923',
    }],
    ['the editor default', ['#6AE3F9', '#2BAAC1', '#113637', '#1F232A', '#BABABA', '#008389'], 6, {
      win: '#0E0E0D', top: '#101013', card: '#072020', st75: '#006268', ic57: '#16616F', ic79: '#228799', navicon: '#227D8D', sel: '#123339',
    }],
    ['an earlier #6181B8 palette', ['#3A578B', '#6686BE', '#253041', '#1F232A', '#F2F2F2', '#5973A1'], 7, {
      actbg: '#416198', acticon: '#6381B6', actlabel: '#E8E8E8',
    }],
  ];
  it.each(cases)('%s', (_name, palette, tolerance, expected) => {
    const R = roles(palette);
    for (const [role, hex] of Object.entries(expected)) {
      expect(close(R[role], hex, tolerance), `${role}: model ${R[role]} vs game ${hex}`).toBe(true);
    }
  });
});
