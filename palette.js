// Palette generation for the VRChat UI theme generator.
// Loaded by index.html as a classic script (exports become globals) and by the vitest suite via require().
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  // OKLCH helpers (Björn Ottosson's OKLab). Lightness steps are absolute so any hue stays readable.
  const toLin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const toSrgb = c => { c = clamp(c); return Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255); };

  function hexToOklch(hex) {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [n >> 16 & 255, n >> 8 & 255, n & 255].map(toLin);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
    const bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    return { L: 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, C: Math.hypot(a, bb), H: (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360 };
  }

  function oklchToRgb({ L, C, H }) {
    const a = C * Math.cos(H * Math.PI / 180), b = C * Math.sin(H * Math.PI / 180);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  }

  // Reduce chroma until the colour fits in sRGB (matters for yellows at low lightness)
  function oklchToHex(c) {
    const inGamut = x => oklchToRgb({ ...c, C: x }).every(v => v >= -0.001 && v <= 1.001);
    let C = c.C;
    if (!inGamut(C)) { let lo = 0, hi = C; for (let i = 0; i < 30; i++) { const mid = (lo + hi) / 2; if (inGamut(mid)) lo = mid; else hi = mid; } C = lo; }
    return '#' + oklchToRgb({ ...c, C }).map(v => toSrgb(v).toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  // The entered colour drives the Icons slot (the accent seen most in VRChat's UI). Buttons lightness comes
  // from the editor's default palette (#6AE3F9,#2BAAC1,#113637,#1F232A,#BABABA,#008389) in OKLCH: L .307.
  // Highlight, Icons, Subtext and Fonts deviate on purpose: the default's dark Subtext and light Highlight leave card
  // labels and active tabs unreadable.
  function generate(accent, tint) {
    const { L, C: c0, H } = hexToOklch(accent);
    const neutral = c0 < 0.02;                                  // grays have no meaningful hue
    const C = neutral ? 0 : clamp(c0, 0.07, 0.14);
    const iconsL = clamp(L, 0.74, 0.84);                      // the active tab's icon sits on Highlight, so Icons must stay well above it
    const icons = iconsL === L && C === c0 ? accent.toUpperCase() : oklchToHex({ L: iconsL, C, H });
    // Highlight is the background of hovered/active nav tabs, whose labels are mostly Fonts: keep it mid-dark for contrast.
    const hl   = oklchToHex({ L: 0.44, C, H });
    const dark = oklchToHex({ L: 0.307, C: C * 0.38, H });
    const deep = oklchToHex({ L: 0.78, C: C * 0.85, H });      // small caps card labels (dimmed to 75% in-game) need ~4.5:1
    const bg   = tint && !neutral ? oklchToHex({ L: 0.255, C: 0.03, H }) : '#1F232A';
    return [hl, icons, dark, bg, '#F2F2F2', deep];
  }


  // Per-element colours as the game renders an imported palette, measured from VRChat screenshots of themes with six
  // distinct slot colours. Most elements are one slot times a constant; a few blend two slots.
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const rgbHex = c => '#' + c.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('').toUpperCase();
  const mul = (h, k) => rgbHex(hexRgb(h).map(v => v * k));
  const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v * t + y[i] * (1 - t))); };
  function roles([hl, ic, bt, bg, fn, st]) {
    const nav = mix(bg, '#3C3735', 0.4);                  // translucent tab over the gray world, tinted by Background
    const hovbg = mul(mix(hl, nav, 0.4), 1.2), actbg = mul(hl, 1.05);
    return {
      hl80: mul(hl, 0.8), hl105: mul(hl, 1.05), ic57: mul(ic, 0.57), ic79: mul(ic, 0.79), st75: mul(st, 0.75),
      txt: mul(fn, 0.88), fn, w: '#FFFFFF', ic, k: '#000000',
      win: mul(bg, 0.38), top: mul(bg, 0.49), panel: mul(bg, 0.42), card: mul(bt, 0.6), mib: mul(bt, 0.08), sel: mul(hl, 0.22),
      nav, navicon: mul(ic, 0.75), navlabel: mul(fn, 0.58),
      hovbg, hovicon: mix(ic, '#FFFFFF', 0.65), hovlabel: mix(fn, hovbg, 0.45),
      actbg, acticon: mul(ic, 0.97), actlabel: mul(fn, 0.96),
    };
  }

  return { clamp, hexToOklch, oklchToHex, generate, roles, hexRgb, rgbHex, mul, mix };
});
