# VRChat Theme Generator

A single-page tool that turns one accent color into a full palette for VRChat's custom UI theme.

Pick an accent color and copy the generated string into VRChat's **Import** dialog. The six slots are, in order: Highlight, Icons, Buttons, Background, Fonts, Subtext.

## Usage

Open `index.html` in a browser (no server required), choose a color, then click **Copy**. Clicking a swatch copies just that hex value.

## How the palette is derived

Highlight is the accent as entered. Icons, Buttons and Subtext keep the accent's hue, with saturation and lightness scaled using ratios taken from VRChat's default theme (`#6AE3F9,#2BAAC1,#113637,#1F232A,#BABABA,#008389`). Background and Fonts stay neutral; an option tints the background with the accent hue.
