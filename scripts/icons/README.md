# Forge app icon

`design.mjs` draws the icon (an ember flame over a barbell on a slate tile) as SVG. `build.mjs <outDir>` renders the PNG sizes with Playwright (`public/favicon.svg` is the SVG itself). `public/favicon.ico` (16, 32, 48) was made from the PNGs with Pillow:

```
node scripts/icons/build.mjs public
python3 -c "from PIL import Image; ..."   # combine the 16/32/48 renders into favicon.ico
```

Files in `public/`: `favicon.svg`, `favicon.ico`, `apple-touch-icon.png` (180, square, iOS rounds it), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (art inside the 80% safe zone), `manifest.webmanifest`.
