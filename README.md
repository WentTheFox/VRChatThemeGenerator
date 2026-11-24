# VRChat Theme Generator

A single-page tool that turns one accent color into a full palette for VRChat's custom UI theme.

Pick an accent color and copy the generated string into VRChat's **Import** dialog. The six slots are, in order: Highlight, Icons, Buttons, Background, Fonts, Subtext.

## Usage

Open `index.html` in a browser (no server required), choose a color, then click **Copy**. Clicking a swatch copies just that hex value.

## How the palette is derived

The accent you enter drives **Icons**, the slot most visible in VRChat's UI. Highlight, Buttons and Subtext keep its hue and chroma at fixed OKLCH lightness steps, so any hue stays readable on the dark UI. Buttons follows the editor's default palette (`#6AE3F9,#2BAAC1,#113637,#1F232A,#BABABA,#008389`); Highlight is deliberately darker, Icons lighter (OKLCH lightness 0.74-0.84), Subtext lighter (0.78, for the small card labels) and Fonts brighter (`#F2F2F2`) than in that default, because VRChat draws hovered and active nav tabs as Highlight with Icons-colored icons and Fonts-colored labels, which are unreadable when Highlight is light. Chroma is clamped and gamut-mapped, grays produce neutral palettes, and Background and Fonts stay neutral; an option tints the background with the accent hue.

## Development

The palette logic lives in `palette.js` (loaded by `index.html` and by the tests). The tests in `tests/` check contrast ratios for the generated palette across several hundred accent colors, and that the model of how VRChat renders slot colors still matches measurements taken from the game.

```
pnpm install
pnpm test
```

Dependencies are installed with a two-week minimum release age (see `pnpm-workspace.yaml`). The same tests run in CI on every push and pull request.
