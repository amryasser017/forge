// Forge icon: ember flame rising over a barbell on a slate tile.
export const defs = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1B2436"/><stop offset="1" stop-color="#0A0E15"/></linearGradient>
  <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8A4C"/><stop offset="1" stop-color="#F0501A"/></linearGradient>
  <linearGradient id="flame" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFC53D"/><stop offset="0.45" stop-color="#FF8A2B"/><stop offset="1" stop-color="#FF5A1F"/></linearGradient>
  <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7EDF7"/><stop offset="1" stop-color="#9FADC4"/></linearGradient>
  <radialGradient id="glow" cx="0.5" cy="0.42" r="0.5"><stop offset="0" stop-color="#FF6A2B" stop-opacity="0.35"/><stop offset="1" stop-color="#FF6A2B" stop-opacity="0"/></radialGradient>
</defs>`;
// artwork drawn in a 512 box; `scale` shrinks it around the centre (for the maskable safe zone)
export const art = (scale = 1) => `
<g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
  <circle cx="256" cy="230" r="210" fill="url(#glow)"/>
  <!-- flame -->
  <path d="M256 52 C 292 108, 338 134, 338 196 C 338 242, 302 272, 256 272 C 210 272, 174 242, 174 196 C 174 160, 194 136, 212 114 C 216 146, 232 160, 244 162 C 236 118, 242 86, 256 52 Z" fill="url(#flame)"/>
  <path d="M256 150 C 276 178, 296 190, 296 220 C 296 244, 278 258, 256 258 C 234 258, 216 244, 216 220 C 216 202, 228 192, 238 178 C 242 192, 250 196, 254 194 C 252 178, 252 164, 256 150 Z" fill="#FFE29A"/>
  <!-- barbell -->
  <rect x="58" y="318" width="396" height="30" rx="15" fill="url(#bar)"/>
  <rect x="86" y="276" width="34" height="114" rx="11" fill="url(#plate)"/>
  <rect x="128" y="246" width="44" height="174" rx="13" fill="url(#plate)"/>
  <rect x="340" y="246" width="44" height="174" rx="13" fill="url(#plate)"/>
  <rect x="392" y="276" width="34" height="114" rx="11" fill="url(#plate)"/>
  <rect x="236" y="310" width="40" height="46" rx="10" fill="#C9D3E3" opacity="0.95"/>
</g>`;
export const tile = (rx) => `<rect width="512" height="512" rx="${rx}" fill="url(#bg)"/>`;
export const svg = ({ rx = 112, scale = 1 } = {}) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${defs}${tile(rx)}${art(scale)}</svg>`;
